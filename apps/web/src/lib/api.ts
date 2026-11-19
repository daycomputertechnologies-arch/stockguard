import type {
  AgentReply,
  AuditEvent,
  Batch,
  Clinic,
  Drug,
  ForecastRow,
  Health,
  Impact,
  Transfer,
  TransferInput,
  Verification,
} from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "/api";
const TOKEN_KEY = "stockguard.token";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getToken(): string {
  return (
    localStorage.getItem(TOKEN_KEY) ??
    import.meta.env.VITE_DEMO_TOKEN ??
    "stockguard-demo"
  );
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (init?.method && init.method !== "GET") {
    headers.set("X-Demo-Token", getToken());
  }

  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = payload?.detail ?? payload;
    throw new ApiError(
      response.status,
      detail?.error ?? "http_error",
      detail?.message ?? `Request failed (${response.status})`,
    );
  }
  return payload as T;
}

export const api = {
  health: () => request<Health>("/health"),
  clinics: () => request<{ clinics: Clinic[] }>("/clinics").then((r) => r.clinics),
  drugs: () => request<{ drugs: Drug[] }>("/drugs").then((r) => r.drugs),
  batches: (params?: { clinic_id?: string; status?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.clinic_id) qs.set("clinic_id", params.clinic_id);
    if (params?.status) qs.set("status", params.status);
    if (params?.q) qs.set("q", params.q);
    const suffix = qs.size ? `?${qs.toString()}` : "";
    return request<{ batches: Batch[] }>(`/batches${suffix}`).then((r) => r.batches);
  },
  batch: (id: string) => request<Batch>(`/batches/${encodeURIComponent(id)}`),
  createBatch: (body: {
    batch_id: string;
    drug_code: string;
    clinic_id: string;
    quantity: number;
    expiry: string;
  }) => request<Batch>("/batches", { method: "POST", body: JSON.stringify(body) }),
  scan: (payload: string) =>
    request<Batch>(`/batches/scan?payload=${encodeURIComponent(payload)}`),
  verify: (id: string) =>
    request<Verification>(`/batches/${encodeURIComponent(id)}/verify`),
  flagExpiry: (id: string) =>
    request<Batch>(`/batches/${encodeURIComponent(id)}/flag-expiry`, { method: "POST" }),
  transfers: (batchId?: string) => {
    const suffix = batchId ? `?batch_id=${encodeURIComponent(batchId)}` : "";
    return request<{ transfers: Transfer[] }>(`/transfers${suffix}`).then((r) => r.transfers);
  },
  createTransfer: (body: TransferInput) =>
    request<Transfer>("/transfers", { method: "POST", body: JSON.stringify(body) }),
  forecast: (params?: { clinic_id?: string; risk?: string }) => {
    const qs = new URLSearchParams();
    if (params?.clinic_id) qs.set("clinic_id", params.clinic_id);
    if (params?.risk) qs.set("risk", params.risk);
    const suffix = qs.size ? `?${qs.toString()}` : "";
    return request<{ generated_at: string; rows: ForecastRow[] }>(`/forecast${suffix}`);
  },
  impact: () => request<Impact>("/impact"),
  audit: (params?: { batch_id?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.batch_id) qs.set("batch_id", params.batch_id);
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.size ? `?${qs.toString()}` : "";
    return request<{ events: AuditEvent[] }>(`/audit${suffix}`).then((r) => r.events);
  },
  agent: (message: string, clinic_id?: string) =>
    request<AgentReply>("/agent/chat", {
      method: "POST",
      body: JSON.stringify({ message, clinic_id }),
    }),
  tamper: (batch_id: string, quantity: number) =>
    request<{ ok: boolean; batch_id: string }>("/demo/tamper", {
      method: "POST",
      body: JSON.stringify({ batch_id, quantity }),
    }),
};
