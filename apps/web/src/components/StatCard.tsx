import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Tone = "brand" | "amber" | "red" | "violet" | "sky" | "emerald";

const tones: Record<Tone, { box: string; bar: string }> = {
  brand: { box: "bg-brand-50 text-brand-600", bar: "bg-brand-500" },
  amber: { box: "bg-amber-50 text-amber-500", bar: "bg-amber-400" },
  red: { box: "bg-red-50 text-red-500", bar: "bg-red-400" },
  violet: { box: "bg-violet-50 text-violet-500", bar: "bg-violet-400" },
  sky: { box: "bg-sky-50 text-sky-500", bar: "bg-sky-400" },
  emerald: { box: "bg-emerald-50 text-emerald-500", bar: "bg-emerald-500" },
};

interface Props {
  label: string;
  value: ReactNode;
  icon: IconName;
  tone?: Tone;
  footnote?: ReactNode;
  progress?: number;
}

export function StatCard({ label, value, icon, tone = "brand", footnote, progress }: Props) {
  const style = tones[tone];
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${style.box}`}>
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </div>
        <span className="label leading-tight">{label}</span>
      </div>
      <div className="mt-4 text-[30px] font-bold leading-none tracking-tight">{value}</div>
      {footnote ? <div className="mt-2.5 text-xs text-slate-500">{footnote}</div> : null}
      {progress !== undefined ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${style.bar}`}
            style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
