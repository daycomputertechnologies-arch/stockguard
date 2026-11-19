import sqlite3
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

from fastapi import Depends

from .config import Settings, get_settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS clinics (
    clinic_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    district TEXT NOT NULL,
    lat REAL,
    lng REAL
);

CREATE TABLE IF NOT EXISTS drugs (
    drug_code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    form TEXT NOT NULL,
    unit_cost REAL NOT NULL,
    shelf_life_days INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS batches (
    batch_id TEXT PRIMARY KEY,
    drug_code TEXT NOT NULL REFERENCES drugs(drug_code),
    clinic_id TEXT NOT NULL REFERENCES clinics(clinic_id),
    quantity INTEGER NOT NULL,
    expiry TEXT NOT NULL,
    status TEXT NOT NULL,
    derived_from TEXT,
    tx_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transfers (
    transfer_id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    derived_batch_id TEXT,
    from_clinic_id TEXT NOT NULL,
    to_clinic_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    tx_hash TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage (
    clinic_id TEXT NOT NULL REFERENCES clinics(clinic_id),
    drug_code TEXT NOT NULL REFERENCES drugs(drug_code),
    daily_use REAL NOT NULL,
    PRIMARY KEY (clinic_id, drug_code)
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    batch_id TEXT,
    clinic_id TEXT,
    from_clinic_id TEXT,
    to_clinic_id TEXT,
    quantity INTEGER,
    actor TEXT,
    tx_hash TEXT,
    detail TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_batches_clinic ON batches(clinic_id);
CREATE INDEX IF NOT EXISTS idx_events_batch ON events(batch_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
"""


def now() -> datetime:
    return datetime.now(UTC)


def iso(moment: datetime | None = None) -> str:
    return (moment or now()).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def connect(settings: Settings) -> sqlite3.Connection:
    path = Path(settings.database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db(settings: Settings) -> None:
    conn = connect(settings)
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()


def get_db() -> Iterator[sqlite3.Connection]:
    conn = connect(get_settings())
    try:
        yield conn
    finally:
        conn.close()


DbDep = Depends(get_db)


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row is not None else None


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict]:
    return [dict(row) for row in rows]
