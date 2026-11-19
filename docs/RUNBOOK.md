# Runbook

Everything needed to run, deploy, demo and recover StockGuard.

## 1. One-time setup

| Tool | Version | Check |
|---|---|---|
| Node | 20+ | `node --version` |
| Python | 3.12+ | `python --version` |
| uv | latest | `uv --version` |
| Git | any | `git --version` |
| Docker | optional, for the full stack | `docker --version` |

## 2. Run locally (no Docker)

```powershell
# terminal 1
cd services/api
uv sync
uv run uvicorn app.main:app --reload --port 8800

# terminal 2
cd apps/web
npm install
npm run dev
```

Open http://localhost:5173. The API seeds itself on first boot.

Verify the whole stack is talking:

```powershell
node scripts/smoke.mjs
```

Swagger: http://localhost:8800/docs

## 3. Publish the repo

No `gh` CLI is installed on this machine, so use the web UI:

1. Create an empty repo named `stockguard` on GitHub (no README, no .gitignore).
2. Push:
   ```powershell
   git remote add origin https://github.com/<org>/stockguard.git
   git branch -M main
   git push -u origin main
   ```
3. Settings → Collaborators → add the other three accounts.
4. Settings → Branches → protect `main` (require 1 review, require status checks).
5. Replace the placeholder handles in `.github/CODEOWNERS`.
6. Create the labels `ready-for-agent`, `blocked`, `in-review`.

## 4. Go / no-go gate (before any feature work)

All three must be true:

- [ ] The web app is reachable at a public HTTPS URL.
- [ ] `DrugBatchRegistry` is deployed to Avalanche Fuji, with a clickable explorer link.
- [ ] The public frontend calls `GET /api/health` on that deployment and shows `seed: ok`.

If any fails, fix it before building anything else.

## 5. Switch the chain to Fuji

```powershell
cd contracts
npm install
npm run compile            # writes packages/shared/abi/DrugBatchRegistry.json
```

Deploy — either path works:

**Remix (fastest, matches the course):**
1. Paste `DrugBatchRegistry.sol` at https://remix.ethereum.org.
2. Compiler `0.8.24`, **enable "via IR"** (the contract needs it), EVM `paris`.
3. Environment: Injected Provider (MetaMask) → Avalanche Fuji.
4. Constructor argument: `fuji:43113`. Deploy, copy the address.

**Node script:**
```powershell
# .env: FUJI_RPC_URL, OPERATOR_PRIVATE_KEY, EXPLORER_BASE
npm run deploy
```

Step-by-step for Core Wallet: `docs/CORE-WALLET.md`.

Then:

```dotenv
CHAIN_MODE=fuji
CONTRACT_ADDRESS=0x...
OPERATOR_PRIVATE_KEY=0x...
```

```powershell
cd contracts && npm run seed            # registers the seed batches on chain
cd ../services/api && uv sync --extra chain
```

Restart the API. `/api/health` must report `"chain": "fuji"` and a contract address.
The API loads the root `.env` automatically at startup.
Note: seeded rows have no `tx_hash` by design; the live demo path creates the first
real ones.

## 6. Deploy to the droplet

```bash
git clone <repo> && cd stockguard
cp .env.example .env      # fill in the chain values, set CHAIN_MODE=fuji
docker compose up -d --build
```

Web on `:8080`, API on `:8800`. Put nginx or Caddy in front for TLS, or map
`8080:80` and use the droplet IP. Open the firewall for 22, 80, 443.

Do **not** expose `:8800` publicly; the web container proxies `/api`.

## 7. Camera on demo day (important)

Browsers only grant camera access on **HTTPS** or `localhost`. A phone opening
`http://192.168.x.x:5173` will be blocked.

Options, best first:

1. Demo on the deployed HTTPS URL.
2. Tunnel the laptop: `cloudflared tunnel --url http://localhost:5173` (or ngrok), then open the HTTPS URL on the phone.
3. Fall back to the manual payload field and the printable QR on the Scanner page.

## 8. Safe demo mode

If Fuji or Wi-Fi dies:

```dotenv
CHAIN_MODE=fake
ALLOW_DEMO_ENDPOINTS=true
```

Everything still works: the fake adapter mirrors every write, so transfers and
tamper detection behave identically. The UI shows a **demo chain** badge.

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `401 unauthorized` | Missing/wrong `X-Demo-Token` | Settings page → paste the token from `.env` |
| `503 chain_unavailable` | Fuji RPC down or bad key | Switch to `CHAIN_MODE=fake` |
| CORS error | Origin not listed | Add it to `CORS_ORIGINS` |
| `Stack too deep` when compiling | Missing via-IR | Enable via-IR (already set in `compile.mjs`) |
| `verify` says mismatch for every seed row | DB seeded, chain not | `npm run seed` in `contracts/`, or run in fake mode |
| Camera never starts | Not a secure context | See section 7 |
| Port 8800 busy | Old process | `Get-Process uvicorn | Stop-Process -Force` |

## 10. Rollback

```bash
git log --oneline -5
git checkout <last-good-sha>
docker compose up -d --build
```

Keep a pre-recorded 90-second demo video on both laptops. If all else fails, play it.
