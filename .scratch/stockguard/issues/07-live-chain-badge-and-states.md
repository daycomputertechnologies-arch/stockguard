# 07: Make chain state visible everywhere

**What to build:** A user can always tell whether they are looking at Fuji or the demo mirror, and every screen handles loading, empty, error and stale-data states without a blank page.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The sidebar badge reflects `chain_mode` from the API, live
- [ ] Every screen has a loading, empty and error state
- [ ] A failed API call shows the error and a retry, never a white screen
- [ ] A seeded batch with no hash shows "not on chain" instead of a broken link
- [ ] The Settings page shows db, seed and chain status from `/api/health`
