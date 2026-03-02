"""FastAPI dependencies.

- Internal auth via `X-Internal-Key`
- Database pool dependency

We return:
- 401 when the internal key is missing
- 403 when the internal key is present but invalid

This satisfies the integration checklist and keeps behavior explicit.
"""

from __future__ import annotations

from typing import Annotated

import asyncpg
from fastapi import Depends, Header, HTTPException, Request, status

from app.config import Settings, get_settings


async def require_internal_key(
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
    settings: Settings = Depends(get_settings),
) -> None:
    if not x_internal_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    if x_internal_key != settings.internal_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )


def get_db_pool(request: Request) -> asyncpg.Pool:
    pool = getattr(request.app.state, "db_pool", None)
    if pool is None:
        raise RuntimeError("Database pool not initialized")
    return pool


DBPoolDep = Annotated[asyncpg.Pool, Depends(get_db_pool)]
InternalAuthDep = Annotated[None, Depends(require_internal_key)]
