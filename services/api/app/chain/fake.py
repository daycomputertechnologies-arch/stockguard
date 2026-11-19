import hashlib
import threading
from dataclasses import dataclass

from .base import ChainResult

DEMO_ACTOR = "0x" + "5a" * 20


@dataclass
class _Entry:
    quantity: int
    clinic_id: str
    status: str


class FakeChain:
    """In-memory chain that mirrors every write, so tamper detection works offline."""

    mode = "fake"
    actor = DEMO_ACTOR

    def __init__(self) -> None:
        self._batches: dict[str, _Entry] = {}
        self._lock = threading.Lock()
        self._nonce = 0

    def _hash(self, *parts: object) -> str:
        self._nonce += 1
        payload = "|".join(str(p) for p in parts) + f"|{self._nonce}"
        return "0x" + hashlib.sha256(payload.encode()).hexdigest()

    def seed_from(self, rows: list[dict]) -> None:
        with self._lock:
            for row in rows:
                self._batches[row["batch_id"]] = _Entry(
                    quantity=row["quantity"],
                    clinic_id=row["clinic_id"],
                    status=row["status"],
                )

    def register_batch(
        self, batch_id: str, drug_code: str, clinic_id: str, quantity: int, expiry_unix: int
    ) -> ChainResult:
        with self._lock:
            self._batches[batch_id] = _Entry(quantity, clinic_id, "registered")
        return ChainResult(self._hash("register", batch_id, quantity), self.actor)

    def transfer_custody(
        self, batch_id: str, to_clinic_id: str, quantity: int, derived_id: str
    ) -> ChainResult:
        with self._lock:
            source = self._batches[batch_id]
            if quantity == source.quantity:
                source.quantity = 0
                source.clinic_id = to_clinic_id
                source.status = "in_transit"
            else:
                source.quantity -= quantity
                self._batches[derived_id] = _Entry(quantity, to_clinic_id, "in_transit")
        target = derived_id or batch_id
        return ChainResult(self._hash("transfer", target, quantity), self.actor)

    def flag_near_expiry(self, batch_id: str) -> ChainResult:
        return ChainResult(self._hash("expiry", batch_id), self.actor)

    def get_batch(self, batch_id: str) -> dict | None:
        entry = self._batches.get(batch_id)
        if entry is None:
            return None
        return {
            "quantity": entry.quantity,
            "clinic_id": entry.clinic_id,
            "status": entry.status,
        }

    def health(self) -> dict:
        return {"chain": "fake", "chain_id": None, "contract": None}
