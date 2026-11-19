import sqlite3

from fastapi import APIRouter, Depends

from ..db import get_db, rows_to_dicts

router = APIRouter(tags=["catalog"])


@router.get("/clinics")
def list_clinics(db: sqlite3.Connection = Depends(get_db)) -> dict:
    rows = db.execute(
        "SELECT clinic_id, name, district, lat, lng FROM clinics ORDER BY name"
    ).fetchall()
    return {"clinics": rows_to_dicts(rows)}


@router.get("/drugs")
def list_drugs(db: sqlite3.Connection = Depends(get_db)) -> dict:
    rows = db.execute(
        "SELECT drug_code, name, form, unit_cost, shelf_life_days FROM drugs ORDER BY name"
    ).fetchall()
    return {"drugs": rows_to_dicts(rows)}
