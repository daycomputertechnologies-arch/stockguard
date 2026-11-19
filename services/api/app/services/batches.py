import sqlite3

from ..db import parse_iso

SELECT = """
SELECT b.*, d.name AS drug_name, d.unit_cost AS unit_cost
FROM batches b
JOIN drugs d ON d.drug_code = b.drug_code
"""


def serialize(row: sqlite3.Row | dict) -> dict:
    data = dict(row)
    expiry = parse_iso(data["expiry"])
    from ..db import now

    days = (expiry.date() - now().date()).days
    return {
        "batch_id": data["batch_id"],
        "drug_code": data["drug_code"],
        "drug_name": data["drug_name"],
        "clinic_id": data["clinic_id"],
        "quantity": data["quantity"],
        "unit_cost": data["unit_cost"],
        "value": round(data["quantity"] * data["unit_cost"], 2),
        "expiry": data["expiry"],
        "days_to_expiry": days,
        "status": data["status"],
        "derived_from": data["derived_from"],
        "tx_hash": data["tx_hash"],
        "created_at": data["created_at"],
        "updated_at": data["updated_at"],
    }


def get_batch(conn: sqlite3.Connection, batch_id: str) -> dict | None:
    row = conn.execute(f"{SELECT} WHERE b.batch_id = ?", (batch_id,)).fetchone()
    return serialize(row) if row else None


def list_batches(
    conn: sqlite3.Connection,
    clinic_id: str | None = None,
    status: str | None = None,
    query: str | None = None,
) -> list[dict]:
    sql = SELECT
    clauses: list[str] = []
    params: list[object] = []
    if clinic_id:
        clauses.append("b.clinic_id = ?")
        params.append(clinic_id)
    if status:
        clauses.append("b.status = ?")
        params.append(status)
    if query:
        clauses.append("(lower(b.batch_id) LIKE ? OR lower(d.name) LIKE ? OR lower(b.drug_code) LIKE ?)")
        like = f"%{query.lower()}%"
        params.extend([like, like, like])
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY b.expiry ASC, b.batch_id ASC"
    return [serialize(row) for row in conn.execute(sql, params).fetchall()]
