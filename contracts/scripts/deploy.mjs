import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";

function loadEnv() {
  try {
    process.loadEnvFile(resolve("../../.env"));
  } catch {
    // no .env, rely on the process environment
  }
}

loadEnv();

const rpc = process.env.FUJI_RPC_URL;
const key = process.env.OPERATOR_PRIVATE_KEY;
const network = process.env.CHAIN_NETWORK_LABEL ?? "fuji:43113";

if (!rpc || !key) {
  console.error("Set FUJI_RPC_URL and OPERATOR_PRIVATE_KEY in .env before deploying.");
  process.exit(1);
}

const artifact = JSON.parse(
  readFileSync(resolve("../packages/shared/abi/DrugBatchRegistry.json"), "utf8"),
);

const provider = new JsonRpcProvider(rpc);
const wallet = new Wallet(key, provider);

console.log(`deploying from ${wallet.address}`);
const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy(network);
await contract.waitForDeployment();

const address = await contract.getAddress();
const tx = contract.deploymentTransaction();
const receipt = await tx.wait();

const deployment = {
  address,
  network,
  chainId: Number((await provider.getNetwork()).chainId),
  txHash: tx.hash,
  blockNumber: receipt.blockNumber,
  deployedAt: new Date().toISOString(),
  operator: wallet.address,
  explorer: `${process.env.EXPLORER_BASE ?? "https://testnet.snowtrace.io"}/tx/${tx.hash}`,
};

const outPath = resolve("../packages/shared/deployment.json");
writeFileSync(outPath, JSON.stringify(deployment, null, 2));

console.log(`contract  ${address}`);
console.log(`tx        ${deployment.explorer}`);
console.log(`written   ${outPath}`);
