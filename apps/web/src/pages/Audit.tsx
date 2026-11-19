import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { num, relativeTime } from "../lib/format";
import type { AuditEvent } from "../lib/types";
import { Icon } from "../components/Icon";
import { VerifyButton } from "../components/VerifyButton";
import { EmptyState, ErrorNote, Loading, PageHeader, TxLink } from "../components/ui";

const typeStyles: Record<string, string> = {
  batch_registered: "bg-slate-100 text-slate-600",
  custody_transferred: "bg-sky-50 text-sky-600 ring-1 ring-sky-100",
  near_expiry_flagged: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  integrity_checked: "bg-violet-50 text-violet-600 ring-1 ring-violet-100",
  tampered: "bg-red-50 text-red-600 ring-1 ring-red-100",
};

const typeLabels: Record<string, string> = {
  batch_registered: "registered",
  custody_transferred: "custody moved",
  near_expiry_flagged: "expiry flagged",
  integrity_checked: "integrity check",
  tampered: "tamper detected",
};

export default function Audit() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [batchId, setBatchId] = useState("");
  const [type, setType] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load(batch?: string) {
    setLoading(true);
    api
      .audit({ batch_id: batch || undefined, limit: 200 })
      .then((data) => {
        setEvents(data);
        setError("");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(), []);

  const types = useMemo(
    () => ["all", ...Array.from(new Set(events.map((event) => event.type)))],
    [events],
  );
  const visible = type === "all" ? events : events.filter((event) => event.type === type);

  const stats = useMemo(
    () => ({
      total: events.length,
      transfers: events.filter((event) => event.type === "custody_transferred").length,
      flags: events.filter((event) => event.type === "near_expiry_flagged").length,
      tampered: events.filter((event) => event.type === "tampered").length,
    }),
    [events],
  );

  return (
    <div>
      <PageHeader
        overline="Blockchain audit trail"
        title="Every custody change, provable"
        subtitle="Append-only events written by the backend operator. Each row links to the Fuji transaction when the chain is live."
        actions={
          <span className="pill bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Icon name="shield" className="h-3.5 w-3.5" />
            tamper-evident
          </span>
        }
      />

      {error ? <ErrorNote message={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total events", value: stats.total },
          { label: "Custody moves", value: stats.transfers },
          { label: "Expiry flags", value: stats.flags },
          { label: "Tamper alerts", value: stats.tampered },
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <div className="label">{card.label}</div>
            <div className="mt-1.5 text-2xl font-bold text-ink">{num(card.value)}</div>
          </div>
        ))}
      </div>

      <div className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <form
            className="flex flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              load(batchId.trim());
            }}
          >
            <input
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              placeholder="Filter by batch id, e.g. BATCH-0001"
              className="input max-w-xs font-mono !text-xs"
            />
            <button type="submit" className="btn-ghost">
              Filter
            </button>
          </form>
          <div className="flex flex-wrap gap-1">
            {types.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={`pill ${
                  type === option ? "bg-ink text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {typeLabels[option] ?? option}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Loading label="Reading the trail" />
        ) : visible.length === 0 ? (
          <EmptyState icon="shield" title="No events" message="Nothing matches this filter yet." />
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((event) => (
              <li key={event.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <span className={`pill ${typeStyles[event.type] ?? "bg-slate-100 text-slate-500"}`}>
                  {typeLabels[event.type] ?? event.type}
                </span>
                <div className="min-w-[220px] flex-1">
                  <div className="text-sm text-ink">{event.detail ?? event.type}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {event.batch_id ? <span className="font-mono">{event.batch_id}</span> : null}
                    {event.quantity !== null ? ` · ${num(event.quantity)} units` : ""}
                    {event.actor ? ` · ${event.actor.slice(0, 10)}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">{relativeTime(event.created_at)}</span>
                  <TxLink hash={event.tx_hash} />
                  {event.batch_id ? <VerifyButton batchId={event.batch_id} compact /> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
