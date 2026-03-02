"""Database connection utilities.

We use `asyncpg` for low overhead and fast query execution.
The pgvector operators are used directly in SQL.
"""

from __future__ import annotations

import asyncpg

from app.config import Settings


async def create_pool(settings: Settings) -> asyncpg.Pool:
    return await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=settings.db_min_size,
        max_size=settings.db_max_size,
        command_timeout=10,
    )
