# TenaWork AI Engine (FastAPI)

Internal-only AI microservice for embeddings and vector-based recommendations.

## Endpoints (API Contract)

All routes require:

`X-Internal-Key: <SHARED_SECRET>`

- `POST /generate-embedding`
- `POST /recommend-jobs`
- `POST /recommend-candidates`

Demo/testing guide (exact JSON bodies + copy/paste commands):

- `DEMO.md`

## Configuration

Create a `.env` file (see `.env.example`) or provide environment variables.

Required:

- `AI_INTERNAL_KEY` (preferred; `INTERNAL_KEY` is also accepted)
- `DATABASE_URL`

Optional:

- `MODEL_NAME` (default `sentence-transformers/all-MiniLM-L6-v2`)
- `EMBEDDING_DIM` (default `384`)
- `DB_POOL_MIN_SIZE` (default `1`)
- `DB_POOL_MAX_SIZE` (default `10`)
- `LOG_LEVEL` (default `INFO`)

## Embedding Model

Model: `sentence-transformers/all-MiniLM-L6-v2`

Vector Dimension: `384`

Normalization: cosine-normalized (`normalize_embeddings=True`)

This dimension must remain fixed. Changing it requires re-embedding all data.
Backend DB column should use `VECTOR(384)`.

## Auth behavior

- Missing `X-Internal-Key`: `401`
- Invalid `X-Internal-Key`: `403`

## Local development

1. Create and activate a virtualenv

1. Install deps

```bash
pip install -r requirements.txt
```

1. Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

## Quick test

### PowerShell (recommended on Windows)

```powershell
$headers = @{ "Content-Type" = "application/json"; "X-Internal-Key" = "dev-secret" }

# 1) Generate an embedding vector
$emb = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/generate-embedding" -Headers $headers -Body ((@{ text = "ICU nurse with pediatric experience" } | ConvertTo-Json -Compress))

# 2) Recommend jobs using that vector
$jobsBody = @{ profile_vector = $emb.vector; limit = 5 } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/recommend-jobs" -Headers $headers -Body $jobsBody

# 3) Recommend candidates (candidate_ids must be provided by backend)
$candBody = @{ job_vector = $emb.vector; candidate_ids = @(1,2,3,4,5); limit = 3 } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/recommend-candidates" -Headers $headers -Body $candBody
```

### curl (bash)

```bash
VECTOR=$(curl -s -X POST "http://localhost:8000/generate-embedding" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: dev-secret" \
  -d '{"text":"ICU nurse with pediatric experience"}' \
  | python -c "import sys,json; print(json.dumps(json.load(sys.stdin)['vector']))")

curl -s -X POST "http://localhost:8000/recommend-jobs" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: dev-secret" \
  -d "{\"profile_vector\": ${VECTOR}, \"limit\": 5}"

curl -s -X POST "http://localhost:8000/recommend-candidates" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: dev-secret" \
  -d "{\"job_vector\": ${VECTOR}, \"candidate_ids\": [1,2,3,4,5], \"limit\": 3}"
```

## Database setup (pgvector)

The running API does **not** auto-create tables on startup.

`pgvector` must be installed/enabled on the PostgreSQL server. If you see errors like "extension 'vector' is not available", you need a pgvector-enabled Postgres build (or to enable the extension on your managed Postgres).

To confirm what your server supports:

```powershell
python scripts/db_diagnose.py
```

### Windows-native Postgres (no Docker)

If you're running PostgreSQL as a Windows service, pgvector still must be installed on that server instance (it is not a Python package).

The pgvector project provides official Windows build steps using `nmake`:

1. Install Visual Studio Build Tools with C++ support.
1. Open **x64 Native Tools Command Prompt for VS** as Administrator.
1. Set `PGROOT` to your Postgres installation directory (example):

```bat
set "PGROOT=C:\Program Files\PostgreSQL\16"
```

1. Build + install pgvector:

```bat
cd %TEMP%
git clone --branch v0.8.2 https://github.com/pgvector/pgvector.git
cd pgvector
nmake /F Makefile.win
nmake /F Makefile.win install
```

1. Restart your PostgreSQL Windows service.

After that, `CREATE EXTENSION vector;` will work and you can re-run:

- `python scripts/apply_migrations.py`
- `python scripts/seed.py`

### Local Postgres with pgvector (Docker)

If you don't already have pgvector installed, the quickest local setup is a pgvector-enabled Postgres image.

PowerShell example (uses port `5432`):

```powershell
docker run --name tenawork-pgvector -d \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tenawork_db \
  -p 5432:5432 \
  pgvector/pgvector:pg16

$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/tenawork_db"
python scripts/apply_migrations.py
python scripts/seed.py
```

If you already have Postgres on `5432`, change the port mapping (example uses `5433` locally):

```powershell
docker run --name tenawork-pgvector -d \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tenawork_db \
  -p 5433:5432 \
  pgvector/pgvector:pg16

$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/tenawork_db"
python scripts/apply_migrations.py
python scripts/seed.py
```

- For local/dev: `python scripts/seed.py` will create the extension + tables if missing.
- For staging/prod: create these via migrations (recommended) or manually.

Migration SQL files:

- `migrations/001_init_pgvector.sql`
- `migrations/001_down_pgvector.sql`

Option A (shared backend DB) hardening:

- `migrations/002_option_a_least_privilege.psql`

The AI Engine assumes these tables exist:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS job_embeddings (
  job_id BIGINT PRIMARY KEY,
  embedding VECTOR(384) NOT NULL
);

CREATE TABLE IF NOT EXISTS candidate_embeddings (
  user_id BIGINT PRIMARY KEY,
  embedding VECTOR(384) NOT NULL
);
```

Recommended indexes (pick one; `hnsw` is usually best for prod):

```sql
-- HNSW (pgvector >= 0.5.0)
CREATE INDEX IF NOT EXISTS job_embeddings_embedding_hnsw
  ON job_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS candidate_embeddings_embedding_hnsw
  ON candidate_embeddings USING hnsw (embedding vector_cosine_ops);

-- OR IVFFLAT
-- CREATE INDEX ... USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## Option A: Shared Postgres DB (recommended)

Deploy the AI Engine against the same Postgres database as the backend (same DB/cluster), but use a least-privilege DB role for the AI Engine.

Suggested flow:

1. Backend migrations (privileged DB user) apply:

- `migrations/001_init_pgvector.sql`
- optionally `migrations/002_option_a_least_privilege.psql` (creates a NOLOGIN group role + grants)

1. Create a LOGIN role for the AI Engine service account (password managed outside migrations), then grant it membership:

```sql
CREATE ROLE tena_ai_engine_login LOGIN PASSWORD '...';
GRANT tenawork_ai_engine TO tena_ai_engine_login;
```

1. Configure AI Engine `DATABASE_URL` to use `tena_ai_engine_login`.

This keeps the AI Engine read-only at the DB level (recommended). The backend (or a separate worker) should be responsible for upserting embeddings into `job_embeddings` and `candidate_embeddings`.

## Seeding dummy data

There is an example seed script:

```bash
python scripts/seed.py
```

It requires `DATABASE_URL` via environment variable or `ai-engine/.env`.

PowerShell example:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/tenawork_db"
python scripts/seed.py
```

If you're running Postgres in Docker for local dev, make sure you use a pgvector-enabled image (example: `pgvector/pgvector:pg16`).

It will:

- create the pgvector extension and tables (if missing)
- insert dummy candidate/job embeddings

## Backend integration (Node.js)

Example (fetch):

```js
const res = await fetch(`${process.env.AI_ENGINE_URL}/recommend-jobs`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Key': process.env.AI_INTERNAL_KEY,
  },
  body: JSON.stringify({ profile_vector, limit: 5 }),
});

if (!res.ok) {
  const body = await res.text();
  throw new Error(`AI Engine error ${res.status}: ${body}`);
}

const data = await res.json();
```

Example (TypeScript + axios, with timeout + retries):

```ts
import axios, { AxiosError } from 'axios';

type RecommendJobsRequest = { profile_vector: number[]; limit?: number };
type RecommendationItem = { id: number; score: number };
type RecommendJobsResponse = { recommendations: RecommendationItem[] };

const AI_ENGINE_URL = process.env.AI_ENGINE_URL!;
const AI_INTERNAL_KEY = process.env.AI_INTERNAL_KEY!;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function recommendJobs(
  payload: RecommendJobsRequest,
  opts: { timeoutMs?: number; retries?: number } = {}
): Promise<RecommendJobsResponse> {
  const timeoutMs = opts.timeoutMs ?? 1500;
  const retries = opts.retries ?? 2;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.post<RecommendJobsResponse>(
        `${AI_ENGINE_URL}/recommend-jobs`,
        payload,
        {
          timeout: timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': AI_INTERNAL_KEY,
          },
          validateStatus: () => true,
        }
      );

      if (res.status >= 200 && res.status < 300) return res.data;

      // Don't retry auth/validation errors.
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(`AI Engine ${res.status}: ${JSON.stringify(res.data)}`);
      }

      throw new Error(`AI Engine ${res.status}: ${JSON.stringify(res.data)}`);
    } catch (err) {
      const isAxios = (err as AxiosError).isAxiosError;
      const shouldRetry = attempt < retries;

      if (!shouldRetry) throw err;

      // Basic exponential backoff: 200ms, 400ms, 800ms...
      await sleep(200 * 2 ** attempt);

      // If it was a non-Axios error, still retry (network/unknown).
      if (!isAxios) continue;
    }
  }

  // Unreachable, but keeps TS happy.
  throw new Error('AI Engine request failed');
}
```

## Troubleshooting

- `401/403`: ensure `X-Internal-Key` matches `AI_INTERNAL_KEY`.
- `400 VALIDATION_ERROR`: vectors must be length `384` and `candidate_ids` cannot be empty.
- DB errors: confirm `DATABASE_URL` and that `CREATE EXTENSION vector;` ran.

## Docker

```bash
docker build -t tenawork-ai-engine ./ai-engine

docker run --rm -p 8000:8000 \
  -e AI_INTERNAL_KEY=dev-secret \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/tenawork_db \
  tenawork-ai-engine
```
