const EXPLORER = (import.meta.env.VITE_EXPLORER_BASE ?? "https://testnet.snowtrace.io").replace(
  /\/$/,
  "",
);

export function zar(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return `R${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function num(value: number): string {
  return new Intl.NumberFormat("en-ZA").format(value);
}

export function shortHash(hash: string | null | undefined): string {
  if (!hash) return "—";
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export function txUrl(hash: string | null | undefined): string | null {
  if (!hash) return null;
  return `${EXPLORER}/tx/${hash}`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export function longDate(date = new Date()): string {
  return date
    .toLocaleDateString("en-ZA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

export function dayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function expiryTone(days: number): "danger" | "warn" | "ok" {
  if (days <= 14) return "danger";
  if (days <= 30) return "warn";
  return "ok";
}
