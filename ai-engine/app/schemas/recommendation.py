from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, Field


Vector384 = Annotated[list[float], Field(min_length=384, max_length=384)]


class RecommendationItem(BaseModel):
    id: int
    score: float


class RecommendJobsRequest(BaseModel):
    profile_vector: Vector384
    limit: int = Field(5, ge=1, le=50)


class RecommendJobsResponse(BaseModel):
    recommendations: list[RecommendationItem]


class RecommendCandidatesRequest(BaseModel):
    job_vector: Vector384
    candidate_ids: list[int] = Field(..., min_length=1)
    limit: int = Field(10, ge=1, le=50)


class RecommendCandidatesResponse(BaseModel):
    recommendations: list[RecommendationItem]
