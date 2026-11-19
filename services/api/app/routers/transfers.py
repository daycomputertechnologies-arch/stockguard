import sqlite3

from fastapi import APIRouter, Depends, status

from ..chain import get_chain
from ..db import get_db, iso
from ..schemas import Transfer, TransferCreate
from ..security import fail, require_token
from ..services.audit import record_event

router = APIRouter(tags=["transfers"])


def _next_transfer_id(conn: sqlite3.Connection) -> str:
    number = conn.execute("SELECT COUNT(*) AS n FROM transfers").fetchone()["n"] + 1
    while True:
        candidate = f"TRF-{number:04d}"
        if not conn.execute(
            "SELECT 1 FROM transfers WHERE transfer_id = ?", (candidate,)
        ).fetchone():
            return candidate
        number += 1


def _next_derived_id(conn: sqlite3.Connection, batch_id: str) -> str:
    number = 1
    while True:
        candidate = f"{batch_id}-T{number}"
        if not conn.execute(
            "SELECT 1 FROM batches WHERE batch_id = ?", (candidate,)
        ).fetchone():
            return candidate
        number += 1


@router.post("/transfers", status_code=status.HTTP_201_CREATED)
def create_transfer(
    body: TransferCreate,
    db: sqlite3.Connection = Depends(get_db),
    _: None = Depends(require_token),
) -> Transfer:
    source = db.execute("SELECT * FROM batches WHERE batch_id = ?", (body.batch_id,)).fetchone()
    if source is None:
        raise fail(404, "not_found", f"batch {body.batch_id} does not exist")

    clinic = db.execute(
        "SELECT * FROM clinics WHERE clinic_id = ?", (body.to_clinic_id,)
    ).fetchone()
    if clinic is None:
        raise fail(404, "not_found", f"clinic {body.to_clinic_id} does not exist")

    if body.to_clinic_id == source["clinic_id"]:
        raise fail(409, "conflict", "source and destination clinic are the same")
    if body.quantity > source["quantity"]:
        raise fail(
            409,
            "conflict",
            f"cannot move {body.quantity} units; {source['quantity']} on hand",
        )

    partial = body.quantity < source["quantity"]
    derived_id = _next_derived_id(db, body.batch_id) if partial else None

    try:
        receipt = get_chain().transfer_custody(
            body.batch_id, body.to_clinic_id, body.quantity, derived_id or ""
        )
    except Exception as exc:
        raise fail(503, "chain_unavailable", str(exc)) from exc

    timestamp = iso()
    transfer_id = _next_transfer_id(db)

    if partial:
        db.execute(
            "UPDATE batches SET quantity = quantity - ?, updated_at = ? WHERE batch_id = ?",
            (body.quantity, timestamp, body.batch_id),
        )
        db.execute(
            """
            INSERT INTO batches (batch_id, drug_code, clinic_id, quantity, expiry, status,
                                 derived_from, tx_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'in_transit', ?, ?, ?, ?)
            """,
            (
                derived_id,
                source["drug_code"],
                body.to_clinic_id,
                body.quantity,
                source["expiry"],
                body.batch_id,
                receipt.tx_hash,
                timestamp,
                timestamp,
            ),
        )
    else:
        db.execute(
            """
            UPDATE batches SET clinic_id = ?, status = 'in_transit', tx_hash = ?, updated_at = ?
            WHERE batch_id = ?
            """,
            (body.to_clinic_id, receipt.tx_hash, timestamp, body.batch_id),
        )

    db.execute(
        """
        INSERT INTO transfers (transfer_id, batch_id, derived_batch_id, from_clinic_id,
                               to_clinic_id, quantity, reason, tx_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            transfer_id,
            body.batch_id,
            derived_id,
            source["clinic_id"],
            body.to_clinic_id,
            body.quantity,
            body.reason,
            receipt.tx_hash,
            timestamp,
        ),
    )

    record_event(
        db,
        "custody_transferred",
        batch_id=derived_id or body.batch_id,
        clinic_id=body.to_clinic_id,
        from_clinic_id=source["clinic_id"],
        to_clinic_id=body.to_clinic_id,
        quantity=body.quantity,
        actor=receipt.actor,
        tx_hash=receipt.tx_hash,
        detail=(
            f"{body.quantity} units moved {source['clinic_id']} -> {body.to_clinic_id} "
            f"({body.reason})"
        ),
    )
    db.commit()

    return Transfer(
        transfer_id=transfer_id,
        batch_id=body.batch_id,
        derived_batch_id=derived_id,
        from_clinic_id=source["clinic_id"],
        to_clinic_id=body.to_clinic_id,
        quantity=body.quantity,
        reason=body.reason,
        tx_hash=receipt.tx_hash,
        created_at=timestamp,
    )


@router.get("/transfers")
def list_transfers(batch_id: str | None = None, db: sqlite3.Connection = Depends(get_db)) -> dict:
    if batch_id:
        rows = db.execute(
            "SELECT * FROM transfers WHERE batch_id = ? OR derived_batch_id = ?"
            " ORDER BY created_at DESC",
            (batch_id, batch_id),
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM transfers ORDER BY created_at DESC LIMIT 100").fetchall()
    return {"transfers": [dict(row) for row in rows]}
