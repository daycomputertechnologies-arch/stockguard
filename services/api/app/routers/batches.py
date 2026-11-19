import sqlite3
from datetime import datetime

from fastapi import APIRouter, Depends, Query, status

from ..chain import get_chain
from ..db import get_db, iso, now
from ..schemas import Batch, BatchCreate, Verification
from ..security import fail, require_token
from ..services.audit import list_events, record_event
from ..services.batches import get_batch, list_batches

router = APIRouter(tags=["batches"])

QR_PREFIX = "stockguard://batch/"


def _parse_qr(payload: str) -> str:
    payload = payload.strip()
    if payload.startswith(QR_PREFIX):
        return payload[len(QR_PREFIX) :]
    if payload.startswith("BATCH-") and "/" not in payload:
        return payload
    raise fail(400, "bad_request", "Not a StockGuard batch QR payload.")


@router.get("/batches/scan")
def scan(payload: str = Query(min_length=1), db: sqlite3.Connection = Depends(get_db)) -> Batch:
    batch_id = _parse_qr(payload)
    batch = get_batch(db, batch_id)
    if batch is None:
        raise fail(404, "not_found", f"batch {batch_id} does not exist")
    return Batch(**batch)


@router.post("/batches", status_code=status.HTTP_201_CREATED)
def create_batch(
    body: BatchCreate,
    db: sqlite3.Connection = Depends(get_db),
    _: None = Depends(require_token),
) -> Batch:
    if get_batch(db, body.batch_id) is not None:
        raise fail(409, "conflict", f"batch {body.batch_id} already exists")

    drug = db.execute(
        "SELECT * FROM drugs WHERE drug_code = ?", (body.drug_code,)
    ).fetchone()
    if drug is None:
        raise fail(404, "not_found", f"drug {body.drug_code} does not exist")

    clinic = db.execute(
        "SELECT * FROM clinics WHERE clinic_id = ?", (body.clinic_id,)
    ).fetchone()
    if clinic is None:
        raise fail(404, "not_found", f"clinic {body.clinic_id} does not exist")

    try:
        expiry = datetime.fromisoformat(body.expiry.replace("Z", "+00:00"))
    except ValueError as exc:
        raise fail(422, "validation_error", "expiry must be ISO-8601") from exc

    try:
        receipt = get_chain().register_batch(
            body.batch_id,
            body.drug_code,
            body.clinic_id,
            body.quantity,
            int(expiry.timestamp()),
        )
    except Exception as exc:
        raise fail(503, "chain_unavailable", str(exc)) from exc

    timestamp = iso()
    db.execute(
        """
        INSERT INTO batches (batch_id, drug_code, clinic_id, quantity, expiry, status,
                             derived_from, tx_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'registered', NULL, ?, ?, ?)
        """,
        (
            body.batch_id,
            body.drug_code,
            body.clinic_id,
            body.quantity,
            iso(expiry),
            receipt.tx_hash,
            timestamp,
            timestamp,
        ),
    )
    record_event(
        db,
        "batch_registered",
        batch_id=body.batch_id,
        clinic_id=body.clinic_id,
        quantity=body.quantity,
        actor=receipt.actor,
        tx_hash=receipt.tx_hash,
        detail=f"{body.quantity} units of {body.drug_code} registered at {body.clinic_id}",
    )
    db.commit()

    batch = get_batch(db, body.batch_id)
    assert batch is not None
    return Batch(**batch)


@router.get("/batches")
def batches(
    clinic_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    q: str | None = None,
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    return {"batches": list_batches(db, clinic_id, status_filter, q)}


@router.get("/batches/{batch_id}/verify")
def verify(batch_id: str, db: sqlite3.Connection = Depends(get_db)) -> Verification:
    batch = get_batch(db, batch_id)
    if batch is None:
        raise fail(404, "not_found", f"batch {batch_id} does not exist")

    chain_snapshot = get_chain().get_batch(batch_id)
    db_snapshot = {
        "quantity": batch["quantity"],
        "clinic_id": batch["clinic_id"],
        "status": batch["status"],
    }

    if chain_snapshot is None:
        match = False
        message = "No on-chain record for this batch. Run the chain seed or register it."
        tx_hash = None
    else:
        match = (
            chain_snapshot["quantity"] == db_snapshot["quantity"]
            and chain_snapshot["clinic_id"] == db_snapshot["clinic_id"]
            and chain_snapshot["status"] == db_snapshot["status"]
        )
        message = (
            "Database matches on-chain custody."
            if match
            else "Mismatch: the database disagrees with the chain."
        )
        tx_hash = None

    if not match:
        record_event(
            db,
            "tampered",
            batch_id=batch_id,
            clinic_id=batch["clinic_id"],
            quantity=batch["quantity"],
            detail=message,
        )
        db.commit()

    return Verification(
        batch_id=batch_id,
        match=match,
        db=db_snapshot,
        chain=chain_snapshot,
        checked_at=iso(),
        tx_hash=tx_hash,
        message=message,
    )


@router.get("/batches/{batch_id}")
def batch_detail(batch_id: str, db: sqlite3.Connection = Depends(get_db)) -> Batch:
    batch = get_batch(db, batch_id)
    if batch is None:
        raise fail(404, "not_found", f"batch {batch_id} does not exist")
    return Batch(**batch)


@router.post("/batches/{batch_id}/flag-expiry")
def flag_expiry(
    batch_id: str,
    db: sqlite3.Connection = Depends(get_db),
    _: None = Depends(require_token),
) -> Batch:
    batch = get_batch(db, batch_id)
    if batch is None:
        raise fail(404, "not_found", f"batch {batch_id} does not exist")

    already = db.execute(
        "SELECT 1 FROM events WHERE batch_id = ? AND type = 'near_expiry_flagged'", (batch_id,)
    ).fetchone()
    if already:
        raise fail(409, "conflict", f"batch {batch_id} is already flagged for expiry")

    try:
        receipt = get_chain().flag_near_expiry(batch_id)
    except Exception as exc:
        raise fail(503, "chain_unavailable", str(exc)) from exc

    db.execute(
        "UPDATE batches SET tx_hash = ?, updated_at = ? WHERE batch_id = ?",
        (receipt.tx_hash, iso(now()), batch_id),
    )
    record_event(
        db,
        "near_expiry_flagged",
        batch_id=batch_id,
        clinic_id=batch["clinic_id"],
        quantity=batch["quantity"],
        actor=receipt.actor,
        tx_hash=receipt.tx_hash,
        detail=f"{batch['quantity']} units expire in {batch['days_to_expiry']} days",
    )
    db.commit()

    refreshed = get_batch(db, batch_id)
    assert refreshed is not None
    return Batch(**refreshed)


@router.get("/batches/{batch_id}/events")
def batch_events(
    batch_id: str, limit: int = 50, db: sqlite3.Connection = Depends(get_db)
) -> dict:
    return {"events": list_events(db, batch_id, limit)}
