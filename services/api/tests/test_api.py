def test_health_reports_seeded_fake_chain(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["db"] == "ok"
    assert body["seed"] == "ok"
    assert body["chain"] == "fake"


def test_catalogue_is_seeded(client):
    clinics = client.get("/api/clinics").json()["clinics"]
    drugs = client.get("/api/drugs").json()["drugs"]
    assert len(clinics) == 12
    assert len(drugs) == 8
    assert {c["clinic_id"] for c in clinics} >= {"CLINIC-A", "CLINIC-B"}
    assert any(d["drug_code"] == "AMOX-500" for d in drugs)


def test_batch_list_and_filter(client):
    all_batches = client.get("/api/batches").json()["batches"]
    assert len(all_batches) >= 10
    langa = client.get("/api/batches", params={"clinic_id": "CLINIC-A"}).json()["batches"]
    assert langa and all(b["clinic_id"] == "CLINIC-A" for b in langa)
    search = client.get("/api/batches", params={"q": "amoxicillin"}).json()["batches"]
    assert search and all("Amoxicillin" in b["drug_name"] for b in search)


def test_impact_is_computed(client):
    impact = client.get("/api/impact").json()
    assert impact["clinics_connected"] == 12
    assert impact["units_in_stock"] > 1000
    assert impact["predicted_stockouts"] == 3
    assert impact["value_at_risk"] > 0
    assert impact["chain_mode"] == "fake"


def test_forecast_flags_the_story_batch(client):
    rows = client.get("/api/forecast", params={"risk": "high"}).json()["rows"]
    assert len(rows) == 3
    top = next(r for r in rows if r["clinic_id"] == "CLINIC-B" and r["drug_code"] == "AMOX-500")
    assert top["on_hand"] == 38
    assert top["days_to_stockout"] < 7
    assert top["suggested_source_batch_id"] == "BATCH-0001"
    assert top["suggested_qty"] == 52


def test_partial_transfer_splits_the_batch(client):
    response = client.post(
        "/api/transfers",
        json={
            "batch_id": "BATCH-0001",
            "to_clinic_id": "CLINIC-B",
            "quantity": 52,
            "reason": "stockout_risk",
        },
    )
    assert response.status_code == 201, response.text
    transfer = response.json()
    assert transfer["derived_batch_id"] == "BATCH-0001-T1"
    assert transfer["tx_hash"].startswith("0x")

    source = client.get("/api/batches/BATCH-0001").json()
    derived = client.get("/api/batches/BATCH-0001-T1").json()
    assert source["quantity"] == 188
    assert source["clinic_id"] == "CLINIC-A"
    assert derived["quantity"] == 52
    assert derived["clinic_id"] == "CLINIC-B"
    assert derived["derived_from"] == "BATCH-0001"

    check = client.get("/api/batches/BATCH-0001-T1/verify").json()
    assert check["match"] is True


def test_transfer_rejects_overdraw_and_same_clinic(client):
    over = client.post(
        "/api/transfers",
        json={"batch_id": "BATCH-0002", "to_clinic_id": "CLINIC-A", "quantity": 9999},
    )
    assert over.status_code == 409
    same = client.post(
        "/api/transfers",
        json={"batch_id": "BATCH-0002", "to_clinic_id": "CLINIC-B", "quantity": 1},
    )
    assert same.status_code == 409


def test_tamper_is_caught_by_verify(client):
    before = client.get("/api/batches/BATCH-0001/verify").json()
    assert before["match"] is True

    tamper = client.post("/api/demo/tamper", json={"batch_id": "BATCH-0001", "quantity": 9999})
    assert tamper.status_code == 200

    after = client.get("/api/batches/BATCH-0001/verify").json()
    assert after["match"] is False
    assert after["db"]["quantity"] == 9999
    assert after["chain"]["quantity"] == 240

    events = client.get("/api/audit", params={"batch_id": "BATCH-0001"}).json()["events"]
    assert events[0]["type"] == "tampered"


def test_scan_accepts_qr_and_bare_id(client):
    qr = client.get(
        "/api/batches/scan", params={"payload": "stockguard://batch/BATCH-0001"}
    )
    assert qr.status_code == 200
    assert qr.json()["batch_id"] == "BATCH-0001"

    bare = client.get("/api/batches/scan", params={"payload": "BATCH-0002"})
    assert bare.status_code == 200

    bad = client.get("/api/batches/scan", params={"payload": "https://example.com"})
    assert bad.status_code == 400


def test_flag_expiry_is_idempotent_safe(client):
    first = client.post("/api/batches/BATCH-0002/flag-expiry")
    assert first.status_code == 200
    assert first.json()["tx_hash"].startswith("0x")
    second = client.post("/api/batches/BATCH-0002/flag-expiry")
    assert second.status_code == 409


def test_agent_returns_a_transfer_action(client):
    response = client.post(
        "/api/agent/chat",
        json={
            "message": "Why is Khayelitsha Site B short of amoxicillin?",
            "clinic_id": "CLINIC-B",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "CLINIC-B".lower() in body["reply"].lower() or "Khayelitsha" in body["reply"]
    assert body["source"] == "rules"
    assert body["actions"] == [
        {
            "type": "suggest_transfer",
            "batch_id": "BATCH-0001",
            "to_clinic_id": "CLINIC-B",
            "quantity": 52,
        }
    ]


def test_writes_require_demo_token(client):
    response = client.post(
        "/api/batches",
        json={
            "batch_id": "BATCH-0100",
            "drug_code": "AMOX-500",
            "clinic_id": "CLINIC-A",
            "quantity": 10,
            "expiry": "2027-01-01T00:00:00Z",
        },
        headers={"X-Demo-Token": "wrong"},
    )
    assert response.status_code == 401
    assert response.json()["detail"]["error"] == "unauthorized"


def test_create_batch_then_read_it_back(client):
    created = client.post(
        "/api/batches",
        json={
            "batch_id": "BATCH-0100",
            "drug_code": "AMOX-500",
            "clinic_id": "CLINIC-A",
            "quantity": 10,
            "expiry": "2027-01-01T00:00:00Z",
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["tx_hash"].startswith("0x")
    assert body["status"] == "registered"
    duplicate = client.post(
        "/api/batches",
        json={
            "batch_id": "BATCH-0100",
            "drug_code": "AMOX-500",
            "clinic_id": "CLINIC-A",
            "quantity": 10,
            "expiry": "2027-01-01T00:00:00Z",
        },
    )
    assert duplicate.status_code == 409


def test_audit_trail_is_seeded(client):
    events = client.get("/api/audit").json()["events"]
    types = {event["type"] for event in events}
    assert {"batch_registered", "custody_transferred", "near_expiry_flagged"} <= types
    assert len(events) >= 15
