# 08: Prove safe-demo mode on the demo laptop

**What to build:** With Wi-Fi and Fuji unavailable, the whole story still runs: scan, forecast, transfer, verify and tamper detection. The UI is honest that it is a demo chain.

**Blocked by:** 05, 07.

**Status:** ready-for-agent

- [ ] With the network cable pulled, a scan still opens a batch
- [ ] A partial transfer still splits the batch and records a hash
- [ ] Verify still returns a match, and tamper still returns a mismatch
- [ ] The demo-chain badge is visible on every screen
- [ ] Switching back to Fuji needs only the env var and a restart
- [ ] The exact switch commands are written on the runbook page
