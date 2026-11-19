# StockGuard ticket board

One file per ticket, numbered in dependency order. Work the **frontier**: any
ticket whose blockers are all done. Do not start a ticket whose blockers are
open, even if it looks easy — the blockers exist because the work is wasted
otherwise.

| # | Ticket | Blocked by |
|---|---|---|
| 01 | Prove the pipeline (GO/NO-GO) | — |
| 02 | Publish repo and onboard the team | — |
| 03 | Prove the partial-transfer split on Fuji | 01 |
| 04 | Run the API against Fuji | 01, 03 |
| 05 | Scanner on HTTPS / phone | 01 |
| 06 | Gemini agent behind /agent/chat | — |
| 07 | Live chain badge and states | — |
| 08 | Safe-demo mode on the demo laptop | 05, 07 |
| 09 | Deck with sourced problem numbers | — |
| 10 | Screenshots and backup recording | 05, 07 |
| 11 | Rehearse twice, then freeze | 01, 03–10 |

Owners: 01, 03, 04 → blockchain. 02, 07 → backend. 05, 10 → frontend.
06 → backend. 08 → backend + frontend. 09 → docs. 11 → everyone.
