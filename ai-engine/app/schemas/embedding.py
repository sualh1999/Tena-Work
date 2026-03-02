from __future__ import annotations

from pydantic import BaseModel, Field


class GenerateEmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=1)


class GenerateEmbeddingResponse(BaseModel):
    vector: list[float]
