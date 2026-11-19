import sqlite3

from fastapi import APIRouter, Depends

from ..chain import get_chain
from ..config import get_settings
from ..db import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: sqlite3.Connection = Depends(get_db)) -> dict:
    chain = get_chain()
    info = chain.health()
    try:
        db.execute("SELECT 1").fetchone()
        db_status = "ok"
    except Exception:
        db_status = "error"
    try:
        batches = db.execute("SELECT COUNT(*) AS n FROM batches").fetchone()["n"]
        seed_status = "ok" if batches > 0 else "empty"
    except Exception:
        seed_status = "error"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "chain": info.get("chain", get_settings().chain_mode),
        "chain_id": info.get("chain_id"),
        "contract": info.get("contract"),
        "db": db_status,
        "seed": seed_status,
    }
