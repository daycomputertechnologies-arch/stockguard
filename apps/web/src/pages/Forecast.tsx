import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { num } from "../lib/format";
import type { Batch, Clinic, ForecastRow, Risk } from "../lib/types";
import { RiskBadge } from "../components/Badges";
import { Icon } from "../components/Icon";
import { TransferDialog } from "../components/TransferDialog";
import { EmptyState, ErrorNote, Loading, PageHeader } from "../components/ui";

const filters: { value: "all" | Risk; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High risk" },
  { value: "medium", label: "Watch" },
  { value: "low", label: "Healthy" },
];

export default function Forecast() {
  const [rows, setRows] = useState<ForecastRow[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [filter, setFilter] = useState<"all" | Risk>("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<{ batch: Batch; to: string; quantity: number } | null>(null);

  useEffect(() => {
    Promise.all([api.forecast(), api.batches(), api.clinics()])
      .then(([forecastData, batchData, clinicData]) => {
        setRows(forecastData.rows);
        setBatches(batchData);
        setClinics(clinicData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((row) => row.risk === filter)),
    [rows, filter],
  );

  const counts = useMemo(
    () => ({
      high: rows.filter((row) => row.risk === "high").length,
      medium: rows.filter((row) => row.risk === "medium").length,
      low: rows.filter((row) => row.risk === "low").length,
    }),
    [rows],
  );

  function clinicName(id: string | null): string {
    if (!id) return "—";
    return clinics.find((clinic) => clinic.clinic_id === id)?.name ?? id;
  }

  function startTransfer(row: ForecastRow) {
    const batch = batches.find((item) => item.batch_id === row.suggested_source_batch_id);
    if (!batch) return;
    setActive({ batch, to: row.clinic_id, quantity: row.suggested_qty });
  }

  return (
    <div>
      <PageHeader
        overline="AI demand forecast"
        title="Where stock runs out next"
        subtitle="On-hand stock against measured daily use, with the nearest surplus that fixes it."
      />

      {error ? <ErrorNote message={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            { key: "high", label: "High risk", tone: "red", note: "≤ 7 days of cover" },
            { key: "medium", label: "Watch", tone: "amber", note: "8–14 days" },
            { key: "low", label: "Healthy", tone: "emerald", note: "15+ days" },
          ] as const
        ).map((card) => (
          <div key={card.key} className="card p-5">
            <div className="label">{card.label}</div>
            <div className="mt-2 text-3xl font-bold text-ink">{counts[card.key]}</div>
            <div className="mt-1 text-xs text-slate-500">{card.note}</div>
          </div>
        ))}
      </div>

      <div className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`pill ${
                filter === option.value
                  ? "bg-ink text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">
            Rules-based with an agent fallback · Gemini-ready
          </span>
        </div>

        {loading ? (
          <Loading label="Forecasting" />
        ) : visible.length === 0 ? (
          <EmptyState title="Nothing in this band" message="Switch filter to see other rows." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="bg-slate-50/60">
                  <th className="table-head px-4 py-2.5">Clinic</th>
                  <th className="table-head px-4 py-2.5">Medicine</th>
                  <th className="table-head px-4 py-2.5 text-right">On hand</th>
                  <th className="table-head px-4 py-2.5 text-right">Daily use</th>
                  <th className="table-head px-4 py-2.5 text-right">Days left</th>
                  <th className="table-head px-4 py-2.5">Risk</th>
                  <th className="table-head px-4 py-2.5">Suggested source</th>
                  <th className="table-head px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={`${row.clinic_id}-${row.drug_code}`}
                    className="border-t border-line/80 hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-ink">{row.clinic_name}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{row.drug_name}</div>
                      <div className="text-[11px] text-slate-400">{row.drug_code}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{num(row.on_hand)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{row.daily_use}/day</td>
                    <td className="px-4 py-3 text-right font-semibold">{row.days_to_stockout}</td>
                    <td className="px-4 py-3">
                      <RiskBadge risk={row.risk} />
                    </td>
                    <td className="px-4 py-3">
                      {row.suggested_source_batch_id ? (
                        <div>
                          <div className="text-slate-600">
                            {clinicName(row.suggested_source_clinic_id)}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {row.suggested_source_batch_id}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">no surplus</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.suggested_qty > 0 ? (
                        <button
                          type="button"
                          className="btn-primary !px-2.5 !py-1.5 !text-xs"
                          onClick={() => startTransfer(row)}
                        >
                          Transfer {row.suggested_qty}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-start gap-2 border-t border-line bg-slate-50/60 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
          <Icon name="cpu" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Forecast = on-hand units ÷ measured daily use. Sources prefer the supplier whose batch
          expires soonest, so the transfer also cuts expiry waste.
        </div>
      </div>

      <TransferDialog
        open={active !== null}
        batch={active?.batch ?? null}
        toClinicId={active?.to ?? ""}
        initialQuantity={active?.quantity ?? 1}
        clinics={clinics}
        onClose={() => setActive(null)}
        onDone={() => {
          setActive(null);
          api.forecast().then((data) => setRows(data.rows)).catch(() => undefined);
        }}
      />
    </div>
  );
}
