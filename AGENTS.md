# AGENTS.md

Instructions for coding agents working in this repo.

## Read first

1. `docs/API_CONTRACT.md` — the frozen REST contract. Code against it; do not invent fields.
2. `docs/DECISIONS.md` — ADRs. The transfer-split decision matters.
3. `.scratch/stockguard/issues/` — the ticket board. Work blockers first.

## Non-negotiables

- The frontend never talks to the chain. Only `services/api` writes.
- The backend signer owns every transaction. No MetaMask popup on demo day.
- Every on-chain claim shown in the UI must carry a `tx_hash` link.
- `main` is always deployable. One reviewer per PR. Branch as `feat/<role>-<thing>`.
- No secrets in the repo. Only `.env.example` is committed.
- Synthetic data only. Never real patient, clinic or medicine stock data.

## Commands

| What | Where | Command |
|---|---|---|
| API dev | `services/api` | `uv sync` then `uv run uvicorn app.main:app --reload --port 8800` |
| API tests | `services/api` | `uv run pytest -q` |
| Web dev | `apps/web` | `npm install` then `npm run dev` |
| Web build | `apps/web` | `npm run build` |
| Compile contract | `contracts` | `npm install` then `npm run compile` |
| Stack | repo root | `docker compose up --build` |

## Style

- TypeScript: strict, no `any`, no default exports except React pages.
- Python: type hints on public functions, `ruff`-clean, `snake_case` JSON.
- Responses and errors follow the shapes in `docs/API_CONTRACT.md` exactly.
- Timestamps are ISO-8601 UTC in the API and DB; format to SAST in the UI only.

## When in doubt

Open a ticket rather than guessing at an interface. Changing the contract needs
whole-team agreement and a version bump in `docs/API_CONTRACT.md`.
