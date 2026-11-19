from ..config import Settings
from .base import ChainAdapter, ChainResult
from .fake import FakeChain

_chain: ChainAdapter | None = None


def build_chain(settings: Settings) -> ChainAdapter:
    if settings.chain_mode == "fuji":
        if not (settings.rpc_url and settings.contract_address and settings.operator_private_key):
            raise RuntimeError(
                "CHAIN_MODE=fuji needs FUJI_RPC_URL, CONTRACT_ADDRESS and OPERATOR_PRIVATE_KEY."
            )
        from .web3_adapter import Web3Chain

        return Web3Chain(settings)
    return FakeChain()


def init_chain(settings: Settings) -> ChainAdapter:
    global _chain
    _chain = build_chain(settings)
    return _chain


def get_chain() -> ChainAdapter:
    global _chain
    if _chain is None:
        from ..config import get_settings

        _chain = build_chain(get_settings())
    return _chain


def reset_chain() -> None:
    global _chain
    _chain = None


__all__ = [
    "ChainAdapter",
    "ChainResult",
    "FakeChain",
    "build_chain",
    "get_chain",
    "init_chain",
    "reset_chain",
]
