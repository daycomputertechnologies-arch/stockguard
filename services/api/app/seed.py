import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from .config import Settings
from .db import connect, init_db, iso, now
from .services.audit import record_event


def _load(seed_dir: Path, name: str) -> list[dict]:
    path = seed_dir / name
    if not path.exists():
        raise FileNotFoundError(f"seed file missing: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def is_empty(conn: sqlite3.Connection) -> bool:
    return conn.execute("SELECT COUNT(*) AS n FROM batches").fetchone()["n"] == 0


def seed(settings: Settings, force: bool = False) -> bool:
    init_db(settings)
    conn = connect(settings)
    try:
        if not force and not is_empty(conn):
            return False

        if force:
            for table in ("events", "transfers", "usage", "batches", "drugs", "clinics"):
                conn.execute(f"DELETE FROM {table}")

        seed_dir = settings.seed_path
        clinics = _load(seed_dir, "clinics.json")
        drugs = _load(seed_dir, "drugs.json")
        usage = _load(seed_dir, "usage.json")
        batches = _load(seed_dir, "batches.json")
        transfers = _load(seed_dir, "transfers.json")

        moment = now()

        conn.executemany(
            "INSERT OR REPLACE INTO clinics (clinic_id, name, district, lat, lng)"
            " VALUES (?, ?, ?, ?, ?)",
            [(c["clinic_id"], c["name"], c["district"], c.get("lat"), c.get("lng")) for c in clinics],
        )
        conn.executemany(
            "INSERT OR REPLACE INTO drugs (drug_code, name, form, unit_cost, shelf_life_days)"
            " VALUES (?, ?, ?, ?, ?)",
            [
                (d["drug_code"], d["name"], d["form"], d["unit_cost"], d["shelf_life_days"])
                for d in drugs
            ],
        )
        conn.executemany(
            "INSERT OR REPLACE INTO usage (clinic_id, drug_code, daily_use) VALUES (?, ?, ?)",
            [(u["clinic_id"], u["drug_code"], u["daily_use"]) for u in usage],
        )

        batch_rows = []
        for batch in batches:
            expiry = moment + timedelta(days=batch["expiry_in_days"])
            created = moment - timedelta(days=batch.get("registered_days_ago", 30))
            batch_rows.append(
                (
                    batch["batch_id"],
                    batch["drug_code"],
                    batch["clinic_id"],
                    batch["quantity"],
                    iso(expiry),
                    batch.get("status", "registered"),
                    batch.get("derived_from"),
                    None,
                    iso(created),
                    iso(created),
                )
            )
        conn.executemany(
            """
            INSERT OR REPLACE INTO batches
              (batch_id, drug_code, clinic_id, quantity, expiry, status, derived_from,
               tx_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            batch_rows,
        )

        for batch in sorted(batch_rows, key=lambda row: row[8]):
            record_event(
                conn,
                "batch_registered",
                batch_id=batch[0],
                clinic_id=batch[2],
                quantity=batch[3],
                actor="seeded",
                detail=f"{batch[3]} units of {batch[1]} registered at {batch[2]}",
            )

        for transfer in transfers:
            created = moment - timedelta(days=transfer["days_ago"])
            conn.execute(
                """
                INSERT OR REPLACE INTO transfers
                  (transfer_id, batch_id, derived_batch_id, from_clinic_id, to_clinic_id,
                   quantity, reason, tx_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    transfer["transfer_id"],
                    transfer["batch_id"],
                    transfer.get("derived_batch_id"),
                    transfer["from_clinic_id"],
                    transfer["to_clinic_id"],
                    transfer["quantity"],
                    transfer["reason"],
                    None,
                    iso(created),
                ),
            )
            record_event(
                conn,
                "custody_transferred",
                batch_id=transfer.get("derived_batch_id") or transfer["batch_id"],
                from_clinic_id=transfer["from_clinic_id"],
                to_clinic_id=transfer["to_clinic_id"],
                quantity=transfer["quantity"],
                actor="seeded",
                detail=(
                    f"{transfer['quantity']} units moved {transfer['from_clinic_id']} -> "
                    f"{transfer['to_clinic_id']} ({transfer['reason']})"
                ),
            )

        today = now().date()
        for batch in batch_rows:
            expiry_date = datetime.fromisoformat(batch[4].replace("Z", "+00:00")).date()
            if (expiry_date - today).days <= 30:
                record_event(
                    conn,
                    "near_expiry_flagged",
                    batch_id=batch[0],
                    clinic_id=batch[2],
                    quantity=batch[3],
                    actor="seeded",
                    detail=f"{batch[3]} units expire in {(expiry_date - today).days} days",
                )

        conn.commit()
        return True
    finally:
        conn.close()
