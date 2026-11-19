from typing import Literal

from pydantic import BaseModel, Field

BatchStatus = Literal["registered", "in_transit", "dispensed", "recalled"]
Risk = Literal["low", "medium", "high"]
TransferReason = Literal["stockout_risk", "near_expiry", "recall", "rebalance"]


class Clinic(BaseModel):
    clinic_id: str
    name: str
    district: str
    lat: float | None = None
    lng: float | None = None


class Drug(BaseModel):
    drug_code: str
    name: str
    form: str
    unit_cost: float
    shelf_life_days: int


class Batch(BaseModel):
    batch_id: str
    drug_code: str
    drug_name: str
    clinic_id: str
    quantity: int
    unit_cost: float
    value: float
    expiry: str
    days_to_expiry: int
    status: BatchStatus
    derived_from: str | None = None
    tx_hash: str | None = None
    created_at: str
    updated_at: str


class BatchCreate(BaseModel):
    batch_id: str = Field(min_length=1, max_length=40)
    drug_code: str
    clinic_id: str
    quantity: int = Field(gt=0)
    expiry: str


class Transfer(BaseModel):
    transfer_id: str
    batch_id: str
    derived_batch_id: str | None = None
    from_clinic_id: str
    to_clinic_id: str
    quantity: int
    reason: TransferReason
    tx_hash: str | None = None
    created_at: str


class TransferCreate(BaseModel):
    batch_id: str
    to_clinic_id: str
    quantity: int = Field(gt=0)
    reason: TransferReason = "stockout_risk"


class ForecastRow(BaseModel):
    clinic_id: str
    clinic_name: str
    drug_code: str
    drug_name: str
    on_hand: int
    daily_use: float
    days_to_stockout: float
    risk: Risk
    suggested_source_clinic_id: str | None = None
    suggested_source_batch_id: str | None = None
    suggested_qty: int
    reasoning: str


class ForecastResponse(BaseModel):
    generated_at: str
    rows: list[ForecastRow]


class Impact(BaseModel):
    generated_at: str
    units_in_stock: int
    units_at_risk_of_expiry: int
    value_at_risk: float
    predicted_stockouts: int
    pending_transfers: int
    clinics_connected: int
    value_redirected: float
    chain_mode: str


class AuditEvent(BaseModel):
    id: int
    type: str
    batch_id: str | None = None
    clinic_id: str | None = None
    from_clinic_id: str | None = None
    to_clinic_id: str | None = None
    quantity: int | None = None
    actor: str | None = None
    tx_hash: str | None = None
    detail: str | None = None
    created_at: str


class ChainSnapshot(BaseModel):
    quantity: int
    clinic_id: str
    status: str


class Verification(BaseModel):
    batch_id: str
    match: bool
    db: ChainSnapshot
    chain: ChainSnapshot | None = None
    checked_at: str
    tx_hash: str | None = None
    message: str


class AgentRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    clinic_id: str | None = None


class AgentAction(BaseModel):
    type: Literal["suggest_transfer"]
    batch_id: str
    to_clinic_id: str
    quantity: int


class AgentResponse(BaseModel):
    reply: str
    source: Literal["rules", "gemini"] = "rules"
    actions: list[AgentAction] = []


class TamperRequest(BaseModel):
    batch_id: str
    quantity: int = Field(ge=0)


class ErrorBody(BaseModel):
    error: str
    message: str
