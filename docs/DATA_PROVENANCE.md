# Data provenance

## Everything here is synthetic

`packages/shared/seed/*.json` is invented for the demo. Clinic names are real
Cape Metro facilities for plausibility; **quantities, expiry dates, daily use
and costs are fabricated**. Nothing is patient data, and nothing came from a
clinic system.

Do not present the impact figures as real-world measurements. The correct
phrasing is "in our simulated network", not "clinics waste R374k".

## What is computed vs invented

| Figure | Source |
|---|---|
| Units in stock | `SUM(batches.quantity)` |
| Units at risk of expiry | batches expiring within 30 days |
| Value at risk | `quantity × drugs.unit_cost` |
| Predicted stockouts | forecast rows with `risk = high` |
| Pending transfers | transfers in the last 14 days |
| Clinics connected | `COUNT(clinics)` |
| Value redirected | `SUM(transfer.quantity × unit_cost)` |

All live queries over the seeded database. No constants in the UI.

## Costs

`drugs.unit_cost` values are illustrative ZAR figures in a plausible range for
public-sector generic medicines. They exist so rand figures are computed rather
than hardcoded. Replace them with a real price list before any pilot.

## Daily use

`usage.daily_use` is invented to make the forecast tell a clear story: three
high-risk rows, two watch rows, the rest healthy. A real deployment would
replace this table with dispensing history.

## Claims that need a citation before the pitch

The problem framing (stockouts, expiry waste, leakage in SA public clinics)
needs sourced numbers in the deck. Add each source to this file with a URL and a
date, so the Q&A bank can point at it. Do not put an unsourced number on a slide.
