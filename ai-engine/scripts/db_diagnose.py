"""Diagnose Postgres + pgvector availability for the AI Engine.

Usage:
  python scripts/db_diagnose.py

It reads DATABASE_URL from:
- --database-url (optional)
- env var DATABASE_URL
- ai-engine/.env

Prints:
- server version
- current database/user
- whether pgvector is available (pg_available_extensions)
- whether pgvector is installed (pg_extension)

This script never prints the DATABASE_URL.
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
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Diagnose Postgres + pgvector")
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
            '  $env:DATABASE_URL="postgresql://postgres:postpass@localhost:5432/tenawork_db"\n'
            "  python scripts/db_diagnose.py\n"
        )

    conn = await asyncpg.connect(database_url)
    try:
        version = await conn.fetchval("select version()")
        db = await conn.fetchval("select current_database()")
        user = await conn.fetchval("select current_user")
        addr = await conn.fetchval("select inet_server_addr()")
        port = await conn.fetchval("select inet_server_port()")

        vector_available = await conn.fetchval(
            "select exists (select 1 from pg_available_extensions where name = 'vector')"
        )
        vector_installed = await conn.fetchval(
            "select exists (select 1 from pg_extension where extname = 'vector')"
        )

        print("Connected OK")
        print("server:", version)
        print("db:", db)
        print("user:", user)
        print("addr:", addr, "port:", port)
        print("pgvector available:", bool(vector_available))
        print("pgvector installed:", bool(vector_installed))
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
