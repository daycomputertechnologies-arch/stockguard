# Decisions (ADRs)

Short records of choices that are expensive to reverse. Add one rather than
re-litigating in chat.

## ADR-001 — The backend owns the signer

**Context.** A hackathon demo cannot depend on a MetaMask popup.
**Decision.** `services/api` holds the Fuji operator key and signs every write.
The browser never touches the chain.
**Consequence.** One key to protect, and the API must be the only writer. Any
chain claim in the UI must show a `tx_hash` link so judges can check it.

## ADR-002 — A partial transfer splits the batch

**Context.** The design and the API both move *part* of a batch (40 of 120).
The first contract decremented the source but moved the whole remaining
balance to the destination — the chain would have lied about custody.
**Decision.** A partial `transferCustody` creates a derived batch named
`<batchId>-T<n>` at the destination and leaves the remainder with the source.
The backend generates the derived id and passes it to the contract, so the API
and the chain can never disagree about naming.
**Consequence.** `Batch.derived_from` exists, batch counts grow, and the audit
trail shows both the parent losing units and the child gaining them.

## ADR-003 — The fake chain mirrors writes

**Context.** Every demo element must survive a dead network.
**Decision.** `FakeChain` stores a mirror of every write and answers
`getBatch()` from it, seeded from SQLite at boot.
**Consequence.** Tamper detection works offline, not just on Fuji. The UI still
labels the mode as **demo chain** so nobody is misled.

## ADR-004 — QR payload format is frozen

`stockguard://batch/BATCH-0001`. Scanning **opens** an existing batch; it never
creates one. Unknown codes return `404` with a readable message, and the seeded
demo codes are always available on the Scanner page. This removes the classic
"judge scans a random code and the demo dies" failure.

## ADR-005 — A drug catalogue carries cost

**Context.** The design shows rand figures (waste prevented, value at risk).
**Decision.** `drugs` holds `unit_cost` and `shelf_life_days`; every rand value
is computed as `quantity × unit_cost`.
**Consequence.** No hardcoded impact numbers. If a judge asks where R3 699
comes from, the answer is a query.

## ADR-006 — Full shell, four live screens

**Context.** The Figma has ten destinations; the build window is 1.5 days.
**Decision.** All ten routes exist and render real layout. Four are deep
(Overview, Scanner, Redistribution, Audit Trail). Three are thin but backed by
the same API (Inventory, Forecast, Network). Three are honest placeholders
(Orders, Reports is derived, Settings is real utility).
**Consequence.** The product looks finished without pretending every module is.

## ADR-007 — Seed dates are offsets

Seed rows carry `expiry_in_days` and `registered_days_ago`, resolved when the
database is seeded. Absolute dates rot and would make the demo look stale.

## ADR-008 — Everything is under `/api`

FastAPI mounts every route with a `/api` prefix. Vite proxies `/api` to `:8800`
and nginx forwards `/api` to the API container. One rule, no rewrites to debug.

## ADR-009 — `viaIR` is required

`transferCustody` with the split logic exceeds the legacy compiler's stack
limit. `contracts/compile.mjs` enables `viaIR: true`; Remix must have it ticked
too. Do not "fix" this by deleting the split.
