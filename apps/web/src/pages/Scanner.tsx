import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api, ApiError } from "../lib/api";
import { dayMonth, num, zar } from "../lib/format";
import type { Batch, Clinic } from "../lib/types";
import { StatusBadge } from "../components/Badges";
import { Icon } from "../components/Icon";
import { TransferDialog } from "../components/TransferDialog";
import { VerifyButton } from "../components/VerifyButton";
import { EmptyState, ErrorNote, PageHeader, SectionTitle, TxLink } from "../components/ui";

const DEMO_BATCHES = ["BATCH-0001", "BATCH-0002", "BATCH-0009"];
const READER_ID = "stockguard-qr-reader";

export default function Scanner() {
  const [payload, setPayload] = useState("");
  const [batch, setBatch] = useState<Batch | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);

  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    api.clinics().then(setClinics).catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!batch) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(`stockguard://batch/${batch.batch_id}`, {
      margin: 1,
      width: 220,
      color: { dark: "#0B2545", light: "#FFFFFF" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [batch]);

  async function open(value: string) {
    setBusy(true);
    setError("");
    setFlagged(false);
    try {
      const result = await api.scan(value.trim());
      setBatch(result);
    } catch (err) {
      setBatch(null);
      setError(err instanceof ApiError ? err.message : "Could not read that code");
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setError("");
    handledRef.current = false;
    try {
      const host = document.getElementById(READER_ID);
      if (host) host.innerHTML = "";
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded) => {
          if (handledRef.current) return;
          handledRef.current = true;
          await scanner.stop().catch(() => undefined);
          setScanning(false);
          await open(decoded);
        },
        () => undefined,
      );
    } catch {
      setScanning(false);
      setError(
        "Camera unavailable. Paste the QR payload below, or open the batch directly from the demo list.",
      );
    }
  }

  async function stopCamera() {
    await scannerRef.current?.stop().catch(() => undefined);
    scannerRef.current?.clear();
    scannerRef.current = null;
    setScanning(false);
  }

  async function flagExpiry() {
    if (!batch) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.flagExpiry(batch.batch_id);
      setBatch(updated);
      setFlagged(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not flag the batch");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        overline="QR batch scanner"
        title="Scan a batch"
        subtitle="Scanning opens an existing batch — it never creates one, so a judge can never hit a dead end."
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="card p-5">
          <SectionTitle
            title="Camera"
            subtitle="Use a phone on the same network for the best demo."
            actions={
              scanning ? (
                <button type="button" className="btn-ghost !py-1.5" onClick={stopCamera}>
                  <Icon name="x" className="h-4 w-4" /> Stop
                </button>
              ) : (
                <button type="button" className="btn-dark !py-1.5" onClick={startCamera}>
                  <Icon name="scanner" className="h-4 w-4" /> Start camera
                </button>
              )
            }
          />
          <div className="px-5 pb-5">
            <div
              id={READER_ID}
              className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-slate-50 text-sm text-slate-400"
            >
              {scanning ? null : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <Icon name="scanner" className="h-9 w-9 text-slate-300" />
                  <span>Camera preview appears here</span>
                  <span className="text-[11px] text-slate-400">
                    The browser will ask for permission
                  </span>
                </div>
              )}
            </div>

            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (payload.trim()) void open(payload);
              }}
            >
              <input
                value={payload}
                onChange={(event) => setPayload(event.target.value)}
                placeholder="stockguard://batch/BATCH-0001"
                className="input font-mono !text-xs"
              />
              <button type="submit" className="btn-primary" disabled={busy || !payload.trim()}>
                Open
              </button>
            </form>

            <div className="mt-4">
              <div className="label mb-2">Demo codes</div>
              <div className="flex flex-wrap gap-2">
                {DEMO_BATCHES.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setPayload(`stockguard://batch/${id}`);
                      void open(`stockguard://batch/${id}`);
                    }}
                    className="pill bg-slate-100 font-mono text-slate-600 hover:bg-slate-200"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>

            {error ? <div className="mt-4"><ErrorNote message={error} /></div> : null}
          </div>
        </section>

        <section className="card">
          <SectionTitle title="Batch record" subtitle="Custody, expiry and on-chain proof." />
          {!batch ? (
            <EmptyState
              icon="inventory"
              title="Nothing scanned yet"
              message="Start the camera, paste a payload, or pick a demo code. The batch will appear here with its chain record."
            />
          ) : (
            <div className="px-5 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-ink">{batch.drug_name}</div>
                  <div className="font-mono text-xs text-slate-400">
                    {batch.drug_code} · {batch.batch_id}
                  </div>
                </div>
                <StatusBadge status={batch.status} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="label">On hand</dt>
                  <dd className="mt-1 text-xl font-bold text-ink">{num(batch.quantity)}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="label">Value</dt>
                  <dd className="mt-1 text-xl font-bold text-ink">{zar(batch.value)}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="label">Expiry</dt>
                  <dd className="mt-1 font-semibold text-ink">{dayMonth(batch.expiry)}</dd>
                  <dd className={`text-[11px] ${batch.days_to_expiry <= 30 ? "text-amber-600" : "text-slate-500"}`}>
                    in {batch.days_to_expiry} days
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="label">Clinic</dt>
                  <dd className="mt-1 font-semibold text-ink">
                    {clinics.find((clinic) => clinic.clinic_id === batch.clinic_id)?.name ??
                      batch.clinic_id}
                  </dd>
                  {batch.derived_from ? (
                    <dd className="text-[11px] text-slate-400">split from {batch.derived_from}</dd>
                  ) : null}
                </div>
              </dl>

              <div className="mt-3 flex items-center justify-between rounded-lg border border-line px-3 py-2 text-xs">
                <span className="text-slate-500">On-chain custody</span>
                <TxLink hash={batch.tx_hash} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <VerifyButton batchId={batch.batch_id} />
                <button
                  type="button"
                  className="btn-ghost !py-1.5"
                  onClick={flagExpiry}
                  disabled={busy || flagged}
                >
                  <Icon name="clock" className="h-4 w-4" />
                  {flagged ? "Flagged on chain" : "Flag near expiry"}
                </button>
                <button
                  type="button"
                  className="btn-primary !py-1.5"
                  onClick={() => setTransferOpen(true)}
                >
                  <Icon name="share" className="h-4 w-4" />
                  Move stock
                </button>
              </div>

              {qr ? (
                <div className="mt-5 flex items-center gap-4 rounded-xl border border-line bg-slate-50 p-3">
                  <img src={qr} alt={`QR for ${batch.batch_id}`} className="h-24 w-24 rounded-lg bg-white" />
                  <div className="text-xs text-slate-500">
                    <div className="font-semibold text-ink">Printable batch QR</div>
                    <p className="mt-1">
                      Print this and scan it with a phone on stage. Payload:
                    </p>
                    <code className="mt-1 block break-all text-[10px] text-brand-700">
                      stockguard://batch/{batch.batch_id}
                    </code>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <TransferDialog
        open={transferOpen}
        batch={batch}
        toClinicId={clinics.find((clinic) => clinic.clinic_id !== batch?.clinic_id)?.clinic_id ?? ""}
        initialQuantity={Math.min(batch?.quantity ?? 1, 40)}
        clinics={clinics}
        onClose={() => setTransferOpen(false)}
        onDone={(transfer) => {
          setBatch((current) =>
            current ? { ...current, tx_hash: transfer.tx_hash } : current,
          );
        }}
      />
    </div>
  );
}
