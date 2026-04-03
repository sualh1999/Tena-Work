"""SQL query helpers.

Important:
- We assume pgvector is enabled.
- Cosine distance is computed via `<=>`.
- We convert cosine distance to a normalized similarity score in [0, 1]:

    cosine_similarity = 1 - cosine_distance
    normalized_score  = (cosine_similarity + 1) / 2 = 1 - cosine_distance / 2

This maps cosine similarity [-1, 1] to [0, 1].
"""

from __future__ import annotations

from typing import Sequence

import asyncpg


def vector_to_pgvector_literal(vector: Sequence[float]) -> str:
    # asyncpg doesn't know pgvector by default; we pass it as a textual literal.
    # Format: [0.1,0.2,...]
    return "[" + ",".join(f"{float(x):.8f}" for x in vector) + "]"


async def recommend_jobs(
    conn: asyncpg.Connection,
    query_vector: Sequence[float],
    limit: int,
) -> list[dict]:
    sql = """
        SELECT
            id,
            GREATEST(0.0, LEAST(1.0, (1.0 - (embedding <=> $1::vector) / 2.0))) AS score
        FROM jobs
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
    """
    rows = await conn.fetch(sql, vector_to_pgvector_literal(query_vector), limit)
    return [{"id": int(r["id"]), "score": float(r["score"])} for r in rows]


async def recommend_candidates(
    conn: asyncpg.Connection,
    job_vector: Sequence[float],
    candidate_ids: Sequence[int],
    limit: int,
) -> list[dict]:
    # We keep hard filtering out of the AI service; backend passes candidate_ids.
    sql = """
        SELECT
            id,
            GREATEST(0.0, LEAST(1.0, (1.0 - (embedding <=> $1::vector) / 2.0))) AS score
        FROM users
        WHERE id = ANY($2::bigint[]) AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $3
    """
    rows = await conn.fetch(
        sql,
        vector_to_pgvector_literal(job_vector),
        list(candidate_ids),
        limit,
    )
    return [{"id": int(r["id"]), "score": float(r["score"])} for r in rows]
