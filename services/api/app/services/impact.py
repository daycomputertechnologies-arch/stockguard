import sqlite3
from datetime import timedelta

from ..db import iso, now, parse_iso
from .forecast import build_forecast

EXPIRY_WINDOW_DAYS = 30


def compute_impact(conn: sqlite3.Connection, chain_mode: str) -> dict:
    rows = conn.execute(
        """
        SELECT b.quantity, b.expiry, d.unit_cost
        FROM batches b JOIN drugs d ON d.drug_code = b.drug_code
        WHERE b.status != 'recalled'
        """
    ).fetchall()

    today = now().date()
    units_in_stock = 0
    at_risk = 0
    value_at_risk = 0.0

    for row in rows:
        units_in_stock += int(row["quantity"])
        days = (parse_iso(row["expiry"]).date() - today).days
        if days <= EXPIRY_WINDOW_DAYS:
            at_risk += int(row["quantity"])
            value_at_risk += row["quantity"] * row["unit_cost"]

    forecast = build_forecast(conn)
    predicted_stockouts = sum(1 for row in forecast if row["risk"] == "high")

    since = iso(now() - timedelta(days=14))
    pending = conn.execute(
        "SELECT COUNT(*) AS n FROM transfers WHERE created_at >= ?", (since,)
    ).fetchone()["n"]

    clinics = conn.execute("SELECT COUNT(*) AS n FROM clinics").fetchone()["n"]

    redirected = conn.execute(
        """
        SELECT COALESCE(SUM(t.quantity * d.unit_cost), 0) AS total
        FROM transfers t
        JOIN batches b ON b.batch_id = t.batch_id
        JOIN drugs d ON d.drug_code = b.drug_code
        """
    ).fetchone()["total"]

    return {
        "generated_at": iso(),
        "units_in_stock": units_in_stock,
        "units_at_risk_of_expiry": at_risk,
        "value_at_risk": round(value_at_risk, 2),
        "predicted_stockouts": predicted_stockouts,
        "pending_transfers": int(pending),
        "clinics_connected": int(clinics),
        "value_redirected": round(float(redirected), 2),
        "chain_mode": chain_mode,
    }
