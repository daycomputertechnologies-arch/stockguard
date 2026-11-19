.PHONY: dev api web test build compile seed smoke stack

dev:
	@echo "Run scripts/dev.ps1 (Windows) or scripts/dev.sh (macOS/Linux)"

api:
	cd services/api && uv sync && uv run uvicorn app.main:app --reload --port 8800

web:
	cd apps/web && npm install && npm run dev

test:
	cd services/api && uv run pytest -q

build:
	cd apps/web && npm run build

compile:
	cd contracts && npm install && npm run compile

seed:
	cd services/api && uv run python -m app.seed_run

smoke:
	node scripts/smoke.mjs

stack:
	docker compose up --build
