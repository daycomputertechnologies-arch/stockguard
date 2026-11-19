import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import solc from "solc";

const sourcePath = resolve("DrugBatchRegistry.sol");
const source = readFileSync(sourcePath, "utf8");

const input = {
  language: "Solidity",
  sources: { "DrugBatchRegistry.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    viaIR: true,
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((e) => e.severity === "error");
if (errors.length) {
  for (const e of errors) console.error(e.formattedMessage);
  process.exit(1);
}

const contract = output.contracts["DrugBatchRegistry.sol"].DrugBatchRegistry;
const artifact = {
  contractName: "DrugBatchRegistry",
  abi: contract.abi,
  bytecode: `0x${contract.evm.bytecode.object}`,
  deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
  compiler: solc.version(),
};

const outPath = resolve("../packages/shared/abi/DrugBatchRegistry.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(artifact, null, 2));

console.log(`compiled with ${solc.version()}`);
console.log(`abi -> ${outPath}`);
