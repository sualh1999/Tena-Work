-- 001_init_pgvector.sql
-- Purpose: Initialize pgvector + embedding tables used by the AI Engine.
-- Target: PostgreSQL with pgvector installed/available.
-- Vector dimension is fixed at 384 (sentence-transformers/all-MiniLM-L6-v2).

BEGIN;

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding tables
CREATE TABLE IF NOT EXISTS job_embeddings (
  job_id    BIGINT PRIMARY KEY,
  embedding VECTOR(384) NOT NULL
);

CREATE TABLE IF NOT EXISTS candidate_embeddings (
  user_id   BIGINT PRIMARY KEY,
  embedding VECTOR(384) NOT NULL
);

-- Indexes
-- Prefer HNSW for production if available; fallback to IVFFLAT otherwise.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_am WHERE amname = 'hnsw') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS job_embeddings_embedding_hnsw ON job_embeddings USING hnsw (embedding vector_cosine_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS candidate_embeddings_embedding_hnsw ON candidate_embeddings USING hnsw (embedding vector_cosine_ops)';
  ELSE
    -- IVFFLAT needs ANALYZE after bulk load for best performance.
    EXECUTE 'CREATE INDEX IF NOT EXISTS job_embeddings_embedding_ivfflat ON job_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS candidate_embeddings_embedding_ivfflat ON candidate_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
  END IF;
END $$;

COMMIT;
