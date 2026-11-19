import sqlite3

from ..db import iso


def record_event(
    conn: sqlite3.Connection,
    event_type: str,
    *,
    batch_id: str | None = None,
    clinic_id: str | None = None,
    from_clinic_id: str | None = None,
    to_clinic_id: str | None = None,
    quantity: int | None = None,
    actor: str | None = None,
    tx_hash: str | None = None,
    detail: str | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO events (type, batch_id, clinic_id, from_clinic_id, to_clinic_id,
                            quantity, actor, tx_hash, detail, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event_type,
            batch_id,
            clinic_id,
            from_clinic_id,
            to_clinic_id,
            quantity,
            actor,
            tx_hash,
            detail,
            iso(),
        ),
    )


def list_events(
    conn: sqlite3.Connection, batch_id: str | None = None, limit: int = 50
) -> list[dict]:
    limit = max(1, min(limit, 200))
    if batch_id:
        rows = conn.execute(
            "SELECT * FROM events WHERE batch_id = ? ORDER BY id DESC LIMIT ?",
            (batch_id, limit),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]
