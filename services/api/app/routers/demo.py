import sqlite3

from fastapi import APIRouter, Depends

from ..config import get_settings
from ..db import get_db, iso
from ..security import fail, require_token
from ..services.audit import record_event

router = APIRouter(tags=["demo"])


@router.post("/demo/tamper")
def tamper(
    body: dict,
    db: sqlite3.Connection = Depends(get_db),
    _: None = Depends(require_token),
) -> dict:
    settings = get_settings()
    if not settings.allow_demo_endpoints:
        raise fail(404, "not_found", "demo endpoints are disabled")

    batch_id = body.get("batch_id")
    quantity = body.get("quantity")
    if not isinstance(batch_id, str) or not isinstance(quantity, int) or quantity < 0:
        raise fail(422, "validation_error", "batch_id and a non-negative quantity are required")

    row = db.execute("SELECT * FROM batches WHERE batch_id = ?", (batch_id,)).fetchone()
    if row is None:
        raise fail(404, "not_found", f"batch {batch_id} does not exist")

    db.execute(
        "UPDATE batches SET quantity = ?, updated_at = ? WHERE batch_id = ?",
        (quantity, iso(), batch_id),
    )
    record_event(
        db,
        "tampered",
        batch_id=batch_id,
        clinic_id=row["clinic_id"],
        quantity=quantity,
        actor="demo",
        detail=f"SQLite row edited to {quantity} units without touching the chain",
    )
    db.commit()
    return {"ok": True, "batch_id": batch_id}
