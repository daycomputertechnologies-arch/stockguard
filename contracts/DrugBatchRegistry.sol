// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DrugBatchRegistry
/// @notice Minimal batch custody + expiry registry for StockGuard (Avalanche Fuji).
/// @dev Four writes total. No tokens, no proxy, no upgrades. Backend key is the only operator.
contract DrugBatchRegistry {
    enum Status {
        None,
        Registered,
        InTransit,
        Dispensed,
        Recalled
    }

    struct Batch {
        string batchId;
        string drugCode;
        string clinicId;
        uint256 quantity;
        uint64 expiry;
        Status status;
        uint64 updatedAt;
        string derivedFrom;
    }

    address public owner;
    string public network;
    mapping(address => bool) public operators;
    mapping(bytes32 => Batch) private _batches;
    uint256 public batchCount;

    event OperatorSet(address indexed operator, bool allowed);

    event BatchRegistered(
        bytes32 indexed key,
        string batchId,
        string drugCode,
        string clinicId,
        uint256 quantity,
        uint64 expiry,
        string derivedFrom,
        address indexed actor
    );

    event CustodyTransferred(
        bytes32 indexed key,
        string batchId,
        string fromClinicId,
        string toClinicId,
        uint256 quantity,
        address indexed actor
    );

    event NearExpiryFlagged(
        bytes32 indexed key,
        string batchId,
        uint64 expiry,
        uint64 flaggedAt,
        address indexed actor
    );

    error NotOwner();
    error NotOperator();
    error ZeroAddress();
    error EmptyId();
    error BadQuantity();
    error BatchExists(string batchId);
    error UnknownBatch(string batchId);
    error SameClinic();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOperator() {
        if (!operators[msg.sender]) revert NotOperator();
        _;
    }

    constructor(string memory network_) {
        if (msg.sender == address(0)) revert ZeroAddress();
        owner = msg.sender;
        operators[msg.sender] = true;
        network = network_;
        emit OperatorSet(msg.sender, true);
    }

    function keyOf(string memory batchId) public pure returns (bytes32) {
        return keccak256(bytes(batchId));
    }

    /// @notice Register a new batch and assign custody to its clinic.
    function registerBatch(
        string calldata batchId,
        string calldata drugCode,
        string calldata clinicId,
        uint256 quantity,
        uint64 expiry
    ) external onlyOperator {
        _register(batchId, drugCode, clinicId, quantity, expiry, "");
    }

    /// @notice Register a batch derived from a parent (used by partial transfers).
    function _register(
        string memory batchId,
        string memory drugCode,
        string memory clinicId,
        uint256 quantity,
        uint64 expiry,
        string memory derivedFrom
    ) private {
        if (bytes(batchId).length == 0 || bytes(clinicId).length == 0) revert EmptyId();
        if (quantity == 0) revert BadQuantity();

        bytes32 key = keccak256(bytes(batchId));
        if (_batches[key].status != Status.None) revert BatchExists(batchId);

        _batches[key] = Batch({
            batchId: batchId,
            drugCode: drugCode,
            clinicId: clinicId,
            quantity: quantity,
            expiry: expiry,
            status: Status.Registered,
            updatedAt: uint64(block.timestamp),
            derivedFrom: derivedFrom
        });
        batchCount += 1;

        emit BatchRegistered(key, batchId, drugCode, clinicId, quantity, expiry, derivedFrom, msg.sender);
    }

    /// @notice Move part or all of a batch from its current clinic to another clinic.
    /// @dev A partial move splits the batch: the source keeps its remaining units, the
    ///      destination receives the derived batch named by `derivedId` (the backend owns
    ///      id generation so API and chain always agree). Ignored on a full move.
    function transferCustody(
        string calldata batchId,
        string calldata toClinicId,
        uint256 quantity,
        string calldata derivedId
    ) external onlyOperator {
        if (bytes(toClinicId).length == 0) revert EmptyId();
        if (quantity == 0) revert BadQuantity();

        bytes32 key = keccak256(bytes(batchId));
        Batch storage b = _batches[key];
        if (b.status == Status.None) revert UnknownBatch(batchId);
        if (quantity > b.quantity) revert BadQuantity();
        if (keccak256(bytes(toClinicId)) == keccak256(bytes(b.clinicId))) revert SameClinic();

        string memory fromClinicId = b.clinicId;

        if (quantity == b.quantity) {
            b.clinicId = toClinicId;
            b.status = Status.InTransit;
            b.updatedAt = uint64(block.timestamp);
            emit CustodyTransferred(key, batchId, fromClinicId, toClinicId, quantity, msg.sender);
            return;
        }

        if (bytes(derivedId).length == 0) revert EmptyId();
        if (_batches[keccak256(bytes(derivedId))].status != Status.None) revert BatchExists(derivedId);

        b.quantity -= quantity;
        b.updatedAt = uint64(block.timestamp);
        emit CustodyTransferred(key, batchId, fromClinicId, toClinicId, quantity, msg.sender);

        _batches[keccak256(bytes(derivedId))] = Batch({
            batchId: derivedId,
            drugCode: b.drugCode,
            clinicId: toClinicId,
            quantity: quantity,
            expiry: b.expiry,
            status: Status.InTransit,
            updatedAt: uint64(block.timestamp),
            derivedFrom: batchId
        });
        batchCount += 1;

        emit BatchRegistered(
            keccak256(bytes(derivedId)),
            derivedId,
            b.drugCode,
            toClinicId,
            quantity,
            b.expiry,
            batchId,
            msg.sender
        );
        emit CustodyTransferred(
            keccak256(bytes(derivedId)),
            derivedId,
            fromClinicId,
            toClinicId,
            quantity,
            msg.sender
        );
    }

    /// @notice On-chain proof that a batch was flagged for expiry handling.
    function flagNearExpiry(string calldata batchId) external onlyOperator {
        bytes32 key = keccak256(bytes(batchId));
        Batch storage b = _batches[key];
        if (b.status == Status.None) revert UnknownBatch(batchId);

        b.updatedAt = uint64(block.timestamp);
        emit NearExpiryFlagged(key, batchId, b.expiry, uint64(block.timestamp), msg.sender);
    }

    function getBatch(string calldata batchId) external view returns (Batch memory) {
        bytes32 key = keccak256(bytes(batchId));
        Batch memory b = _batches[key];
        if (b.status == Status.None) revert UnknownBatch(batchId);
        return b;
    }

    function setOperator(address operator, bool allowed) external onlyOwner {
        if (operator == address(0)) revert ZeroAddress();
        operators[operator] = allowed;
        emit OperatorSet(operator, allowed);
    }
}
