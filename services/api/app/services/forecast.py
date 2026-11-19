import math
import sqlite3

from ..db import now, parse_iso

HIGH_DAYS = 7
MEDIUM_DAYS = 14
COVER_DAYS = 14

USAGE_SQL = """
SELECT u.clinic_id, u.drug_code, u.daily_use,
       c.name AS clinic_name, d.name AS drug_name, d.unit_cost
FROM usage u
JOIN clinics c ON c.clinic_id = u.clinic_id
JOIN drugs d ON d.drug_code = u.drug_code
ORDER BY u.clinic_id, u.drug_code
"""


def risk_for(days: float) -> str:
    if days <= HIGH_DAYS:
        return "high"
    if days <= MEDIUM_DAYS:
        return "medium"
    return "low"


def _supplier(conn: sqlite3.Connection, drug_code: str, exclude_clinic: str, needed: int):
    rows = conn.execute(
        """
        SELECT batch_id, clinic_id, quantity, expiry
        FROM batches
        WHERE drug_code = ? AND clinic_id != ? AND quantity > 0 AND status != 'recalled'
        """,
        (drug_code, exclude_clinic),
    ).fetchall()
    if not rows:
        return None, 0

    today = now().date()
    candidates = []
    for row in rows:
        days = (parse_iso(row["expiry"]).date() - today).days
        candidates.append((days, row))

    expiring = [(d, r) for d, r in candidates if d <= 60 and r["quantity"] >= needed]
    chosen = min(expiring, key=lambda item: item[0])[1] if expiring else max(
        candidates, key=lambda item: item[1]["quantity"]
    )[1]
    qty = min(needed, chosen["quantity"])
    return chosen, qty


def build_forecast(conn: sqlite3.Connection) -> list[dict]:
    stock_rows = conn.execute(
        """
        SELECT clinic_id, drug_code, SUM(quantity) AS qty
        FROM batches WHERE status != 'recalled'
        GROUP BY clinic_id, drug_code
        """
    ).fetchall()
    stock = {(r["clinic_id"], r["drug_code"]): int(r["qty"]) for r in stock_rows}

    rows: list[dict] = []
    for usage in conn.execute(USAGE_SQL).fetchall():
        key = (usage["clinic_id"], usage["drug_code"])
        on_hand = stock.get(key, 0)
        daily = float(usage["daily_use"])
        if on_hand <= 0 and daily <= 0:
            continue

        days = round(on_hand / daily, 1) if daily > 0 else 999.0
        risk = risk_for(days)
        needed = max(1, math.ceil(daily * COVER_DAYS) - on_hand)
        batch, qty = _supplier(conn, usage["drug_code"], usage["clinic_id"], needed)

        if batch is None:
            source_name = None
            reasoning = f"{on_hand} on hand at {daily}/day — about {days} days left. No surplus found in the network."
            source_clinic, source_batch, suggested = None, None, 0
        else:
            supplier_name = conn.execute(
                "SELECT name FROM clinics WHERE clinic_id = ?", (batch["clinic_id"],)
            ).fetchone()["name"]
            source_name = supplier_name
            expiring_days = (parse_iso(batch["expiry"]).date() - now().date()).days
            reasoning = (
                f"{on_hand} on hand at {daily}/day — about {days} days left. "
                f"{supplier_name} holds {batch['quantity']} units expiring in {expiring_days} days; "
                f"move {qty} to cover {COVER_DAYS} days."
            )
            source_clinic = batch["clinic_id"]
            source_batch = batch["batch_id"]
            suggested = qty

        rows.append(
            {
                "clinic_id": usage["clinic_id"],
                "clinic_name": usage["clinic_name"],
                "drug_code": usage["drug_code"],
                "drug_name": usage["drug_name"],
                "on_hand": on_hand,
                "daily_use": daily,
                "days_to_stockout": days,
                "risk": risk,
                "suggested_source_clinic_id": source_clinic,
                "suggested_source_batch_id": source_batch,
                "suggested_qty": suggested,
                "reasoning": reasoning,
            }
        )

    order = {"high": 0, "medium": 1, "low": 2}
    rows.sort(key=lambda r: (order[r["risk"]], r["days_to_stockout"]))
    return rows
