import { Icon } from "../components/Icon";
import { PageHeader } from "../components/ui";

const roadmap = [
  {
    icon: "sparkles" as const,
    title: "Auto-drafted replenishment",
    body: "Turn a forecast row into a provincial order with one click, already costed from the catalogue.",
  },
  {
    icon: "cart" as const,
    title: "Supplier lead times",
    body: "Reorder points that account for the depot's real delivery window, not a fixed threshold.",
  },
  {
    icon: "shield" as const,
    title: "On-chain procurement proof",
    body: "Same custody trail, extended to the purchase order so auditors can follow stock back to the supplier.",
  },
];

export default function Orders() {
  return (
    <div>
      <PageHeader
        overline="Orders & procurement"
        title="Replenishment, next"
        subtitle="Deliberately out of the demo path. Redistribution first, then ordering."
      />

      <div className="card overflow-hidden">
        <div className="border-b border-line bg-gradient-to-r from-ink to-ink-700 px-6 py-8 text-white">
          <span className="pill bg-white/10 text-brand-200 ring-1 ring-white/10">
            <Icon name="cart" className="h-3.5 w-3.5" />
            pilot module
          </span>
          <h2 className="mt-3 text-2xl font-bold">Ordering is the next slice, not this one.</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300">
            The demo proves prevention: find the stockout, move the stock, prove custody. Buying more
            stock is the fallback when redistribution cannot help.
          </p>
        </div>
        <ul className="grid gap-4 p-6 md:grid-cols-3">
          {roadmap.map((item) => (
            <li key={item.title} className="rounded-xl border border-line p-4">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
              </span>
              <div className="mt-3 text-sm font-semibold text-ink">{item.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.body}</p>
            </li>
          ))}
        </ul>
        <div className="border-t border-line bg-slate-50/60 px-6 py-3 text-[11px] text-slate-500">
          Scope rule from <span className="font-medium text-ink">STOCKGUARD-PLAN.md</span>: nothing
          joins the demo path after the freeze without whole-team agreement.
        </div>
      </div>
    </div>
  );
}
