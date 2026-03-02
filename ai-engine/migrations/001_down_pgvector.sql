-- 001_down_pgvector.sql
-- Purpose: Roll back the AI Engine pgvector tables.
-- Note: We intentionally do NOT drop the `vector` extension by default,
-- because other schemas/services might use it.

BEGIN;

DROP TABLE IF EXISTS candidate_embeddings;
DROP TABLE IF EXISTS job_embeddings;

-- If you're sure nothing else uses pgvector in this DB, you may also run:
-- DROP EXTENSION IF EXISTS vector;

COMMIT;

-- commit is used here to ensure that if any step fails, the database won't be left in a broken state.
