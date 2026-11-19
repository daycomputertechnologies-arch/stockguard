# Contributing

## Branching

- `main` is protected and always deployable.
- One branch per task: `feat/<role>-<thing>` (e.g. `feat/api-audit-endpoint`).
- One reviewer per PR. `CODEOWNERS` requests the right person automatically.

## PRs

- Keep them small. If it touches two folders, it is probably two PRs.
- Say what you changed and how you verified it.
- Attach a screenshot for UI changes.
- Do not merge to `main` unless the API tests and the web build pass.

## Daily rhythm

| Time | What |
|---|---|
| 09:00 | 10-minute standup: yesterday / today / blocker |
| 13:00 | Merge checkpoint — PRs reviewed, `main` green |
| 17:30 | Staging deploy + smoke test of the demo path |
| 20:00 | Three-minute rehearsal |

## Don't

- Don't edit `docs/API_CONTRACT.md` alone; it is frozen.
- Don't commit `.env`, keys, or databases.
- Don't add a feature that is not on the frozen demo path without asking the group.
