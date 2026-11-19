from dataclasses import dataclass
from os import getenv
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_path: str
    seed_dir: str
    demo_token: str
    allow_demo_endpoints: bool
    cors_origins: list[str]
    chain_mode: str
    rpc_url: str
    chain_id: int
    contract_address: str
    operator_private_key: str
    explorer_base: str
    gemini_api_key: str

    @property
    def seed_path(self) -> Path:
        return Path(self.seed_dir)


def get_settings() -> Settings:
    seed_default = REPO_ROOT / "packages" / "shared" / "seed"
    db_default = REPO_ROOT / "stockguard.db"
    origins = getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8080")

    return Settings(
        database_path=getenv("DATABASE_PATH", str(db_default)),
        seed_dir=getenv("SEED_DIR", str(seed_default)),
        demo_token=getenv("DEMO_TOKEN", "stockguard-demo"),
        allow_demo_endpoints=_bool(getenv("ALLOW_DEMO_ENDPOINTS"), default=True),
        cors_origins=[o.strip() for o in origins.split(",") if o.strip()],
        chain_mode=getenv("CHAIN_MODE", "fake").strip().lower(),
        rpc_url=getenv("FUJI_RPC_URL", ""),
        chain_id=int(getenv("CHAIN_ID", "43113")),
        contract_address=getenv("CONTRACT_ADDRESS", ""),
        operator_private_key=getenv("OPERATOR_PRIVATE_KEY", ""),
        explorer_base=getenv("EXPLORER_BASE", "https://testnet.snowtrace.io").rstrip("/"),
        gemini_api_key=getenv("GEMINI_API_KEY", ""),
    )
