import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { num, relativeTime } from "../lib/format";
import type { Batch, Clinic, ForecastRow, Transfer } from "../lib/types";
import { RiskBadge } from "../components/Badges";
import { Icon } from "../components/Icon";
import { TransferDialog } from "../components/TransferDialog";
import { EmptyState, ErrorNote, Loading, PageHeader, TxLink } from "../components/ui";

export default function Redistribution() {
  const location = useLocation();
  const focus = (location.state as { focus?: string } | null)?.focus;
  const [rows, setRows] = useState<ForecastRow[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<{ batch: Batch; to: string; quantity: number } | null>(null);

  function load() {
    Promise.all([api.forecast(), api.batches(), api.transfers(), api.clinics()])
      .then(([forecastData, batchData, transferData, clinicData]) => {
        setRows(forecastData.rows);
        setBatches(batchData);
        setTransfers(transferData);
        setClinics(clinicData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const candidates = useMemo(
    () =>
      rows
        .filter((row) => row.suggested_source_batch_id && row.suggested_qty > 0)
        .sort((a, b) => (focus && b.drug_code === focus ? 1 : 0) - (focus && a.drug_code === focus ? 1 : 0))
        .slice(0, 6),
    [rows, focus],
  );

  function startTransfer(row: ForecastRow) {
    const batch = batches.find((item) => item.batch_id === row.suggested_source_batch_id);
    if (!batch) return;
    setActive({ batch, to: row.clinic_id, quantity: row.suggested_qty });
  }

  return (
    <div>
      <PageHeader
        overline="Smart redistribution"
        title="Move stock before it dies"
        subtitle="Each suggestion pairs a clinic at risk with the nearest batch that should leave first."
      />

      {error ? <ErrorNote message={error} /> : null}

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold text-ink">Suggested moves</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Ranked by stockout risk, then by expiry pressure on the source batch.
            </p>
          </div>

          {loading ? (
            <Loading label="Building suggestions" />
          ) : candidates.length === 0 ? (
            <EmptyState
              icon="check"
              title="Network balanced"
              message="No transfer is needed right now. This is what good looks like."
            />
          ) : (
            <ul className="divide-y divide-line">
              {candidates.map((row) => (
                <li key={`${row.clinic_id}-${row.drug_code}`} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      row.risk === "high"
                        ? "bg-red-50 text-red-500"
                        : row.risk === "medium"
                          ? "bg-amber-50 text-amber-500"
                          : "bg-emerald-50 text-emerald-500"
                    }`}
                  >
                    <Icon name={row.risk === "high" ? "alert" : "share"} className="h-5 w-5" />
                  </span>
                  <div className="min-w-[180px] flex-1">
                    <div className="text-sm font-semibold text-ink">
                      {row.drug_name} → {row.clinic_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {num(row.on_hand)} on hand · {row.days_to_stockout} days left · from{" "}
                      {row.suggested_source_batch_id}
                    </div>
                  </div>
                  <RiskBadge risk={row.risk} />
                  <div className="text-right">
                    <div className="text-sm font-bold text-ink">{row.suggested_qty} units</div>
                    <div className="text-[11px] text-slate-400">covers 14 days</div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary !py-1.5"
                    onClick={() => startTransfer(row)}
                  >
                    Move
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-line bg-slate-50/60 px-5 py-3 text-[11px] leading-relaxed text-slate-500">
            A partial move splits the batch on chain: <span className="font-mono">BATCH-0003</span>{" "}
            keeps its remainder, <span className="font-mono">BATCH-0003-T1</span> carries the units
            that moved.
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Recent transfers</h2>
              <p className="mt-0.5 text-xs text-slate-500">Custody history across the network.</p>
            </div>
            <Link to="/audit" className="text-xs font-semibold text-brand-700">
              Full trail
            </Link>
          </div>
          {loading ? (
            <Loading />
          ) : transfers.length === 0 ? (
            <EmptyState icon="share" title="No transfers yet" message="Approved moves appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {transfers.map((transfer) => (
                <li key={transfer.transfer_id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-ink">
                      {transfer.derived_batch_id ?? transfer.batch_id}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {relativeTime(transfer.created_at)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {num(transfer.quantity)} units · {transfer.from_clinic_id} → {transfer.to_clinic_id}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="pill bg-slate-100 text-[10px] text-slate-500">
                      {transfer.reason.replace("_", " ")}
                    </span>
                    <TxLink hash={transfer.tx_hash} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
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
          load();
        }}
      />
    </div>
  );
}
