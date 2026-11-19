import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JsonRpcProvider, Wallet, Contract } from "ethers";

function loadEnv() {
  try {
    process.loadEnvFile(resolve("../../.env"));
  } catch {
    // rely on process environment
  }
}

loadEnv();

const rpc = process.env.FUJI_RPC_URL;
const key = process.env.OPERATOR_PRIVATE_KEY;
const address = process.env.CONTRACT_ADDRESS;

if (!rpc || !key || !address) {
  console.error("Set FUJI_RPC_URL, OPERATOR_PRIVATE_KEY and CONTRACT_ADDRESS in .env.");
  process.exit(1);
}

const artifact = JSON.parse(
  readFileSync(resolve("../packages/shared/abi/DrugBatchRegistry.json"), "utf8"),
);
const seed = JSON.parse(
  readFileSync(resolve("../packages/shared/seed/batches.json"), "utf8"),
);

const wallet = new Wallet(key, new JsonRpcProvider(rpc));
const contract = new Contract(address, artifact.abi, wallet);

const STATUS = ["None", "Registered", "InTransit", "Dispensed", "Recalled"];

for (const batch of seed) {
    const existing = await contract.getBatch(batch.batch_id).catch(() => null);
    if (existing && existing.status !== 0n) {
      console.log(`skip ${batch.batch_id} (already on chain)`);
      continue;
    }
    const expiry = Math.floor(
      (batch.expiry_in_days !== undefined
        ? Date.now() + batch.expiry_in_days * 86_400_000
        : new Date(batch.expiry).getTime()) / 1000,
    );
    const tx = await contract.registerBatch(
      batch.batch_id,
      batch.drug_code,
      batch.clinic_id,
      batch.quantity,
      expiry,
    );
    const receipt = await tx.wait();
    console.log(`${batch.batch_id} -> ${receipt.hash}`);
}

console.log("done");
console.log("statuses:", STATUS.join(", "));
