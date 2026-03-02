"""Apply SQL migrations to the configured Postgres database.

This is a lightweight helper intended for local/dev.

It:
- loads `ai-engine/.env` if present
- connects to DATABASE_URL (or --database-url)
- executes migrations/001_init_pgvector.sql
- verifies extension + tables exist

Usage (PowerShell):
  $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/tenawork_db"
  python scripts/apply_migrations.py

Or:
  python scripts/apply_migrations.py --database-url "..."
"""

from __future__ import annotations

import argparse
import asyncio
import os
from pathlib import Path

import asyncpg


def _load_dotenv_if_present() -> None:
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


async def _apply_sql_file(conn: asyncpg.Connection, sql_path: Path) -> None:
    sql = sql_path.read_text(encoding="utf-8")
    await conn.execute(sql)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Apply AI Engine DB migrations")
    parser.add_argument(
        "--database-url",
        dest="database_url",
        default=None,
        help="Override DATABASE_URL (otherwise uses env/ai-engine/.env)",
    )
    args = parser.parse_args()

    _load_dotenv_if_present()
    database_url = args.database_url or os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit(
            "DATABASE_URL is required (env var or ai-engine/.env).\n"
            "Example:\n"
            '  $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tenawork_db"\n'
            "  python scripts/apply_migrations.py\n"
        )

    migrations_dir = Path(__file__).resolve().parents[1] / "migrations"
    init_sql = migrations_dir / "001_init_pgvector.sql"
    if not init_sql.exists():
        raise SystemExit(f"Missing migration file: {init_sql}")

    conn = await asyncpg.connect(database_url)
    try:
        # Preflight: fail fast with a clear error if pgvector isn't installed on server.
        available = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector')"
        )
        if not available:
            raise SystemExit(
                "pgvector is not available on this PostgreSQL server, so migrations cannot run.\n"
                "Install/enable pgvector on the server first, then retry.\n"
                "\n"
                "Windows-native install (no Docker) - pgvector official steps:\n"
                "  1) Install Visual Studio Build Tools with C++ support\n"
                "  2) Open 'x64 Native Tools Command Prompt for VS' as Administrator\n"
                "  3) Set PGROOT to your Postgres install directory (example):\n"
                "       set \"PGROOT=C:\\Program Files\\PostgreSQL\\16\"\n"
                "  4) Build + install pgvector:\n"
                "       cd %TEMP%\n"
                "       git clone --branch v0.8.2 https://github.com/pgvector/pgvector.git\n"
                "       cd pgvector\n"
                "       nmake /F Makefile.win\n"
                "       nmake /F Makefile.win install\n"
                "  5) Restart the PostgreSQL Windows service\n"
                "\n"
                "Then re-run: python scripts/apply_migrations.py\n"
            )

        await _apply_sql_file(conn, init_sql)

        installed = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')"
        )
        jobs = await conn.fetchval(
            "SELECT to_regclass('public.job_embeddings') IS NOT NULL"
        )
        cands = await conn.fetchval(
            "SELECT to_regclass('public.candidate_embeddings') IS NOT NULL"
        )

        if not installed or not jobs or not cands:
            raise SystemExit(
                "Migration ran, but expected objects were not found.\n"
                f"vector_installed={bool(installed)} job_embeddings={bool(jobs)} candidate_embeddings={bool(cands)}\n"
            )

        print(
            "Migrations applied successfully: vector + job_embeddings + candidate_embeddings"
        )
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
