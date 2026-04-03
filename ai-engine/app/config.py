"""Application configuration.

We keep all runtime settings in a single Pydantic Settings object, loaded
from environment variables (and optionally a local .env file).

This microservice is internal-only and is protected via `X-Internal-Key`.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Security
    # Accept both env var names for compatibility with different teams/docs.
    internal_key: str = Field(
        ...,
        validation_alias=AliasChoices("AI_INTERNAL_KEY", "INTERNAL_KEY"),
    )

    # Model
    model_name: str = Field(
        "sentence-transformers/all-MiniLM-L6-v2", alias="MODEL_NAME"
    )
    embedding_dim: int = Field(384, alias="EMBEDDING_DIM")

    # Database
    database_url: str = Field(..., alias="DATABASE_URL")
    db_min_size: int = Field(1, alias="DB_POOL_MIN_SIZE")
    db_max_size: int = Field(10, alias="DB_POOL_MAX_SIZE")

    # Runtime
    log_level: str = Field("INFO", alias="LOG_LEVEL")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    # Cached to avoid re-reading env vars on every request.
    return Settings()
