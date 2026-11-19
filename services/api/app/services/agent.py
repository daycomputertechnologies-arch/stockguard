import sqlite3

from .forecast import build_forecast


def _pick(rows: list[dict], message: str, clinic_id: str | None) -> dict | None:
    if not rows:
        return None

    text = message.lower()
    matched = [
        row
        for row in rows
        if row["drug_name"].lower() in text or row["drug_code"].lower() in text
    ]
    if clinic_id:
        scoped = [row for row in matched if row["clinic_id"] == clinic_id]
        matched = scoped or matched
        if not matched:
            matched = [row for row in rows if row["clinic_id"] == clinic_id]
    if matched:
        return min(matched, key=lambda row: row["days_to_stockout"])
    return rows[0]


def answer(conn: sqlite3.Connection, message: str, clinic_id: str | None = None) -> dict:
    rows = build_forecast(conn)
    row = _pick(rows, message, clinic_id)

    if row is None:
        return {
            "reply": "I have no forecast rows yet. Scan a batch or register stock and ask me again.",
            "source": "rules",
            "actions": [],
        }

    if row["suggested_qty"] <= 0:
        reply = (
            f"{row['clinic_name']} has {row['on_hand']} units of {row['drug_name']} at "
            f"{row['daily_use']}/day — about {row['days_to_stockout']} days left. "
            "I could not find surplus stock in the network."
        )
        return {"reply": reply, "source": "rules", "actions": []}

    source = conn.execute(
        "SELECT name FROM clinics WHERE clinic_id = ?",
        (row["suggested_source_clinic_id"],),
    ).fetchone()
    source_name = source["name"] if source else row["suggested_source_clinic_id"]

    reply = (
        f"{row['clinic_name']} has {row['on_hand']} units of {row['drug_name']} at "
        f"{row['daily_use']}/day — about {row['days_to_stockout']} days left. "
        f"The nearest surplus is {source_name} with batch "
        f"{row['suggested_source_batch_id']}. Moving {row['suggested_qty']} units covers "
        f"the next two weeks."
    )
    return {
        "reply": reply,
        "source": "rules",
        "actions": [
            {
                "type": "suggest_transfer",
                "batch_id": row["suggested_source_batch_id"],
                "to_clinic_id": row["clinic_id"],
                "quantity": row["suggested_qty"],
            }
        ],
    }
