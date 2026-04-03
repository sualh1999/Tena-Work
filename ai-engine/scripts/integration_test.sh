#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
INTERNAL_KEY="${AI_INTERNAL_KEY:-${INTERNAL_KEY:-}}"

# If key isn't present in env, try reading it from ../.env
if [[ -z "$INTERNAL_KEY" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  DOTENV_PATH="$SCRIPT_DIR/../.env"
  if [[ -f "$DOTENV_PATH" ]]; then
    INTERNAL_KEY=$(grep -E '^AI_INTERNAL_KEY=' "$DOTENV_PATH" | head -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'" | tr -d '\r' || true)
  fi
fi

if [[ -z "$INTERNAL_KEY" ]]; then
  echo "Set AI_INTERNAL_KEY (or INTERNAL_KEY) env var." >&2
  exit 1
fi

echo "1) POST /generate-embedding"
VECTOR=$(curl -s -X POST "$BASE_URL/generate-embedding" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: $INTERNAL_KEY" \
  -d '{"text":"Senior ICU nurse with pediatric experience"}' \
  | python -c 'import sys,json; print(json.dumps(json.load(sys.stdin)["vector"]))')

echo "2) POST /recommend-jobs"
curl -s -X POST "$BASE_URL/recommend-jobs" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: $INTERNAL_KEY" \
  -d "{\"profile_vector\": $VECTOR, \"limit\": 5}" | cat

echo
echo "3) POST /recommend-candidates"
curl -s -X POST "$BASE_URL/recommend-candidates" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: $INTERNAL_KEY" \
  -d "{\"job_vector\": $VECTOR, \"candidate_ids\": [1,2,3,4,5,6,7,8,9,10], \"limit\": 5}" | cat

echo
echo "Done"
