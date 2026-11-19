import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[3]
API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

from app.chain import reset_chain  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.main import create_app  # noqa: E402

TOKEN = "test-token"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "stockguard.db"))
    monkeypatch.setenv("CHAIN_MODE", "fake")
    monkeypatch.setenv("SEED_DIR", str(REPO_ROOT / "packages" / "shared" / "seed"))
    monkeypatch.setenv("DEMO_TOKEN", TOKEN)
    monkeypatch.setenv("ALLOW_DEMO_ENDPOINTS", "true")
    monkeypatch.setenv("GEMINI_API_KEY", "")

    reset_chain()
    assert get_settings().database_path.endswith("stockguard.db")

    app = create_app()
    with TestClient(app) as test_client:
        test_client.headers.update({"X-Demo-Token": TOKEN})
        yield test_client
    reset_chain()
