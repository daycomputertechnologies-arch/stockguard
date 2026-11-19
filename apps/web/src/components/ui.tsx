import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { shortHash, txUrl } from "../lib/format";

export function PageHeader({
  overline,
  title,
  subtitle,
  actions,
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) 
{
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {overline ? <div className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-brand-700">{overline}</div> : null}
        <h1 className="text-[26px] font-bold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function TxLink({ hash, className = "" }: { hash: string | null | undefined; className?: string }) {
  const url = txUrl(hash);
  if (!hash || !url) {
    return <span className={`text-xs text-slate-400 ${className}`}>not on chain</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 font-mono text-xs text-brand-700 hover:underline ${className}`}
      title={hash}
    >
      {shortHash(hash)}
      <Icon name="link" className="h-3 w-3" />
    </a>
  );
}

export function EmptyState({
  icon = "inventory",
  title,
  message,
  action,
}: {
  icon?: Parameters<typeof Icon>[0]["name"];
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      <p className="max-w-sm text-xs text-slate-500">{message}</p>
      {action}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-10 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-r-transparent" />
      {label}…
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="m-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}
