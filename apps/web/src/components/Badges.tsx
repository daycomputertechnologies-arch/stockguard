import type { BatchStatus, Risk } from "../lib/types";
import { Icon } from "./Icon";

const riskStyles: Record<Risk, string> = {
  high: "bg-red-50 text-red-600 ring-1 ring-red-100",
  medium: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  low: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
};

export function RiskBadge({ risk, label }: { risk: Risk; label?: string }) {
  return (
    <span className={`pill ${riskStyles[risk]}`}>
      {risk === "high" ? (
        <Icon name="alert" className="h-3.5 w-3.5" />
      ) : risk === "medium" ? (
        <Icon name="warn" className="h-3.5 w-3.5" />
      ) : (
        <Icon name="check" className="h-3.5 w-3.5" />
      )}
      {label ?? risk}
    </span>
  );
}

const statusStyles: Record<BatchStatus, string> = {
  registered: "bg-slate-100 text-slate-600",
  in_transit: "bg-sky-50 text-sky-600 ring-1 ring-sky-100",
  dispensed: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
  recalled: "bg-red-50 text-red-600 ring-1 ring-red-100",
};

export function StatusBadge({ status }: { status: BatchStatus }) {
  return (
    <span className={`pill ${statusStyles[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export function ChainBadge({ mode }: { mode: string }) {
  const fake = mode !== "fuji";
  return (
    <span
      className={`pill ${fake ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100" : "bg-brand-50 text-brand-700 ring-1 ring-brand-100"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${fake ? "bg-amber-500" : "bg-brand-500"}`} />
      {fake ? "demo chain" : "avalanche fuji"}
    </span>
  );
}
