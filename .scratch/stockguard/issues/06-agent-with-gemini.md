# 06: Gemini agent behind /agent/chat

**What to build:** The agent answers a stockout question using live forecast numbers and returns one advisory transfer action. With no API key, the same endpoint falls back to the rules answer, so the demo never depends on quota.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] With `GEMINI_API_KEY` set, `source` is `gemini`
- [ ] The reply cites on-hand units, daily use and days-to-stockout from the forecast
- [ ] The returned action points at a real source batch and a sensible quantity
- [ ] With no key or a failed call, `source` is `rules` and the reply still lands
- [ ] The UI never executes an action without a confirm step
