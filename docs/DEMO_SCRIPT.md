# Demo script — three minutes

Two presenters, one laptop, one phone. Freeze code at 09:00.

## Before you walk on

- [ ] Staging URL loads on the phone over HTTPS.
- [ ] `node scripts/smoke.mjs` passes.
- [ ] `BATCH-0001` is untouched: 240 units at Langa CHC.
- [ ] The scanner QR for `BATCH-0001` is printed.
- [ ] Backup laptop has the same `.env` and a safe-demo copy.
- [ ] Browser zoom at 90%, notifications off.

## Beat 1 — The problem (0:00–0:30)

> Public clinics run out of essential medicine while a clinic down the road
> holds the same drug until it expires. Stock moves on paper, so nobody can
> prove who held what, or when.

Show the Overview. Point at **Predicted stockouts: 3** and **At risk of expiry**.

## Beat 2 — Scan (0:30–1:00)

Scanner → phone scans the printed QR.

> That's batch BATCH-0001: 240 units of amoxicillin at Langa CHC, expiring in 21
> days. The batch id is a hash on chain, and the custody record is already there.

Hit **Verify on chain**. It goes green.

## Beat 3 — Forecast (1:00–1:40)

Forecast → the high-risk row.

> Khayelitsha Site B has 38 units at 6.4 a day — under six days of cover. The
> system found the nearest surplus: Langa's 240 units, the batch that expires
> soonest. Moving 52 units solves both problems at once.

Ask the agent on Overview: *"Why is Khayelitsha Site B short of amoxicillin?"*
Let it answer with the numbers.

## Beat 4 — Transfer (1:40–2:20)

Smart Redistribution → **Move**.

> Partial move. The chain splits the batch: Langa keeps 188, and
> BATCH-0001-T1 carries 52 units to Khayelitsha. The backend signs it, so
> there's no wallet popup on stage.

Open the explorer link. Let the room see the transaction.

## Beat 5 — Tamper (2:20–2:50)

Settings → Tamper the row → set BATCH-0001 to 9999.

> Suppose someone edits the database to hide stock. Watch.

Inventory → **Verify** on BATCH-0001. It goes red: 9 999 in the database, 240 on
chain. The audit trail logs a `tamper detected` event.

> Don't trust our database. Read the chain.

## Beat 6 — Close (2:50–3:00)

Back to Overview: the KPI numbers have moved.

> Prevention instead of procurement: move stock before it dies, and prove every
> hand it passed through.

## Q&A answers to have ready

| Question | Answer |
|---|---|
| Is this real data? | No. Fully synthetic, seeded from the shared seed files. |
| Why blockchain, not a database? | A database proves what you say now. The chain proves what you said then, to a third party, without trusting us. |
| What stops someone editing the chain? | Nothing — that's the point. The record is append-only; a mismatch is visible, which is what a regulator needs. |
| Cost at scale? | One write per custody event. Batches, not doses. Fuji is free; mainnet cost is cents per event. |
| Who signs? | A clinic-network operator key held server-side. Later: a multisig per district. |
| What if the internet dies? | Safe-demo mode mirrors the chain locally and badges it clearly. |
