import { useEffect, useState } from "react";
import { api, getToken, setToken } from "../lib/api";
import { num } from "../lib/format";
import type { Batch, Health } from "../lib/types";
import { ChainBadge } from "../components/Badges";
import { Icon } from "../components/Icon";
import { ErrorNote, PageHeader, SectionTitle, TxLink } from "../components/ui";

export default function Settings() {
  const [health, setHealth] = useState<Health | null>(null);
  const [token, setTokenValue] = useState(getToken());
  const [saved, setSaved] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState("BATCH-0001");
  const [quantity, setQuantity] = useState(9999);
  const [demoNote, setDemoNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.health().then(setHealth).catch((err: Error) => setError(err.message));
    api.batches().then(setBatches).catch(() => undefined);
  }, []);

  async function tamper() {
    setDemoNote("");
    setError("");
    try {
      await api.tamper(batchId, quantity);
      setDemoNote(
        `${batchId} set to ${quantity} units in SQLite only. Open Inventory and hit Verify to show the mismatch.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tamper failed");
    }
  }

  return (
    <div>
      <PageHeader
        overline="Settings"
        title="Runtime and demo controls"
        subtitle="The token, the chain connection, and the switch that proves the audit trail is real."
      />

      {error ? <ErrorNote message={error} /> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card">
          <SectionTitle title="Connection" subtitle="Read straight from /api/health" />
          <div className="space-y-3 px-5 pb-5">
            <Row label="API status" value={health?.status ?? "…"} />
            <Row label="Database" value={health?.db ?? "…"} />
            <Row label="Seed data" value={health?.seed ?? "…"} />
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">Chain</span>
              <ChainBadge mode={health?.chain ?? "fake"} />
            </div>
            <Row label="Chain id" value={health?.chain_id ? String(health.chain_id) : "—"} />
            <Row label="Contract" value={health?.contract ?? "not deployed"} mono />
            <Row label="API base" value={import.meta.env.VITE_API_BASE ?? "/api"} mono />
          </div>
        </section>

        <section className="card">
          <SectionTitle title="Write access" subtitle="The X-Demo-Token header used by every write" />
          <div className="space-y-3 px-5 pb-5">
            <div>
              <div className="label">Demo token</div>
              <div className="mt-1 flex gap-2">
                <input
                  value={token}
                  onChange={(event) => {
                    setTokenValue(event.target.value);
                    setSaved(false);
                  }}
                  className="input font-mono !text-xs"
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setToken(token);
                    setSaved(true);
                  }}
                >
                  Save
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Stored in localStorage for the demo only. Never ship a real key to the browser —
                the backend signer owns the chain key.
              </p>
              {saved ? (
                <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                  <Icon name="check" className="h-3.5 w-3.5" /> Token updated
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <section className="card mt-5">
        <SectionTitle
          title="Tamper demo"
          subtitle="Edit the database without touching the chain, then watch Verify catch it"
          actions={
            <span className="pill bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <Icon name="warn" className="h-3.5 w-3.5" />
              demo endpoints only
            </span>
          }
        />
        <div className="flex flex-wrap items-end gap-3 px-5 pb-5">
          <div className="min-w-[200px]">
            <div className="label">Batch</div>
            <select value={batchId} onChange={(event) => setBatchId(event.target.value)} className="input mt-1">
              {batches.map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_id} · {batch.drug_name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <div className="label">Set quantity</div>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="input mt-1"
            />
          </div>
          <button type="button" className="btn-dark" onClick={tamper}>
            <Icon name="warn" className="h-4 w-4" />
            Tamper the row
          </button>
        </div>
        {demoNote ? (
          <div className="mx-5 mb-5 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {demoNote}
          </div>
        ) : null}
        <div className="border-t border-line bg-slate-50/60 px-5 py-3 text-[11px] leading-relaxed text-slate-500">
          This only works when <span className="font-mono">ALLOW_DEMO_ENDPOINTS=true</span>. Disable
          it for production. The chain mirror keeps the original quantity, so{" "}
          <span className="font-mono">GET /batches/:id/verify</span> returns a mismatch and writes a{" "}
          <span className="font-mono">tampered</span> event.
        </div>
      </section>

      <section className="card mt-5">
        <SectionTitle title="Chain artefacts" subtitle="What the backend is writing against" />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="label">Operator</div>
            <div className="mt-1 font-mono text-xs text-ink">{health?.contract ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="label">Explorer</div>
            <div className="mt-1 text-xs">
              <a
                href={import.meta.env.VITE_EXPLORER_BASE ?? "https://testnet.snowtrace.io"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
              >
                Snowtrace Fuji <Icon name="link" className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-line px-5 py-3 text-[11px] text-slate-500">
          Seeded batches have no transaction hash by design; the live demo path creates the first
          real ones. {num(batches.length)} batches loaded.
          <div className="mt-1">
            Latest: <TxLink hash={batches[0]?.tx_hash} />
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-semibold text-ink ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
