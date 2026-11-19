# StockGuard — API Contract v1.1

Change control: any change after freeze requires whole-team agreement and a version bump.
Code against this file. Do not invent fields.

**v1.1 adds** `GET /impact`, `GET /audit`, `GET /batches/{id}/verify`, the drug catalogue,
`derived_from`, and the QR payload format. Nothing in v1.0 was removed.

## Conventions

- **Base URL:** `https://<host>/api` (nginx prefixes `/api`; FastAPI runs on `:8800`)
- **Format:** JSON, `snake_case`
- **Timestamps:** ISO-8601 UTC (`2026-12-09T00:00:00Z`); unix seconds on-chain
- **IDs:** `batch_id`, `clinic_id`, `drug_code` are short strings
- **Auth:** writes and demo endpoints require `X-Demo-Token: <token>`; missing/wrong → `401`
- **Money:** ZAR, decimal, read-only (computed from the drug catalogue). No payments.

### QR payload (frozen)

```
stockguard://batch/BATCH-0001
```

Scanning **opens** an existing batch. It never creates one.
`GET /batches/scan?payload=` also accepts a bare `BATCH-0001`.

## Errors

```json
{ "error": "not_found", "message": "batch BATCH-0001 does not exist" }
```

| HTTP | `error` |
|---|---|
| 400 | `bad_request` |
| 401 | `unauthorized` |
| 404 | `not_found` |
| 409 | `conflict` |
| 422 | `validation_error` |
| 503 | `chain_unavailable` |

## Objects

### Clinic
```json
{ "clinic_id": "CLINIC-A", "name": "Langa CHC", "district": "Cape Metro North", "lat": -33.943, "lng": 18.53 }
```

### Drug
```json
{ "drug_code": "AMOX-500", "name": "Amoxicillin 500mg", "form": "capsule", "unit_cost": 1.85, "shelf_life_days": 730 }
```

### Batch
```json
{
  "batch_id": "BATCH-0003-T1",
  "drug_code": "METF-500",
  "drug_name": "Metformin 500mg",
  "clinic_id": "CLINIC-B",
  "quantity": 40,
  "unit_cost": 0.95,
  "value": 38.0,
  "expiry": "2026-12-24T00:00:00Z",
  "days_to_expiry": 35,
  "status": "in_transit",
  "derived_from": "BATCH-0003",
  "tx_hash": "0xabc...",
  "created_at": "2026-11-19T20:00:00Z",
  "updated_at": "2026-11-19T20:00:00Z"
}
```
`status` ∈ `registered | in_transit | dispensed | recalled`
`derived_from` is `null` for originals and the parent batch id for split batches.

### Transfer
```json
{
  "transfer_id": "TRF-0001",
  "batch_id": "BATCH-0003",
  "derived_batch_id": "BATCH-0003-T1",
  "from_clinic_id": "CLINIC-A",
  "to_clinic_id": "CLINIC-B",
  "quantity": 40,
  "reason": "stockout_risk",
  "tx_hash": "0xdef...",
  "created_at": "2026-11-19T20:05:00Z"
}
```
`reason` ∈ `stockout_risk | near_expiry | recall | rebalance`

### ForecastRow
```json
{
  "clinic_id": "CLINIC-B",
  "clinic_name": "Khayelitsha Site B CHC",
  "drug_code": "AMOX-500",
  "drug_name": "Amoxicillin 500mg",
  "on_hand": 38,
  "daily_use": 6.4,
  "days_to_stockout": 5.9,
  "risk": "high",
  "suggested_source_clinic_id": "CLINIC-A",
  "suggested_source_batch_id": "BATCH-0001",
  "suggested_qty": 52,
  "reasoning": "38 on hand at 6.4/day — 5.9 days left. CLINIC-A holds 240 units expiring in 21 days; move 52 to cover 14 days."
}
```
`risk` ∈ `low | medium | high` (high ≤ 7 days, medium ≤ 14, else low)

### Impact
```json
{
  "generated_at": "2026-11-19T20:10:00Z",
  "units_in_stock": 2432,
  "units_at_risk_of_expiry": 312,
  "value_at_risk": 4831.2,
  "predicted_stockouts": 3,
  "pending_transfers": 2,
  "clinics_connected": 12,
  "value_redirected": 1454.0,
  "chain_mode": "fake"
}
```
Every field is **computed**. The UI must never hardcode these numbers.

### AuditEvent
```json
{
  "id": 7,
  "type": "custody_transferred",
  "batch_id": "BATCH-0003-T1",
  "from_clinic_id": "CLINIC-A",
  "to_clinic_id": "CLINIC-B",
  "quantity": 40,
  "actor": "0x1234...",
  "tx_hash": "0xdef...",
  "detail": "40 units moved to cover 5.9-day stockout risk",
  "created_at": "2026-11-19T20:05:00Z"
}
```
`type` ∈ `batch_registered | custody_transferred | near_expiry_flagged | integrity_checked | tampered`

### Verification
```json
{
  "batch_id": "BATCH-0003-T1",
  "match": true,
  "db": { "quantity": 40, "clinic_id": "CLINIC-B", "status": "in_transit" },
  "chain": { "quantity": 40, "clinic_id": "CLINIC-B", "status": "in_transit" },
  "checked_at": "2026-11-19T20:12:00Z",
  "tx_hash": null,
  "message": "Database matches on-chain custody."
}
```
In `CHAIN_MODE=fake`, `chain` is `null`, `match` is `true`, `message` says demo chain.

---

## Endpoints

### `GET /health`
```json
{ "status": "ok", "chain": "fake", "chain_id": null, "contract": null, "db": "ok", "seed": "ok" }
```

### `GET /clinics`
```json
{ "clinics": [ /* Clinic */ ] }
```

### `GET /drugs`
```json
{ "drugs": [ /* Drug */ ] }
```

### `POST /batches`
```json
{ "batch_id": "BATCH-0020", "drug_code": "AMOX-500", "clinic_id": "CLINIC-A",
  "quantity": 200, "expiry": "2026-12-09T00:00:00Z" }
```
`201` → Batch (with `tx_hash`). Calls `registerBatch()`.
Errors: `409` if `batch_id` exists, `404` if drug/clinic unknown.

### `GET /batches?clinic_id=CLINIC-A&status=registered&q=amox`
```json
{ "batches": [ /* Batch */ ] }
```

### `GET /batches/{batch_id}`
`200` → Batch, `404` → `not_found`.

### `GET /batches/scan?payload=stockguard://batch/BATCH-0001`
`200` → Batch. `400` if the payload is not a StockGuard QR. `404` if unknown.

### `GET /batches/{batch_id}/verify`
`200` → Verification. Compares the database row with `getBatch()` on chain.

### `POST /batches/{batch_id}/flag-expiry`
No body. Emits `NearExpiryFlagged`; returns Batch with a fresh `tx_hash`.
Repeat calls return `409 conflict`.

### `POST /transfers`
```json
{ "batch_id": "BATCH-0001", "to_clinic_id": "CLINIC-B", "quantity": 52, "reason": "stockout_risk" }
```
`201` → Transfer. Calls `transferCustody()`.
- Partial quantity → the chain splits the batch; response carries `derived_batch_id`.
- Decrements the source batch quantity.
Errors: `404` unknown batch/clinic, `409` quantity > on-hand or same clinic.

### `GET /transfers?batch_id=BATCH-0001`
```json
{ "transfers": [ /* Transfer */ ] }
```

### `GET /audit?batch_id=&limit=50`
```json
{ "events": [ /* AuditEvent */ ] }
```
Newest first. `limit` defaults to 50, max 200.

### `GET /forecast`
Filters: `?clinic_id=`, `?risk=high`.
```json
{ "generated_at": "2026-11-19T20:10:00Z", "rows": [ /* ForecastRow */ ] }
```

### `GET /impact`
`200` → Impact. Powers the six KPI cards.

### `POST /agent/chat`
```json
{ "message": "Why is Khayelitsha Site B short of amoxicillin?", "clinic_id": "CLINIC-B" }
```
```json
{ "reply": "Khayelitsha Site B has 38 units at 6.4/day — about 5.9 days left. Langa CHC holds 240 units expiring in 21 days; I suggest moving 52 now.",
  "source": "rules",
  "actions": [ { "type": "suggest_transfer", "batch_id": "BATCH-0001", "to_clinic_id": "CLINIC-B", "quantity": 52 } ] }
```
`source` ∈ `rules | gemini`. `actions` is advisory — the UI must confirm before `POST /transfers`.

### `POST /demo/tamper` (guarded)
Requires `ALLOW_DEMO_ENDPOINTS=true` and `X-Demo-Token`.
```json
{ "batch_id": "BATCH-0001", "quantity": 9999 }
```
Mutates the SQLite row **only**, leaving the chain untouched, so `/verify` reports a
mismatch. Returns `{ "ok": true, "batch_id": "BATCH-0001" }`. Never call in production.

---

## Chain mapping

| API action | Contract call | Event |
|---|---|---|
| `POST /batches` | `registerBatch(...)` | `BatchRegistered` |
| `POST /transfers` (full) | `transferCustody(...)` | `CustodyTransferred` |
| `POST /transfers` (partial) | `transferCustody(...)` | `CustodyTransferred` + `BatchRegistered` (`-T<n>`) |
| `POST /batches/{id}/flag-expiry` | `flagNearExpiry(...)` | `NearExpiryFlagged` |
| `GET /batches/{id}` | `getBatch(...)` | — |
| `GET /batches/{id}/verify` | `getBatch(...)` | — |

Adapter interface (fake first, real second): `register_batch()`, `transfer_custody()`,
`flag_near_expiry()`, `get_batch()`.

The backend is the only writer. The frontend never touches the chain.

## Chain failure policy

If Fuji is unreachable, writes return `503 chain_unavailable` **except** in safe-demo
mode (`CHAIN_MODE=fake`), where the adapter accepts them and the UI shows a
"demo chain" badge.
