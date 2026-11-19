# 05: Make the scanner demo work on a phone

**What to build:** A judge-visible scan on stage. The camera works on the demo phone, the printed QR opens the seeded batch, and an unknown code fails with a readable message instead of a dead screen.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] A QR for `stockguard://batch/BATCH-0001` is printed and scans on the demo phone
- [ ] The camera only starts on HTTPS or localhost, and the page explains this
- [ ] Scanning an unknown batch shows a clear 404 message with a retry path
- [ ] The manual payload field and demo-code chips work without a camera
- [ ] Camera stops cleanly when the page is left, with no stuck indicator
