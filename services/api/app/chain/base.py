from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class ChainResult:
    tx_hash: str
    actor: str
    detail: str = ""


class ChainAdapter(Protocol):
    mode: str
    actor: str

    def register_batch(
        self, batch_id: str, drug_code: str, clinic_id: str, quantity: int, expiry_unix: int
    ) -> ChainResult: ...

    def transfer_custody(
        self, batch_id: str, to_clinic_id: str, quantity: int, derived_id: str
    ) -> ChainResult: ...

    def flag_near_expiry(self, batch_id: str) -> ChainResult: ...

    def get_batch(self, batch_id: str) -> dict | None: ...

    def health(self) -> dict: ...
