import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { Icon } from "./Icon";

interface Props {
  batchId: string;
  compact?: boolean;
  onResult?: (match: boolean, message: string) => void;
}

export function VerifyButton({ batchId, compact = false, onResult }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "match" | "mismatch">("idle");
  const [message, setMessage] = useState<string>("");

  async function run() {
    setState("loading");
    try {
      const result = await api.verify(batchId);
      setState(result.match ? "match" : "mismatch");
      setMessage(result.message);
      onResult?.(result.match, result.message);
    } catch (error) {
      setState("mismatch");
      setMessage(error instanceof ApiError ? error.message : "Verification failed");
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={state === "loading"}
      title={message || "Compare the database with the chain"}
      className={`pill transition ${
        state === "match"
          ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
          : state === "mismatch"
            ? "bg-red-50 text-red-600 ring-1 ring-red-100"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      <Icon
        name={state === "match" ? "shield" : state === "mismatch" ? "alert" : "refresh"}
        className={`h-3.5 w-3.5 ${state === "loading" ? "animate-spin" : ""}`}
      />
      {state === "match"
        ? "chain ok"
        : state === "mismatch"
          ? "mismatch"
          : compact
            ? "verify"
            : "Verify on chain"}
    </button>
  );
}
