-- Migration: 20260302000000_add_embedding_tables

-- UP
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Job embeddings table
CREATE TABLE IF NOT EXISTS job_embeddings (
  job_id INTEGER PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  embedding vector(384) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Candidate embeddings table
CREATE TABLE IF NOT EXISTS candidate_embeddings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  embedding vector(384) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_job_embeddings_vector ON job_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_candidate_embeddings_vector ON candidate_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_embeddings_timestamp
  BEFORE UPDATE ON job_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_timestamp();

CREATE TRIGGER update_candidate_embeddings_timestamp
  BEFORE UPDATE ON candidate_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_timestamp();

-- DOWN
DROP TRIGGER IF EXISTS update_candidate_embeddings_timestamp ON candidate_embeddings;
DROP TRIGGER IF EXISTS update_job_embeddings_timestamp ON job_embeddings;
DROP FUNCTION IF EXISTS update_embedding_timestamp;
DROP TABLE IF EXISTS candidate_embeddings;
DROP TABLE IF EXISTS job_embeddings;
-- Note: We generally don't drop extensions in migrations as other tables might rely on them
-- DROP EXTENSION IF EXISTS vector;
