#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

(cd "$ROOT/services/api" && uv sync && uv run uvicorn app.main:app --reload --port 8800) &
API_PID=$!

(cd "$ROOT/apps/web" && npm install && npm run dev)

kill "$API_PID" 2>/dev/null || true
