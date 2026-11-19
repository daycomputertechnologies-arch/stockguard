# 04: Run the API against Fuji

**What to build:** The backend writes and reads a real chain instead of the mirror: seeded batches exist on Fuji, the adapter is live, and a scan shows real transaction hashes after a transfer.

**Blocked by:** 01, 03.

**Status:** ready-for-agent

- [ ] `npm run seed` in `contracts/` registers the seed batches on Fuji
- [ ] `CHAIN_MODE=fuji` with all three chain env vars set
- [ ] `GET /api/health` reports `fuji` and a block number
- [ ] `GET /api/batches/:id/verify` returns `match: true` for seeded batches
- [ ] A live transfer from the UI returns a hash that opens on Snowtrace
- [ ] A 503 from Fuji is surfaced as `chain_unavailable`, not a crash
