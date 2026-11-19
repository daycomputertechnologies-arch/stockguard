# Deploy to Fuji with Core Wallet

Step-by-step, using Core (not MetaMask) as the browser wallet.

## 0. Before you touch the chain

```powershell
cd C:\Users\dayta\stockguard\contracts
npm install
npm run compile
```

You need `packages/shared/abi/DrugBatchRegistry.json` to exist. It already exists
in the repo; recompiling just proves your copy is current.

## 1. Put Core on the Fuji C-Chain

1. Open the Core extension and unlock it.
2. Network selector → **Avalanche Fuji Testnet**.
3. If it is missing, add it:
   - Network name: `Avalanche Fuji Testnet`
   - RPC URL: `https://api.avax-test.network/ext/bc/C/rpc`
   - Chain ID: `43113`
   - Symbol: `AVAX`
   - Explorer: `https://testnet.snowtrace.io`

## 2. Confirm the money is on the right chain

The address should show **AVAX on Fuji**. Tokens on Ethereum Sepolia, DFK or any
other subnet will not pay for this deploy.

If the balance is zero, use https://faucet.avax.network (select Fuji) — Fuji is
free. You need roughly **0.05 AVAX** to be comfortable for the deploy plus 16
seed transactions.

## 3. Deploy with Remix + Core

Core injects `window.ethereum`, so Remix sees it as an injected provider.

1. Open https://remix.ethereum.org.
2. File explorer → create `DrugBatchRegistry.sol` → paste the whole contract
   from `contracts/DrugBatchRegistry.sol`.
3. **Solidity Compiler** tab:
   - Compiler `0.8.24`
   - Advanced Configurations → tick **Enable via IR**
   - Optimizer: enabled, `200` runs
   - Leave the EVM version at default (Shanghai)
   - Compile
4. **Deploy & Run** tab:
   - Environment: **Injected Provider — MetaMask** (this is the generic
     injected slot; Core works through it)
   - Core will ask to connect. Approve, and check the network reads
     `Custom (43113)`.
   - Account: your funded Core account
   - Contract: `DrugBatchRegistry`
   - Constructor argument `network_`: **`fuji:43113`** (exactly this string)
5. **Deploy** → approve in Core → wait for the green check.
6. Copy the contract address from **Deployed Contracts**. Click the transaction
   hash and confirm it opens on https://testnet.snowtrace.io.

Keep that address. It goes into `.env` in step 5.

## 4. Give the API its signer

The backend signs every write, so it needs the private key of the account that
owns the contract.

1. Core → the account → **Export private key** (copy it, never paste it into chat
   or a commit).
2. **Use a demo-only account.** Do not export a wallet that holds real funds.

> If you would rather not export a key: create a second throwaway account, fund
> it with a little AVAX, and call `setOperator(<that address>, true)` from the
> owner account in Remix. Then use that account's key for the API.

## 5. Fill the root `.env`

Create `C:\Users\dayta\stockguard\.env` from `.env.example`:

```dotenv
CHAIN_MODE=fuji
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113
CONTRACT_ADDRESS=0x...your deployed address...
OPERATOR_PRIVATE_KEY=0x...your exported key...
EXPLORER_BASE=https://testnet.snowtrace.io
```

`.env` is gitignored. The API now loads it automatically at startup.

## 6. Register the seed batches on chain

```powershell
cd C:\Users\dayta\stockguard\contracts
npm run seed
```

Expect 16 lines of transaction hashes. The script skips batches that already
exist, so it is safe to run twice. If it runs out of gas, top up AVAX and rerun.

## 7. Verify the API is on chain

```powershell
cd C:\Users\dayta\stockguard\services\api
uv sync --extra chain
uv run uvicorn app.main:app --reload --port 8800
```

Then:

```powershell
Invoke-RestMethod http://127.0.0.1:8800/api/health
Invoke-RestMethod http://127.0.0.1:8800/api/batches/BATCH-0001/verify
```

Expected: `"chain": "fuji"`, a contract address and block number, and
`match: true` for BATCH-0001.

## 8. Do one visible write

In the web app, move 5 units from any batch. Open the returned transaction hash
on Snowtrace. That is the first real demo-path proof.

Seeded batches have `tx_hash` null by design; only live writes produce hashes.

## If something fails

| Symptom | Fix |
|---|---|
| Remix shows no account | Core popup blocked; click the environment and approve access |
| `Stack too deep` | via IR is off. Tick it and recompile |
| `insufficient funds` | Tokens are on another chain, or below gas cost |
| API: `CHAIN_MODE=fuji needs web3` | `uv sync --extra chain` |
| API: `Missing ABI` | `npm run compile` in `contracts/` |
| `verify` mismatch on every batch | `npm run seed` has not run, or `CONTRACT_ADDRESS` is wrong |
| Transaction reverts with `NotOwner` / `NotOperator` | `OPERATOR_PRIVATE_KEY` is not the deployer and was never authorised |
