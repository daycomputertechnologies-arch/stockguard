from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .chain import FakeChain, get_chain, init_chain
from .config import get_settings
from .db import connect
from .seed import seed
from .routers import audit, batches, catalog, demo, health, intelligence, transfers


def _mirror_chain_state() -> None:
    chain = get_chain()
    if not isinstance(chain, FakeChain):
        return
    conn = connect(get_settings())
    try:
        rows = conn.execute(
            "SELECT batch_id, quantity, clinic_id, status FROM batches"
        ).fetchall()
        chain.seed_from([dict(row) for row in rows])
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    init_chain(settings)
    seed(settings)
    _mirror_chain_state()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="StockGuard API",
        version="1.1.0",
        description="Clinic stockout and expiry prevention with on-chain custody.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for module in (health, catalog, batches, transfers, intelligence, audit, demo):
        app.include_router(module.router, prefix="/api")

    @app.get("/", include_in_schema=False)
    def root() -> dict:
        return {"name": "StockGuard API", "docs": "/docs", "health": "/api/health"}

    return app


app = create_app()
