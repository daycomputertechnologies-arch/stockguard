import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "apps/web/package.json"));
const QRCode = require("qrcode");

const batches = ["BATCH-0001", "BATCH-0002", "BATCH-0009"];
const out = path.join(root, "docs/qr");
await mkdir(out, { recursive: true });

const cards = [];
for (const id of batches) {
  const payload = `stockguard://batch/${id}`;
  await QRCode.toFile(path.join(out, `${id}.png`), payload, {
    margin: 2,
    width: 480,
    color: { dark: "#0B2545", light: "#FFFFFF" },
  });
  console.log(`${id}.png  ${payload}`);
  cards.push(`
    <article>
      <h2>${id}</h2>
      <img src="${id}.png" alt="${payload}">
      <code>${payload}</code>
    </article>`);
}

await writeFile(
  path.join(out, "index.html"),
  `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>StockGuard demo QR codes</title>
<style>
  body { font-family: Inter, system-ui, sans-serif; background: #f6f8fb; color: #0b2545; margin: 0; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p { color: #64748b; font-size: 13px; margin: 0 0 28px; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
  article { background: #fff; border: 1px solid #e4e9f0; border-radius: 18px; padding: 20px; text-align: center; }
  h2 { font-size: 13px; letter-spacing: .09em; text-transform: uppercase; color: #64748b; margin: 0 0 12px; }
  img { width: 100%; max-width: 220px; }
  code { display: block; margin-top: 10px; font-size: 10px; color: #0f766e; word-break: break-all; }
  @media print { body { background: #fff; } article { break-inside: avoid; } }
</style>
<h1>StockGuard demo batch QR codes</h1>
<p>Print this sheet. Scanning opens an existing batch; it never creates one.</p>
<main>${cards.join("")}</main>
</html>
`,
);

console.log(`\nSheet: ${path.join(out, "index.html")}`);
