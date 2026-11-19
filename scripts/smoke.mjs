const base = process.env.API_BASE ?? "http://127.0.0.1:8800/api";
const token = process.env.DEMO_TOKEN ?? "stockguard-demo";

async function call(path, init) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Demo-Token": token, ...(init?.headers ?? {}) },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path} -> ${response.status} ${JSON.stringify(body)}`);
  return body;
}

const checks = [];

const health = await call("/health");
checks.push(["health", health.status === "ok" && health.seed === "ok", `${health.chain} / db ${health.db}`]);

const impact = await call("/impact");
checks.push([
  "impact",
  impact.units_in_stock > 0 && impact.clinics_connected > 0,
  `${impact.units_in_stock} units, ${impact.predicted_stockouts} risks`,
]);

const forecast = await call("/forecast?risk=high");
checks.push(["forecast", forecast.rows.length >= 1, `${forecast.rows.length} high-risk rows`]);

const scan = await call("/batches/scan?payload=stockguard://batch/BATCH-0001");
checks.push(["scan", scan.batch_id === "BATCH-0001", `${scan.batch_id} qty ${scan.quantity}`]);

const verify = await call("/batches/BATCH-0001/verify");
checks.push(["verify", verify.match === true, verify.message]);

const audit = await call("/audit?limit=5");
checks.push(["audit", audit.events.length > 0, `${audit.events.length} events`]);

let failed = 0;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(10)} ${detail}`);
  if (!ok) failed += 1;
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
