import { createContext, useContext, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Clinic, Impact } from "../lib/types";
import { ChainBadge } from "./Badges";
import { Icon, type IconName } from "./Icon";

interface ClinicContextValue {
  clinicId: string;
  setClinicId: (id: string) => void;
  clinics: Clinic[];
}

const ClinicContext = createContext<ClinicContextValue>({
  clinicId: "CLINIC-A",
  setClinicId: () => undefined,
  clinics: [],
});

export function useClinic() {
  return useContext(ClinicContext);
}

const nav: { to: string; label: string; icon: IconName; badge?: boolean }[] = [
  { to: "/", label: "Overview", icon: "overview" },
  { to: "/inventory", label: "Inventory", icon: "inventory" },
  { to: "/scanner", label: "QR Batch Scanner", icon: "scanner" },
  { to: "/forecast", label: "AI Demand Forecast", icon: "sparkles" },
  { to: "/redistribution", label: "Smart Redistribution", icon: "share", badge: true },
  { to: "/orders", label: "Orders & Procurement", icon: "cart" },
  { to: "/audit", label: "Blockchain Audit Trail", icon: "shield" },
  { to: "/network", label: "Clinic Network", icon: "map" },
  { to: "/reports", label: "Reports & Analytics", icon: "chart" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

const CLINIC_KEY = "stockguard.clinic";

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicId, setClinicIdState] = useState(
    () => localStorage.getItem(CLINIC_KEY) ?? "CLINIC-A",
  );
  const [impact, setImpact] = useState<Impact | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function setClinicId(id: string) {
    localStorage.setItem(CLINIC_KEY, id);
    setClinicIdState(id);
  }

  useEffect(() => {
    api.clinics().then(setClinics).catch(() => setClinics([]));
    api.impact().then(setImpact).catch(() => setImpact(null));
  }, [location.pathname]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const activeClinic = clinics.find((clinic) => clinic.clinic_id === clinicId) ?? clinics[0];

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    navigate(`/inventory?q=${encodeURIComponent(query)}`);
  }

  return (
    <ClinicContext.Provider value={{ clinicId, setClinicId, clinics }}>
      <div className="min-h-screen lg:flex">
        {open ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col bg-ink px-4 py-5 transition-transform lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Link to="/" className="flex items-center gap-3 px-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                <path d="M12 3 4 8v8l8 5 8-5V8l-8-5Z" stroke="#2DD4BF" strokeWidth="1.7" />
                <path d="M12 9v6M9 12h6" stroke="#2DD4BF" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <span>
              <span className="block text-[17px] font-bold leading-tight text-white">StockGuard</span>
              <span className="block text-[9px] font-semibold tracking-[0.22em] text-brand-300">
                HEALTH SUPPLY INTELLIGENCE
              </span>
            </span>
          </Link>

          <div className="mt-7 rounded-xl bg-white/5 p-3 ring-1 ring-white/5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-semibold tracking-[0.16em] text-slate-400">
                CURRENT CLINIC
              </span>
              <span className="rounded bg-brand-700/40 px-1.5 py-0.5 text-[9px] font-semibold text-brand-200">
                A
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-300/20 text-xs font-bold text-brand-200">
                {(activeClinic?.name ?? "LC")
                  .split(" ")
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join("")}
              </span>
              <select
                aria-label="Current clinic"
                value={clinicId}
                onChange={(event) => setClinicId(event.target.value)}
                className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-sm font-semibold text-white outline-none"
              >
                {clinics.length === 0 ? <option value="CLINIC-A">Langa CHC</option> : null}
                {clinics.map((clinic) => (
                  <option key={clinic.clinic_id} value={clinic.clinic_id} className="text-ink">
                    {clinic.name}
                  </option>
                ))}
              </select>
              <Icon name="chevronRight" className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          <nav className="mt-5 flex-1 space-y-0.5 overflow-y-auto">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "nav-item-active" : ""}`
                }
              >
                <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && impact && impact.pending_transfers > 0 ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {impact.pending_transfers}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-xs font-semibold text-white">Network online</span>
            </div>
            <div className="mt-1 px-1">
              <ChainBadge mode={impact?.chain_mode ?? "fake"} />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-[272px]">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur lg:px-8">
            <button
              type="button"
              className="btn-ghost !px-2 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>

            <form onSubmit={onSearch} className="relative hidden flex-1 max-w-[520px] sm:block">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search medicines, batches, clinics…"
                className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-16 text-sm outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                ⏎
              </span>
            </form>

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-slate-500 hover:bg-slate-50"
                aria-label="Notifications"
              >
                <Icon name="bell" className="h-[18px] w-[18px]" />
                <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-red-500" />
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-2 py-1.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
                  TM
                </span>
                <span className="hidden leading-tight sm:block">
                  <span className="block text-[13px] font-semibold text-ink">Thandi Mokoena</span>
                  <span className="block text-[11px] text-slate-500">Senior Pharmacist</span>
                </span>
                <Icon name="chevronRight" className="hidden h-4 w-4 text-slate-400 sm:block" />
              </div>
            </div>
          </header>

          <main className="px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ClinicContext.Provider>
  );
}
