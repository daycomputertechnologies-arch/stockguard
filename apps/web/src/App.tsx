import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import Audit from "./pages/Audit";
import Forecast from "./pages/Forecast";
import Inventory from "./pages/Inventory";
import Network from "./pages/Network";
import Orders from "./pages/Orders";
import Overview from "./pages/Overview";
import Redistribution from "./pages/Redistribution";
import Reports from "./pages/Reports";
import Scanner from "./pages/Scanner";
import Settings from "./pages/Settings";

function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <div className="text-6xl font-bold text-slate-200">404</div>
        <p className="mt-2 text-sm text-slate-500">That screen is not in the demo path.</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">
          Back to overview
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="scanner" element={<Scanner />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="redistribution" element={<Redistribution />} />
          <Route path="orders" element={<Orders />} />
          <Route path="audit" element={<Audit />} />
          <Route path="network" element={<Network />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
