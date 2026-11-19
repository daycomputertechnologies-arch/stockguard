import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { num, relativeTime, greeting, longDate, zar } from "../lib/format";
import type { AgentReply, AuditEvent, Batch, ForecastRow, Impact } from "../lib/types";
import { AreaChart } from "../components/AreaChart";
import { RiskBadge } from "../components/Badges";
import { Icon, type IconName } from "../components/Icon";
import { StatCard } from "../components/StatCard";
import { ErrorNote, Loading, SectionTitle, TxLink } from "../components/ui";
import { useClinic } from "../components/AppShell";

function expiryBuckets(batches: Batch[]) {
  const today = new Date();
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() + index, 1);
    return {
      label: date.toLocaleDateString("en-ZA", { month: "short" }),
      value: 0,
      index,
    };
  });
  for (const batch of batches) {
    const date = new Date(batch.expiry);
    const offset =
      (date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth();
    if (offset >= 0 && offset < buckets.length) {
      buckets[offset].value += batch.quantity;
    }
  }
  return buckets;
}

const riskRow: Record<string, string> = {
  high: "bg-red-50/70 ring-red-100",
  medium: "bg-amber-50/70 ring-amber-100",
  low: "bg-emerald-50/70 ring-emerald-100",
};

const riskIcon: Record<string, string> = {
  high: "bg-red-100 text-red-500",
  medium: "bg-amber-100 text-amber-500",
  low: "bg-emerald-100 text-emerald-500",
};

const riskGlyph: Record<string, IconName> = {
  high: "alert",
  medium: "clock",
  low: "leaf",
};

export default function Overview() {
  const navigate = useNavigate();
  const { clinicId } = useClinic();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [forecast, setForecast] = useState<ForecastRow[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<AgentReply | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    Promise.all([
      api.impact(),
      api.forecast(),
      api.batches(),
      api.audit({ limit: 4 }),
    ])
      .then(([impactData, forecastData, batchData, auditData]) => {
        setImpact(impactData);
        setForecast(forecastData.rows);
        setBatches(batchData);
        setEvents(auditData);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const buckets = useMemo(() => expiryBuckets(batches), [batches]);
  const threshold = useMemo(
    () => Math.max(...buckets.map((bucket) => bucket.value), 1) * 0.3,
    [buckets],
  );

  const priority = forecast
    .filter((row) => row.risk !== "low" && row.suggested_source_batch_id)
    .slice(0, 2);
  const recommendation = priority[0];
  const topBatch = useMemo(
    () => batches.find((batch) => batch.batch_id === recommendation?.suggested_source_batch_id),
    [batches, recommendation],
  );

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setAsking(true);
    try {
      const result = await api.agent(message, clinicId);
      setReply(result);
    } catch (err) {
      setReply({
        reply: err instanceof Error ? err.message : "The agent is unavailable.",
        source: "rules",
        actions: [],
      });
    } finally {
      setAsking(false);
    }
  }

  if (error) return <ErrorNote message={error} />;
  if (!impact) return <Loading label="Loading the network" />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-brand-700">
            {longDate()}
          </div>
          <h1 className="text-[30px] font-bold leading-tight tracking-tight text-ink">
            {greeting()}, Thandi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here&apos;s what needs your attention across the Cape Metro clinic network.
          </p>
        </div>
        <span className="pill bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Network operational
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total units in stock"
          value={num(impact.units_in_stock)}
          icon="inventory"
          tone="brand"
          footnote={`${impact.clinics_connected} clinics connected`}
        />
        <StatCard
          label="At risk of expiry"
          value={num(impact.units_at_risk_of_expiry)}
          icon="clock"
          tone="amber"
          footnote={`${zar(impact.value_at_risk, true)} at risk — next 30 days`}
          progress={42}
        />
        <StatCard
          label="Predicted stockouts"
          value={impact.predicted_stockouts}
          icon="alert"
          tone="red"
          footnote="high risk within 7 days"
          progress={Math.min(100, impact.predicted_stockouts * 20)}
        />
        <StatCard
          label="Pending transfers"
          value={impact.pending_transfers}
          icon="share"
          tone="violet"
          footnote="last 14 days"
        />
        <StatCard
          label="Clinics connected"
          value={impact.clinics_connected}
          icon="map"
          tone="sky"
          footnote="Cape Metro network"
        />
        <StatCard
          label="Value redirected"
          value={zar(impact.value_redirected, true)}
          icon="shield"
          tone="emerald"
          footnote="moved before expiry"
          progress={64}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <section className="card flex flex-col">
          <SectionTitle
            title="Units expiring by month"
            subtitle="Next six months across the network"
            actions={
              <Link to="/reports" className="flex items-center gap-1 text-xs font-semibold text-brand-700">
                View analytics <Icon name="chevronRight" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="px-5 pb-5">
            <AreaChart
              points={buckets.map((bucket) => ({ label: bucket.label, value: bucket.value }))}
              threshold={threshold}
              legend={{ primary: "Units expiring", secondary: "Safety buffer" }}
            />
          </div>
          <div className="mt-auto border-t border-line px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="label">Latest chain activity</div>
              <Link to="/audit" className="text-xs font-semibold text-brand-700">
                Full trail
              </Link>
            </div>
            <ul className="mt-2 space-y-1.5">
              {events.slice(0, 3).map((event) => (
                <li key={event.id} className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  <span className="truncate">{event.detail ?? event.type}</span>
                  <span className="ml-auto shrink-0 text-slate-400">
                    {relativeTime(event.created_at)}
                  </span>
                  <TxLink hash={event.tx_hash} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card flex flex-col p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
              <Icon name="sparkles" className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold tracking-[0.16em] text-brand-700">STOCKGUARD AI</div>
              <h2 className="text-[17px] font-bold text-ink">Supply intelligence</h2>
            </div>
            <span className="pill bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
              Live
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Connected risks across the network. One transfer can prevent a stockout and reduce
            expiry waste.
          </p>

          <div className="mt-4 space-y-2.5">
            {priority.map((row) => (
              <div
                key={`${row.clinic_id}-${row.drug_code}`}
                className={`flex items-start gap-3 rounded-xl p-3 ring-1 ${riskRow[row.risk]}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${riskIcon[row.risk]}`}>
                  <Icon name={riskGlyph[row.risk]} className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-ink">
                    {row.risk === "high" ? "Stockout predicted" : "Cover dropping"} — {row.drug_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.clinic_name}: {num(row.on_hand)} units, about {row.days_to_stockout} days
                    left.
                  </div>
                </div>
              </div>
            ))}

            {recommendation && topBatch ? (
              <button
                type="button"
                onClick={() =>
                  navigate("/redistribution", { state: { focus: recommendation.drug_code } })
                }
                className="flex w-full items-center gap-3 rounded-xl bg-emerald-50 p-3 text-left ring-1 ring-emerald-100 transition hover:bg-emerald-100/70"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Icon name="share" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-emerald-800">Recommended transfer</div>
                  <div className="text-xs text-emerald-700/80">
                    Move {recommendation.suggested_qty} units of {topBatch.drug_name} to{" "}
                    {recommendation.clinic_name}
                  </div>
                </div>
                <Icon name="arrowRight" className="h-4 w-4 shrink-0 text-emerald-600" />
              </button>
            ) : null}
          </div>

          <form onSubmit={ask} className="mt-4 border-t border-line pt-4">
            <label className="label" htmlFor="agent-input">
              Ask the agent
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="agent-input"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Why is Khayelitsha Site B short?"
                className="input"
              />
              <button type="submit" className="btn-primary !px-3" disabled={asking}>
                <Icon name="arrowRight" className="h-4 w-4" />
              </button>
            </div>
            {reply ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                {reply.reply}
                <div className="mt-2 flex items-center gap-2">
                  <span className="pill bg-white text-slate-500 ring-1 ring-line">
                    {reply.source}
                  </span>
                  {reply.actions[0] ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-brand-700"
                      onClick={() => navigate("/redistribution")}
                    >
                      Review action →
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </form>
        </section>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {forecast.slice(0, 3).map((row) => (
          <div key={`${row.clinic_id}-${row.drug_code}`} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-ink">{row.drug_name}</span>
              <RiskBadge risk={row.risk} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{row.reasoning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
