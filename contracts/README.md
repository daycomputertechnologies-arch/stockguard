# Contracts

`DrugBatchRegistry.sol` — four writes, no tokens, no proxy. The backend signer is the only operator.

## The one design decision that matters

A transfer of *part* of a batch **splits** the batch:

```
BATCH-0001  Amoxicillin 120 @ Langa CHC
transfer 40 -> Khayelitsha Site B

BATCH-0001     80 @ Langa CHC            (unchanged status)
BATCH-0001-T1  40 @ Khayelitsha Site B   (status InTransit, derivedFrom BATCH-0001)
```

Without the split the chain would show all 120 units moving, and the audit trail would lie.
See `docs/DECISIONS.md` ADR-002.

## Compile and deploy

```powershell
cd contracts
npm install
npm run compile          # writes packages/shared/abi/DrugBatchRegistry.json
npm run deploy           # needs FUJI_RPC_URL + OPERATOR_PRIVATE_KEY in .env
npm run seed             # needs CONTRACT_ADDRESS too; registers seed batches
```

Compiler is pinned to `solc 0.8.24` via npm, so no global install and no Foundry needed.

## Remix path (fastest, matches the course)

1. Open https://remix.ethereum.org, paste `DrugBatchRegistry.sol`.
2. Compiler `0.8.24`, EVM version `paris` (Fuji-safe).
3. Deploy with environment **Injected Provider — MetaMask**, network **Avalanche Fuji**.
4. Constructor argument: `fuji:43113`.
5. Copy the address into `.env` as `CONTRACT_ADDRESS`, and set `CHAIN_MODE=fuji`.

## Tests

No Foundry or Hardhat is installed on the demo machine. The split logic is exercised
by the backend integration test in `services/api/tests/test_transfers.py`, which runs
the same rules through the fake adapter. Add a Foundry suite here if time allows:

```bash
forge test --match-contract DrugBatchRegistry
```
