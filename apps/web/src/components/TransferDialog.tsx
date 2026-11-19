import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { num, txUrl } from "../lib/format";
import type { Batch, Clinic, Transfer, TransferReason } from "../lib/types";
import { Icon } from "./Icon";
import { TxLink } from "./ui";

interface Props {
  open: boolean;
  batch: Batch | null;
  toClinicId: string;
  initialQuantity: number;
  clinics: Clinic[];
  onClose: () => void;
  onDone: (transfer: Transfer) => void;
}

const reasons: { value: TransferReason; label: string }[] = [
  { value: "stockout_risk", label: "Stockout risk" },
  { value: "near_expiry", label: "Near expiry" },
  { value: "rebalance", label: "Rebalance" },
  { value: "recall", label: "Recall" },
];

export function TransferDialog({
  open,
  batch,
  toClinicId,
  initialQuantity,
  clinics,
  onClose,
  onDone,
}: Props) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [reason, setReason] = useState<TransferReason>("stockout_risk");
  const [destination, setDestination] = useState(toClinicId);
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Transfer | null>(null);

  useEffect(() => {
    if (open) {
      setQuantity(initialQuantity);
      setReason("stockout_risk");
      setDestination(toClinicId);
      setState("idle");
      setError("");
      setResult(null);
    }
  }, [open, initialQuantity, toClinicId]);

  if (!open || !batch) return null;

  const destinationName =
    clinics.find((clinic) => clinic.clinic_id === destination)?.name ?? destination;
  const sourceName =
    clinics.find((clinic) => clinic.clinic_id === batch.clinic_id)?.name ?? batch.clinic_id;
  const preview = batch.derived_from ? batch.batch_id : `${batch.batch_id}-T?`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");
    setError("");
    try {
      const transfer = await api.createTransfer({
        batch_id: batch!.batch_id,
        to_clinic_id: destination,
        quantity,
        reason,
      });
      setResult(transfer);
      setState("done");
      onDone(transfer);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transfer failed");
      setState("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-float">
        <div className="flex items-start justify-between">
          <div>
            <div className="label">Confirm transfer</div>
            <h2 className="mt-1 text-lg font-bold text-ink">
              {batch.drug_name}
              <span className="ml-2 font-mono text-xs font-medium text-slate-400">
                {batch.batch_id}
              </span>
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost !px-2 !py-1">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {state === "done" && result ? (
          <div className="mt-5">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Icon name="check" className="h-4 w-4" />
                Custody moved on chain
              </div>
              <p className="mt-1 text-xs text-emerald-700/80">
                {num(result.quantity)} units {sourceName} → {destinationName}. The chain split the
                batch so the source keeps the remainder.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="label">Derived batch</div>
                  <div className="mt-0.5 font-mono text-ink">
                    {result.derived_batch_id ?? "whole batch moved"}
                  </div>
                </div>
                <div>
                  <div className="label">Transaction</div>
                  <div className="mt-0.5">
                    <TxLink hash={result.tx_hash} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              {txUrl(result.tx_hash) ? (
                <a
                  href={txUrl(result.tx_hash)!}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost"
                >
                  <Icon name="link" className="h-4 w-4" />
                  Explorer
                </a>
              ) : null}
              <button type="button" className="btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="label">From</div>
                <div className="mt-1 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm">
                  {sourceName}
                </div>
              </div>
              <div>
                <div className="label">To</div>
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  className="input mt-1"
                >
                  {clinics
                    .filter((clinic) => clinic.clinic_id !== batch.clinic_id)
                    .map((clinic) => (
                      <option key={clinic.clinic_id} value={clinic.clinic_id}>
                        {clinic.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="label">Quantity (on hand: {num(batch.quantity)})</div>
                <input
                  type="number"
                  min={1}
                  max={batch.quantity}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="input mt-1"
                />
              </div>
              <div>
                <div className="label">Reason</div>
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value as TransferReason)}
                  className="input mt-1"
                >
                  {reasons.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Partial moves split the batch into <span className="font-mono">{preview}</span> at the
              destination, leaving the remainder with the source. The backend signs the transaction;
              no wallet popup.
            </div>

            {error ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={state === "saving"}>
                <Icon name="share" className="h-4 w-4" />
                {state === "saving" ? "Moving on chain…" : "Confirm transfer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
