export type BatchStatus = "registered" | "in_transit" | "dispensed" | "recalled";
export type Risk = "low" | "medium" | "high";
export type TransferReason = "stockout_risk" | "near_expiry" | "recall" | "rebalance";

export interface Clinic {
  clinic_id: string;
  name: string;
  district: string;
  lat: number | null;
  lng: number | null;
}

export interface Drug {
  drug_code: string;
  name: string;
  form: string;
  unit_cost: number;
  shelf_life_days: number;
}

export interface Batch {
  batch_id: string;
  drug_code: string;
  drug_name: string;
  clinic_id: string;
  quantity: number;
  unit_cost: number;
  value: number;
  expiry: string;
  days_to_expiry: number;
  status: BatchStatus;
  derived_from: string | null;
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  transfer_id: string;
  batch_id: string;
  derived_batch_id: string | null;
  from_clinic_id: string;
  to_clinic_id: string;
  quantity: number;
  reason: TransferReason;
  tx_hash: string | null;
  created_at: string;
}

export interface ForecastRow {
  clinic_id: string;
  clinic_name: string;
  drug_code: string;
  drug_name: string;
  on_hand: number;
  daily_use: number;
  days_to_stockout: number;
  risk: Risk;
  suggested_source_clinic_id: string | null;
  suggested_source_batch_id: string | null;
  suggested_qty: number;
  reasoning: string;
}

export interface Impact {
  generated_at: string;
  units_in_stock: number;
  units_at_risk_of_expiry: number;
  value_at_risk: number;
  predicted_stockouts: number;
  pending_transfers: number;
  clinics_connected: number;
  value_redirected: number;
  chain_mode: string;
}

export interface AuditEvent {
  id: number;
  type: string;
  batch_id: string | null;
  clinic_id: string | null;
  from_clinic_id: string | null;
  to_clinic_id: string | null;
  quantity: number | null;
  actor: string | null;
  tx_hash: string | null;
  detail: string | null;
  created_at: string;
}

export interface Verification {
  batch_id: string;
  match: boolean;
  db: { quantity: number; clinic_id: string; status: string };
  chain: { quantity: number; clinic_id: string; status: string } | null;
  checked_at: string;
  tx_hash: string | null;
  message: string;
}

export interface AgentAction {
  type: "suggest_transfer";
  batch_id: string;
  to_clinic_id: string;
  quantity: number;
}

export interface AgentReply {
  reply: string;
  source: "rules" | "gemini";
  actions: AgentAction[];
}

export interface Health {
  status: string;
  chain: string;
  chain_id: number | null;
  contract: string | null;
  db: string;
  seed: string;
}

export interface TransferInput {
  batch_id: string;
  to_clinic_id: string;
  quantity: number;
  reason?: TransferReason;
}
