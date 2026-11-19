import sqlite3

from fastapi import APIRouter, Depends, Query

from ..db import get_db
from ..services.audit import list_events

router = APIRouter(tags=["audit"])


@router.get("/audit")
def audit(
    batch_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    return {"events": list_events(db, batch_id, limit)}
