import sqlite3

from fastapi import APIRouter, Depends

from ..chain import get_chain
from ..config import get_settings
from ..db import get_db, iso
from ..schemas import AgentRequest, AgentResponse, ForecastResponse, Impact
from ..services.agent import answer
from ..services.forecast import build_forecast
from ..services.impact import compute_impact

router = APIRouter(tags=["intelligence"])


@router.get("/forecast")
def forecast(
    clinic_id: str | None = None,
    risk: str | None = None,
    db: sqlite3.Connection = Depends(get_db),
) -> ForecastResponse:
    rows = build_forecast(db)
    if clinic_id:
        rows = [row for row in rows if row["clinic_id"] == clinic_id]
    if risk:
        rows = [row for row in rows if row["risk"] == risk]
    return ForecastResponse(generated_at=iso(), rows=rows)


@router.get("/impact")
def impact(db: sqlite3.Connection = Depends(get_db)) -> Impact:
    return Impact(**compute_impact(db, get_chain().mode))


@router.post("/agent/chat")
def agent_chat(body: AgentRequest, db: sqlite3.Connection = Depends(get_db)) -> AgentResponse:
    settings = get_settings()
    result = answer(db, body.message, body.clinic_id)
    if not settings.gemini_api_key:
        return AgentResponse(**result)
    return AgentResponse(**result)
