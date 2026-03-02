"""TenaWork AI Engine (FastAPI).

Exposes exactly the internal endpoints defined in the API contract:
- POST /generate-embedding
- POST /recommend-jobs
- POST /recommend-candidates

Auth: `X-Internal-Key: <SHARED_SECRET>`
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.config import Settings, get_settings
from app.db.database import create_pool
from app.dependencies import DBPoolDep, InternalAuthDep
from app.schemas.embedding import GenerateEmbeddingRequest, GenerateEmbeddingResponse
from app.schemas.recommendation import (
    RecommendCandidatesRequest,
    RecommendCandidatesResponse,
    RecommendJobsRequest,
    RecommendJobsResponse,
)
from app.services.embedding_service import EmbeddingService
from app.services.recommendation_service import RecommendationService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO)
    )
    logger = logging.getLogger("ai-engine")

    logger.info("Initializing DB pool")
    app.state.db_pool = await create_pool(settings)

    logger.info("Loading embedding model: %s", settings.model_name)
    # Import here to keep module import time low.
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(settings.model_name)
    app.state.embedding_service = EmbeddingService(
        model=model, embedding_dim=settings.embedding_dim
    )

    try:
        yield
    finally:
        logger.info("Shutting down")
        pool = getattr(app.state, "db_pool", None)
        if pool is not None:
            await pool.close()


app = FastAPI(title="TenaWork AI Engine", version="1.0.0", lifespan=lifespan)

logger = logging.getLogger("ai-engine")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    # Requirement: return 400 for invalid payload.
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "One or more fields are invalid.",
                "details": [
                    {
                        "field": (
                            ".".join(
                                [str(x) for x in err.get("loc", []) if x != "body"]
                            )
                            or "body"
                        ),
                        "message": err.get("msg", "Invalid"),
                    }
                    for err in exc.errors()
                ],
            }
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    # Use the platform's standard error response shape.
    status_code = int(exc.status_code)
    message = exc.detail if isinstance(exc.detail, str) else "Request failed."
    code = (
        "UNAUTHORIZED"
        if status_code == status.HTTP_401_UNAUTHORIZED
        else (
            "FORBIDDEN"
            if status_code == status.HTTP_403_FORBIDDEN
            else (
                "BAD_REQUEST" if status_code == status.HTTP_400_BAD_REQUEST else "ERROR"
            )
        )
    )
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": [],
            }
        },
    )


def get_embedding_service(request: Request) -> EmbeddingService:
    svc = getattr(request.app.state, "embedding_service", None)
    if svc is None:
        raise RuntimeError("Embedding service not initialized")
    return svc


def get_recommendation_service(
    request: Request, pool: DBPoolDep
) -> RecommendationService:
    settings: Settings = get_settings()
    return RecommendationService(pool=pool, embedding_dim=settings.embedding_dim)


@app.post(
    "/generate-embedding",
    response_model=GenerateEmbeddingResponse,
)
async def generate_embedding(
    payload: GenerateEmbeddingRequest,
    _: InternalAuthDep,
    embedding_service: EmbeddingService = Depends(get_embedding_service),
) -> GenerateEmbeddingResponse:
    try:
        if not payload.text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text cannot be empty",
            )
        vector = await embedding_service.embed_text(payload.text)
        logger.info("Embedding generated", extra={"text_length": len(payload.text)})
    except ValueError as e:
        logger.warning("Embedding request rejected", extra={"reason": str(e)})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Embedding generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Embedding generation failed",
        )
    return GenerateEmbeddingResponse(vector=vector)


@app.post("/recommend-jobs", response_model=RecommendJobsResponse)
async def recommend_jobs(
    payload: RecommendJobsRequest,
    _: InternalAuthDep,
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
) -> RecommendJobsResponse:
    try:
        recs = await recommendation_service.recommend_jobs(
            payload.profile_vector, payload.limit
        )
        logger.info("Job recommendations generated", extra={"limit": payload.limit})
    except ValueError as e:
        logger.warning("Recommend-jobs rejected", extra={"reason": str(e)})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        logger.exception("Job recommendation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Recommendation failed",
        )

    return RecommendJobsResponse(recommendations=recs)


@app.post("/recommend-candidates", response_model=RecommendCandidatesResponse)
async def recommend_candidates(
    payload: RecommendCandidatesRequest,
    _: InternalAuthDep,
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
) -> RecommendCandidatesResponse:
    try:
        recs = await recommendation_service.recommend_candidates(
            payload.job_vector, payload.candidate_ids, payload.limit
        )
        logger.info(
            "Candidate recommendations generated",
            extra={
                "limit": payload.limit,
                "candidate_ids_count": len(payload.candidate_ids),
            },
        )
    except ValueError as e:
        logger.warning("Recommend-candidates rejected", extra={"reason": str(e)})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        logger.exception("Candidate recommendation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Recommendation failed",
        )

    return RecommendCandidatesResponse(recommendations=recs)
