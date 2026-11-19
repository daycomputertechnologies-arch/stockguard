import json
from pathlib import Path

from ..config import REPO_ROOT, Settings
from .base import ChainResult

STATUS_NAMES = ["none", "registered", "in_transit", "dispensed", "recalled"]


class Web3Chain:
    mode = "fuji"

    def __init__(self, settings: Settings) -> None:
        try:
            from web3 import Web3
        except ImportError as exc:
            raise RuntimeError(
                "CHAIN_MODE=fuji needs web3. Run `uv sync --extra chain` in services/api."
            ) from exc

        artifact_path = REPO_ROOT / "packages" / "shared" / "abi" / "DrugBatchRegistry.json"
        if not artifact_path.exists():
            raise RuntimeError("Missing ABI. Run `npm run compile` in contracts/ first.")

        artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
        self._web3 = Web3(Web3.HTTPProvider(settings.rpc_url, request_kwargs={"timeout": 15}))
        self._account = self._web3.eth.account.from_key(settings.operator_private_key)
        self.actor = self._account.address
        self._contract = self._web3.eth.contract(
            address=Web3.to_checksum_address(settings.contract_address),
            abi=artifact["abi"],
        )
        self._chain_id = settings.chain_id

    def _send(self, fn) -> ChainResult:
        tx = fn.build_transaction(
            {
                "from": self.actor,
                "nonce": self._web3.eth.get_transaction_count(self.actor, "pending"),
                "chainId": self._chain_id,
                "gas": 1_500_000,
            }
        )
        signed = self._account.sign_transaction(tx)
        tx_hash = self._web3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self._web3.eth.wait_for_transaction_receipt(tx_hash, timeout=90)
        if receipt.status != 1:
            raise RuntimeError(f"transaction reverted: {tx_hash.hex()}")
        return ChainResult("0x" + tx_hash.hex(), self.actor)

    def register_batch(
        self, batch_id: str, drug_code: str, clinic_id: str, quantity: int, expiry_unix: int
    ) -> ChainResult:
        return self._send(
            self._contract.functions.registerBatch(
                batch_id, drug_code, clinic_id, quantity, expiry_unix
            )
        )

    def transfer_custody(
        self, batch_id: str, to_clinic_id: str, quantity: int, derived_id: str
    ) -> ChainResult:
        return self._send(
            self._contract.functions.transferCustody(
                batch_id, to_clinic_id, quantity, derived_id
            )
        )

    def flag_near_expiry(self, batch_id: str) -> ChainResult:
        return self._send(self._contract.functions.flagNearExpiry(batch_id))

    def get_batch(self, batch_id: str) -> dict | None:
        try:
            raw = self._contract.functions.getBatch(batch_id).call()
        except Exception:
            return None
        return {
            "quantity": int(raw[3]),
            "clinic_id": raw[2],
            "status": STATUS_NAMES[int(raw[5])],
        }

    def health(self) -> dict:
        try:
            connected = self._web3.is_connected()
            block = self._web3.eth.block_number if connected else None
        except Exception:
            connected, block = False, None
        return {
            "chain": "fuji",
            "chain_id": self._chain_id,
            "contract": self._contract.address,
            "connected": connected,
            "block": block,
        }
