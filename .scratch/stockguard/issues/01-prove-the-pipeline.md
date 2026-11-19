# 01: Prove the pipeline (GO / NO-GO)

**What to build:** The full path works on public infrastructure before anyone builds a feature: a public HTTPS URL serves the web app, the contract is deployed to Avalanche Fuji with a clickable explorer link, and the deployed frontend calls `GET /api/health` and shows `seed: ok`.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `docker compose up --build` succeeds on the target host
- [ ] Web app loads over HTTPS on a phone
- [ ] `GET /api/health` reports `chain: fuji` and a contract address
- [ ] The explorer link for the deploy transaction opens and shows the contract
- [ ] The public frontend renders the Overview with seeded data
- [ ] Any failure is fixed before ticket 02 starts
