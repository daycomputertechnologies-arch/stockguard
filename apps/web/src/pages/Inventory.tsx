import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { dayMonth, num, zar } from "../lib/format";
import type { Batch, Clinic, Drug } from "../lib/types";
import { StatusBadge } from "../components/Badges";
import { Icon } from "../components/Icon";
import { TransferDialog } from "../components/TransferDialog";
import { VerifyButton } from "../components/VerifyButton";
import { EmptyState, ErrorNote, Loading, PageHeader, TxLink } from "../components/ui";

const statuses = ["all", "registered", "in_transit", "dispensed", "recalled"] as const;

export default function Inventory() {
  const [params, setParams] = useSearchParams();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState<string>("all");
  const [clinic, setClinic] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<Batch | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.batches({
        q: params.get("q") ?? undefined,
        status: status === "all" ? undefined : status,
        clinic_id: clinic === "all" ? undefined : clinic,
      }),
      api.clinics(),
      api.drugs(),
    ])
      .then(([batchData, clinicData, drugData]) => {
        setBatches(batchData);
        setClinics(clinicData);
        setDrugs(drugData);
        setError("");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [params, status, clinic]);

  const totals = useMemo(
    () => ({
      units: batches.reduce((sum, batch) => sum + batch.quantity, 0),
      value: batches.reduce((sum, batch) => sum + batch.value, 0),
    }),
    [batches],
  );

  function search(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (query) next.set("q", query);
    else next.delete("q");
    setParams(next);
  }

  return (
    <div>
      <PageHeader
        overline="Inventory"
        title="Batch register"
        subtitle="Every batch carries a clinic, an expiry and an on-chain custody record."
        actions={
          <button type="button" className="btn-primary" onClick={() => setRegisterOpen(true)}>
            <Icon name="plus" className="h-4 w-4" />
            Register batch
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <form onSubmit={search} className="relative min-w-[220px] flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search batch, medicine or code"
              className="input !pl-9"
            />
          </form>
          <select value={clinic} onChange={(event) => setClinic(event.target.value)} className="input !w-auto">
            <option value="all">All clinics</option>
            {clinics.map((item) => (
              <option key={item.clinic_id} value={item.clinic_id}>
                {item.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1">
            {statuses.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={`pill ${
                  status === option
                    ? "bg-ink text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {option.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500">
          <span>
            {batches.length} batches · {num(totals.units)} units · {zar(totals.value, true)} on hand
          </span>
          <button type="button" className="font-semibold text-brand-700" onClick={load}>
            Refresh
          </button>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorNote message={error} />
        ) : batches.length === 0 ? (
          <EmptyState
            title="No batches match"
            message="Try a different search, clinic or status."
            action={
              <button type="button" className="btn-ghost" onClick={() => setStatus("all")}>
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-t border-line text-sm">
              <thead>
                <tr className="bg-slate-50/60">
                  <th className="table-head px-4 py-2.5">Batch</th>
                  <th className="table-head px-4 py-2.5">Medicine</th>
                  <th className="table-head px-4 py-2.5">Clinic</th>
                  <th className="table-head px-4 py-2.5 text-right">Units</th>
                  <th className="table-head px-4 py-2.5 text-right">Value</th>
                  <th className="table-head px-4 py-2.5">Expiry</th>
                  <th className="table-head px-4 py-2.5">Status</th>
                  <th className="table-head px-4 py-2.5">Tx</th>
                  <th className="table-head px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => {
                  const clinicName =
                    clinics.find((item) => item.clinic_id === batch.clinic_id)?.name ??
                    batch.clinic_id;
                  const tone =
                    batch.days_to_expiry <= 14
                      ? "text-red-600"
                      : batch.days_to_expiry <= 30
                        ? "text-amber-600"
                        : "text-slate-500";
                  return (
                    <tr key={batch.batch_id} className="border-t border-line/80 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-ink">{batch.batch_id}</div>
                        {batch.derived_from ? (
                          <div className="text-[10px] text-slate-400">from {batch.derived_from}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{batch.drug_name}</div>
                        <div className="text-[11px] text-slate-400">{batch.drug_code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{clinicName}</td>
                      <td className="px-4 py-3 text-right font-semibold">{num(batch.quantity)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{zar(batch.value)}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-600">{dayMonth(batch.expiry)}</div>
                        <div className={`text-[11px] ${tone}`}>{batch.days_to_expiry} days</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="px-4 py-3">
                        <TxLink hash={batch.tx_hash} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <VerifyButton batchId={batch.batch_id} compact />
                          <button
                            type="button"
                            className="btn-ghost !px-2 !py-1"
                            onClick={() => setActive(batch)}
                            title="Move stock"
                          >
                            <Icon name="share" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TransferDialog
        open={active !== null}
        batch={active}
        toClinicId={clinics.find((item) => item.clinic_id !== active?.clinic_id)?.clinic_id ?? ""}
        initialQuantity={Math.min(active?.quantity ?? 1, 40)}
        clinics={clinics}
        onClose={() => setActive(null)}
        onDone={load}
      />

      {registerOpen ? (
        <RegisterDialog
          drugs={drugs}
          clinics={clinics}
          onClose={() => setRegisterOpen(false)}
          onDone={() => {
            setRegisterOpen(false);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function RegisterDialog({
  drugs,
  clinics,
  onClose,
  onDone,
}: {
  drugs: Drug[];
  clinics: Clinic[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [drugCode, setDrugCode] = useState(drugs[0]?.drug_code ?? "");
  const [clinicId, setClinicId] = useState(clinics[0]?.clinic_id ?? "");
  const [quantity, setQuantity] = useState(100);
  const [expiry, setExpiry] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 8);
    return date.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const stamp = Date.now().toString().slice(-4);
      await api.createBatch({
        batch_id: `BATCH-${stamp}`,
        drug_code: drugCode,
        clinic_id: clinicId,
        quantity,
        expiry: `${expiry}T00:00:00Z`,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register the batch");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/50" />
      <form onSubmit={submit} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-float">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Register a batch</h2>
          <button type="button" onClick={onClose} className="btn-ghost !px-2 !py-1">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <div className="label">Medicine</div>
            <select value={drugCode} onChange={(event) => setDrugCode(event.target.value)} className="input mt-1">
              {drugs.map((drug) => (
                <option key={drug.drug_code} value={drug.drug_code}>
                  {drug.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">Clinic</div>
            <select value={clinicId} onChange={(event) => setClinicId(event.target.value)} className="input mt-1">
              {clinics.map((clinic) => (
                <option key={clinic.clinic_id} value={clinic.clinic_id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Quantity</div>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="input mt-1"
              />
            </div>
            <div>
              <div className="label">Expiry</div>
              <input
                type="date"
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
                className="input mt-1"
              />
            </div>
          </div>
        </div>
        {error ? <div className="mt-3 text-xs text-red-600">{error}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Registering…" : "Register on chain"}
          </button>
        </div>
      </form>
    </div>
  );
}
