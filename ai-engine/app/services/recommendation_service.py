"""Recommendation service.

This service ONLY performs vector similarity ranking against precomputed
embeddings stored in Postgres+pgvector.

Hard business filters (eligibility, strict requirements) are handled by the
main backend service; for candidate recommendation, the backend passes a
filtered list of candidate IDs.
"""

from __future__ import annotations

from dataclasses import dataclass

import asyncpg

from app.db import queries


@dataclass(frozen=True)
class RecommendationService:
    pool: asyncpg.Pool
    embedding_dim: int

    def _validate_dim(self, vector: list[float]) -> None:
        if len(vector) != self.embedding_dim:
            raise ValueError(
                f"Invalid vector dimension {len(vector)}; expected {self.embedding_dim}"
            )

    async def recommend_jobs(
        self, profile_vector: list[float], limit: int
    ) -> list[dict]:
        self._validate_dim(profile_vector)
        async with self.pool.acquire() as conn:
            return await queries.recommend_jobs(conn, profile_vector, limit)

    async def recommend_candidates(
        self,
        job_vector: list[float],
        candidate_ids: list[int],
        limit: int,
    ) -> list[dict]:
        self._validate_dim(job_vector)
        async with self.pool.acquire() as conn:
            return await queries.recommend_candidates(
                conn, job_vector, candidate_ids, limit
            )
