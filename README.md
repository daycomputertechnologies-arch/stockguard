# StockGuard

Prevent clinic stockouts and medicine expiry by moving stock **before** it dies — with an on-chain custody trail.

> Scan a batch → forecast Clinic B stockout → suggest a transfer from Clinic A
> → custody moves on-chain → dashboard updates.

BACISS 2026 · Demo Day Sat 21 Nov 2026.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind |
| Backend | FastAPI + Python 3.12+ + SQLite + `web3.py` |
| Chain | Solidity 0.8.24 on Avalanche Fuji (`43113`) |
| AI | Rules-based forecast + optional Gemini agent |
| Deploy | Docker Compose + nginx on a DigitalOcean droplet |

## Repo layout

```
apps/web              React app (all screens)
services/api          FastAPI service (owns the chain signer)
contracts             DrugBatchRegistry.sol + compile/deploy scripts
packages/shared       Seed data shared by API and demos
design                Figma link, screen tiers, design tokens
docs                  API contract, runbook, decisions, demo script
infra                 docker-compose + nginx
scripts               dev / seed / smoke helpers
.scratch              Team ticket board
```

## Run it locally (no Docker needed)

Prerequisites: Node 20+, Python 3.12+, `uv`.

```powershell
# terminal 1 — API on :8800
cd services/api
uv sync
uv run uvicorn app.main:app --reload --port 8800

# terminal 2 — web on :5173
cd apps/web
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to `:8800`.
The API seeds itself on first boot, so the dashboard has data immediately.

Backend tests: `cd services/api && uv run pytest -q`
Contract compile: `cd contracts && npm install && npm run compile`

## Run the whole stack (Docker)

```bash
docker compose up --build
```

Web on http://localhost:8080, API on http://localhost:8800.

## Demo day checklist

1. `docs/RUNBOOK.md` — deploy, smoke test, rollback.
2. `docs/DEMO_SCRIPT.md` — the 3-minute script.
3. `docs/DECISIONS.md` — why the contract looks the way it does.
4. `.env.example` — every secret the stack needs.

## Ownership

See `.github/CODEOWNERS`. Each folder has one owner; PRs auto-request the right reviewer.
