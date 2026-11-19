import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { dayMonth, num, zar } from "../lib/format";
import type { Batch, Clinic, ForecastRow, Impact } from "../lib/types";
import { Icon } from "../components/Icon";
import { ErrorNote, Loading, PageHeader, SectionTitle, TxLink } from "../components/ui";
import { StatCard } from "../components/StatCard";

export default function Reports() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [forecast, setForecast] = useState<ForecastRow[]>([]);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.batches(), api.clinics(), api.forecast(), api.impact()])
      .then(([batchData, clinicData, forecastData, impactData]) => {
        setBatches(batchData);
        setClinics(clinicData);
        setForecast(forecastData.rows);
        setImpact(impactData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const byClinic = useMemo(() => {
    const map = new Map<string, { units: number; value: number; risk: number }>();
    for (const clinic of clinics) map.set(clinic.clinic_id, { units: 0, value: 0, risk: 0 });
    for (const batch of batches) {
      const entry = map.get(batch.clinic_id);
      if (!entry) continue;
      entry.units += batch.quantity;
      entry.value += batch.value;
    }
    for (const row of forecast) {
      if (row.risk === "high") {
        const entry = map.get(row.clinic_id);
        if (entry) entry.risk += 1;
      }
    }
    return clinics
      .map((clinic) => ({
        clinic,
        ...(map.get(clinic.clinic_id) ?? { units: 0, value: 0, risk: 0 }),
      }))
      .sort((a, b) => b.units - a.units);
  }, [clinics, batches, forecast]);

  const byDrug = useMemo(() => {
    const map = new Map<string, { name: string; units: number; value: number; batches: number }>();
    for (const batch of batches) {
      const entry = map.get(batch.drug_code) ?? {
        name: batch.drug_name,
        units: 0,
        value: 0,
        batches: 0,
      };
      entry.units += batch.quantity;
      entry.value += batch.value;
      entry.batches += 1;
      map.set(batch.drug_code, entry);
    }
    return Array.from(map.entries())
      .map(([code, entry]) => ({ code, ...entry }))
      .sort((a, b) => b.value - a.value);
  }, [batches]);

  const expiring = useMemo(
    () =>
      [...batches]
        .filter((batch) => batch.quantity > 0)
        .sort((a, b) => a.days_to_expiry - b.days_to_expiry)
        .slice(0, 8),
    [batches],
  );

  const maxUnits = Math.max(...byClinic.map((entry) => entry.units), 1);

  if (loading) return <Loading label="Building the report" />;
  if (error) return <ErrorNote message={error} />;

  return (
    <div>
      <PageHeader
        overline="Reports & analytics"
        title="Network position"
        subtitle="Every number on this page is derived from the live batch table, never hardcoded."
      />

      {impact ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Units in stock" value={num(impact.units_in_stock)} icon="inventory" />
          <StatCard
            label="Value at risk"
            value={zar(impact.value_at_risk, true)}
            icon="clock"
            tone="amber"
          />
          <StatCard
            label="Stockout risks"
            value={impact.predicted_stockouts}
            icon="alert"
            tone="red"
          />
          <StatCard
            label="Value redirected"
            value={zar(impact.value_redirected, true)}
            icon="shield"
            tone="emerald"
          />
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="card">
          <SectionTitle title="Units on hand by clinic" subtitle="Largest holdings first" />
          <div className="space-y-2.5 px-5 pb-5">
            {byClinic.map((entry) => (
              <div key={entry.clinic.clinic_id} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs text-slate-600">
                  {entry.clinic.name.replace(" CHC", "")}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(entry.units / maxUnits) * 100}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs font-semibold text-ink">
                  {num(entry.units)}
                </span>
                {entry.risk > 0 ? (
                  <span className="pill bg-red-50 text-[10px] text-red-500">{entry.risk} risk</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <SectionTitle title="Stock by medicine" subtitle="Value on hand" />
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/60">
                <th className="table-head px-5 py-2.5">Medicine</th>
                <th className="table-head px-5 py-2.5 text-right">Units</th>
                <th className="table-head px-5 py-2.5 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {byDrug.map((entry) => (
                <tr key={entry.code} className="border-t border-line/80">
                  <td className="px-5 py-2.5">
                    <div className="text-ink">{entry.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {entry.batches} batches · {entry.code}
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-right">{num(entry.units)}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{zar(entry.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <SectionTitle
          title="Expiring first"
          subtitle="Work left to right — this queue feeds Smart Redistribution"
          actions={
            <span className="pill bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <Icon name="clock" className="h-3.5 w-3.5" />
              next 8 batches
            </span>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-slate-50/60">
                <th className="table-head px-5 py-2.5">Batch</th>
                <th className="table-head px-5 py-2.5">Medicine</th>
                <th className="table-head px-5 py-2.5">Clinic</th>
                <th className="table-head px-5 py-2.5 text-right">Units</th>
                <th className="table-head px-5 py-2.5">Expires</th>
                <th className="table-head px-5 py-2.5">Tx</th>
              </tr>
            </thead>
            <tbody>
              {expiring.map((batch) => (
                <tr key={batch.batch_id} className="border-t border-line/80">
                  <td className="px-5 py-2.5 font-mono text-xs">{batch.batch_id}</td>
                  <td className="px-5 py-2.5">{batch.drug_name}</td>
                  <td className="px-5 py-2.5 text-slate-600">
                    {clinics.find((clinic) => clinic.clinic_id === batch.clinic_id)?.name ??
                      batch.clinic_id}
                  </td>
                  <td className="px-5 py-2.5 text-right">{num(batch.quantity)}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className={
                        batch.days_to_expiry <= 14
                          ? "text-red-600"
                          : batch.days_to_expiry <= 30
                            ? "text-amber-600"
                            : "text-slate-500"
                      }
                    >
                      {dayMonth(batch.expiry)} · {batch.days_to_expiry}d
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <TxLink hash={batch.tx_hash} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
