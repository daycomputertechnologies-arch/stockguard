# Design

Source: Figma Make — *StockGuard Healthcare Inventory Platform*
`figma.com/make/K3mOudlGw59yYod9OzhwLd`

The Figma is the **visual spec**, not the scope. Tokens live in
`tokens.css`; the Tailwind theme in `apps/web/tailwind.config.js` mirrors them.

## Screen tiers

| Tier | Screens | Backing |
|---|---|---|
| Live | Overview, QR Batch Scanner, Smart Redistribution, Blockchain Audit Trail | Real endpoints, real chain writes |
| Derived | Inventory, AI Demand Forecast, Clinic Network | Same API, list views |
| Utility | Reports & Analytics, Settings | Computed aggregates, demo controls |
| Placeholder | Orders & Procurement | Labelled pilot module |

## Rules extracted from the design

- Sidebar: navy `#0B2545`, 272px, teal active pill `#0F766E`, red count badge.
- Canvas `#F6F8FB`, cards white, 18px radius, soft low-contrast shadow.
- One accent colour (teal). Risk uses red/amber/emerald only.
- Numbers are the hero: 30px bold, tight tracking, small grey footnote.
- Labels are 11px, uppercase, 0.09em tracking, slate-400.
- Every chart has a dashed secondary reference line.
- No gradients except the Orders placeholder; flat surfaces everywhere else.

## Deviations from the Figma (deliberate)

| Figma | Built | Why |
|---|---|---|
| "Medicine stock trend" area chart | "Units expiring by month" | We have no history; expiring-by-month is real data from the seed |
| Waste prevented R374k | Value redirected, computed | Hardcoded figures fail a judge's question |
| 42 clinics / 8 stockouts | 12 clinics / 3 stockouts | Computed from the seed, not typed into the UI |
| Grey trend skeleton | Real AreaChart component | Same visual language, real numbers |

## Fonts

Inter 400/500/600/700/800 via Google Fonts. Fallback: system sans.
