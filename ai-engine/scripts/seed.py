"""Seed script for local development.

Creates pgvector extension + embedding tables if needed, then inserts dummy
embeddings for jobs and candidates.

Usage:
  set DATABASE_URL=...
  python scripts/seed.py

Note: This script is intentionally simple and uses asyncpg directly.
"""

from __future__ import annotations

import asyncio
import argparse
import os
import random
from pathlib import Path

import asyncpg
import numpy as np


EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "384"))


def _load_dotenv_if_present() -> None:
    """Minimal .env loader (no external dependency).

    Loads `ai-engine/.env` if it exists and sets os.environ for keys that are not
    already present in the environment.
    """

    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if not key:
            continue
        os.environ.setdefault(key, value)


def _rand_unit_vector(dim: int) -> list[float]:
    v = np.random.normal(size=(dim,)).astype(np.float32)
    v /= np.linalg.norm(v) + 1e-12
    return v.tolist()


def _as_pgvector(v: list[float]) -> str:
    return "[" + ",".join(f"{float(x):.8f}" for x in v) + "]"


async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed pgvector embedding tables")
    parser.add_argument(
        "--database-url",
        dest="database_url",
        default=None,
        help="Override DATABASE_URL (otherwise uses env/DotEnv)",
    )
    args = parser.parse_args()

    _load_dotenv_if_present()

    database_url = args.database_url or os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit(
            "DATABASE_URL is required.\n"
            "\n"
            "PowerShell example:\n"
            "  $env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/tenawork_db'\n"
            "  python scripts/seed.py\n"
            "\n"
            "Or create ai-engine/.env with:\n"
            "  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tenawork_db\n"
        )

    conn = await asyncpg.connect(database_url)
    try:
        available = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector')"
        )

        if not available:
            raise SystemExit(
                "pgvector is not available on this PostgreSQL server.\n"
                "\n"
                "This is a server-side install issue (not a Python dependency).\n"
                "Options:\n"
                "  1) Windows-native Postgres (no Docker): build + install pgvector on the server\n"
                "     - Install Visual Studio Build Tools with C++ support\n"
                "     - Open 'x64 Native Tools Command Prompt for VS' as Administrator\n"
                "     - set \"PGROOT=C:\\Program Files\\PostgreSQL\\16\"  (replace 16 with your version)\n"
                "     - git clone --branch v0.8.2 https://github.com/pgvector/pgvector.git\n"
                "     - nmake /F Makefile.win ; nmake /F Makefile.win install\n"
                "     - Restart the PostgreSQL Windows service\n"
                "  2) If using a managed Postgres, enable/install the pgvector extension\n"
                "     for that instance, then run: CREATE EXTENSION vector;\n"
                "\n"
                "After pgvector is installed, re-run: python scripts/seed.py\n"
            )

        try:
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        except asyncpg.exceptions.FeatureNotSupportedError as exc:
            # Some servers report it this way even if pg_available_extensions is present.
            raise SystemExit(
                "PostgreSQL reports that extension 'vector' is not available.\n"
                "Install/enable pgvector on the PostgreSQL server, then retry.\n"
                f"\nOriginal error: {exc}\n"
            )

        await conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS job_embeddings (
              job_id BIGINT PRIMARY KEY,
              embedding VECTOR({EMBEDDING_DIM}) NOT NULL
            )
            """
        )
        await conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS candidate_embeddings (
              user_id BIGINT PRIMARY KEY,
              embedding VECTOR({EMBEDDING_DIM}) NOT NULL
            )
            """
        )

        # Insert dummy embeddings
        random.seed(42)
        np.random.seed(42)

        jobs = [
            (i, _as_pgvector(_rand_unit_vector(EMBEDDING_DIM))) for i in range(1, 101)
        ]
        candidates = [
            (i, _as_pgvector(_rand_unit_vector(EMBEDDING_DIM))) for i in range(1, 501)
        ]

        await conn.executemany(
            """INSERT INTO job_embeddings(job_id, embedding)
               VALUES ($1, $2::vector)
               ON CONFLICT (job_id) DO UPDATE SET embedding = EXCLUDED.embedding
            """,
            jobs,
        )

        await conn.executemany(
            """INSERT INTO candidate_embeddings(user_id, embedding)
               VALUES ($1, $2::vector)
               ON CONFLICT (user_id) DO UPDATE SET embedding = EXCLUDED.embedding
            """,
            candidates,
        )

        print("Seed complete: 100 jobs, 500 candidates")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
