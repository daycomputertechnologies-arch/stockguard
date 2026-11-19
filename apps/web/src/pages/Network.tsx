import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { num } from "../lib/format";
import type { Batch, Clinic, ForecastRow } from "../lib/types";
import { Icon } from "../components/Icon";
import { EmptyState, ErrorNote, Loading, PageHeader } from "../components/ui";

export default function Network() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [forecast, setForecast] = useState<ForecastRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.clinics(), api.batches(), api.forecast()])
      .then(([clinicData, batchData, forecastData]) => {
        setClinics(clinicData);
        setBatches(batchData);
        setForecast(forecastData.rows);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const map = new Map<string, { units: number; risk: number; expiring: number }>();
    for (const clinic of clinics) {
      map.set(clinic.clinic_id, { units: 0, risk: 0, expiring: 0 });
    }
    for (const batch of batches) {
      const entry = map.get(batch.clinic_id);
      if (!entry) continue;
      entry.units += batch.quantity;
      if (batch.days_to_expiry <= 30) entry.expiring += batch.quantity;
    }
    for (const row of forecast) {
      if (row.risk !== "low") {
        const entry = map.get(row.clinic_id);
        if (entry) entry.risk += 1;
      }
    }
    return map;
  }, [clinics, batches, forecast]);

  const points = useMemo(() => {
    const located = clinics.filter(
      (clinic) => clinic.lat !== null && clinic.lng !== null,
    );
    if (located.length === 0) return [];
    const lats = located.map((clinic) => clinic.lat as number);
    const lngs = located.map((clinic) => clinic.lng as number);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return located.map((clinic) => {
      const x = 40 + (((clinic.lng as number) - minLng) / (maxLng - minLng || 1)) * 520;
      const y = 30 + ((maxLat - (clinic.lat as number)) / (maxLat - minLat || 1)) * 260;
      const entry = stats.get(clinic.clinic_id);
      return {
        clinic,
        x,
        y,
        units: entry?.units ?? 0,
        risk: entry?.risk ?? 0,
      };
    });
  }, [clinics, stats]);

  if (loading) return <Loading label="Mapping the network" />;
  if (error) return <ErrorNote message={error} />;

  return (
    <div>
      <PageHeader
        overline="Clinic network"
        title="Cape Metro coverage"
        subtitle="Twelve facilities sharing stock. Red points carry an open stockout or expiry risk."
      />

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Network map</h2>
              <p className="text-xs text-slate-500">Cape Town metro · indicative positions</p>
            </div>
            <span className="pill bg-slate-100 text-slate-500">
              <Icon name="map" className="h-3.5 w-3.5" />
              {clinics.length} clinics
            </span>
          </div>

          {points.length === 0 ? (
            <EmptyState icon="map" title="No coordinates" message="Seed clinic coordinates to draw the map." />
          ) : (
            <svg viewBox="0 0 600 320" className="mt-4 w-full rounded-xl bg-[#EAF2F3]">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0H0V40" fill="none" stroke="#D9E6E8" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="600" height="320" fill="url(#grid)" />
              <path
                d="M30 300 C 150 250, 180 210, 260 190 S 420 150, 570 60"
                fill="none"
                stroke="#C8DDE0"
                strokeWidth="10"
                strokeLinecap="round"
              />
              {points.map((point) => (
                <g
                  key={point.clinic.clinic_id}
                  onClick={() => setSelected(point.clinic.clinic_id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={point.risk > 0 ? 11 : 8}
                    fill={point.risk > 0 ? "#EF4444" : "#0D9488"}
                    opacity={selected && selected !== point.clinic.clinic_id ? 0.35 : 0.9}
                  />
                  {point.risk > 0 ? (
                    <circle cx={point.x} cy={point.y} r="17" fill="none" stroke="#EF4444" strokeWidth="1.5" opacity="0.4" />
                  ) : null}
                  <text
                    x={point.x}
                    y={point.y - 16}
                    textAnchor="middle"
                    style={{ fontSize: 10 }}
                    className="fill-slate-600"
                  >
                    {point.clinic.name.replace(" CHC", "")}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold text-ink">Facilities</h2>
            <p className="text-xs text-slate-500">Units on hand and open risks per clinic.</p>
          </div>
          <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
            {clinics.map((clinic) => {
              const entry = stats.get(clinic.clinic_id);
              const active = selected === clinic.clinic_id;
              return (
                <li
                  key={clinic.clinic_id}
                  onClick={() => setSelected(clinic.clinic_id)}
                  className={`cursor-pointer px-5 py-3 transition ${active ? "bg-brand-50/60" : "hover:bg-slate-50"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-ink">{clinic.name}</div>
                      <div className="text-[11px] text-slate-400">{clinic.district}</div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-sm font-bold text-ink">{num(entry?.units ?? 0)}</div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">units</div>
                      </div>
                      <div>
                        <div
                          className={`text-sm font-bold ${(entry?.risk ?? 0) > 0 ? "text-red-500" : "text-emerald-500"}`}
                        >
                          {entry?.risk ?? 0}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">risks</div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
