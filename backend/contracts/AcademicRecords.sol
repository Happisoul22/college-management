// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AcademicRecords
 * @dev Stores SHA-256 hashes of academic records (marks, achievements, attendance)
 *      for tamper-proof verification. Data lives in MongoDB; only the hash is on-chain.
 */
contract AcademicRecords {
    // ── Structs ──────────────────────────────────────────────────────────────
    struct Record {
        bytes32 dataHash;      // keccak256 hash of the record data
        uint256 timestamp;     // block timestamp when stored
        address storedBy;      // address that stored the record
        bool exists;           // whether this record exists
    }

    // ── State ────────────────────────────────────────────────────────────────
    // Mapping: recordKey (e.g. "marks_<mongoId>") => Record
    mapping(string => Record) private records;

    // Owner of the contract (deployer)
    address public owner;

    // Total records stored
    uint256 public totalRecords;

    // ── Events ───────────────────────────────────────────────────────────────
    event RecordStored(
        string indexed recordKey,
        bytes32 dataHash,
        uint256 timestamp,
        address storedBy
    );

    event RecordUpdated(
        string indexed recordKey,
        bytes32 oldHash,
        bytes32 newHash,
        uint256 timestamp
    );

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ── Core Functions ───────────────────────────────────────────────────────

    /**
     * @dev Store or update a record hash on-chain
     * @param _recordKey Unique key like "marks_65abc123" or "achievement_65def456"
     * @param _dataHash  keccak256 hash of the JSON-serialized record data
     */
    function storeRecord(string calldata _recordKey, bytes32 _dataHash) external onlyOwner {
        require(_dataHash != bytes32(0), "Data hash cannot be empty");

        if (records[_recordKey].exists) {
            // Update existing record
            bytes32 oldHash = records[_recordKey].dataHash;
            records[_recordKey].dataHash = _dataHash;
            records[_recordKey].timestamp = block.timestamp;
            records[_recordKey].storedBy = msg.sender;

            emit RecordUpdated(_recordKey, oldHash, _dataHash, block.timestamp);
        } else {
            // New record
            records[_recordKey] = Record({
                dataHash: _dataHash,
                timestamp: block.timestamp,
                storedBy: msg.sender,
                exists: true
            });
            totalRecords++;

            emit RecordStored(_recordKey, _dataHash, block.timestamp, msg.sender);
        }
    }

    /**
     * @dev Retrieve a stored record
     * @param _recordKey The unique record key
     * @return dataHash The stored hash
     * @return timestamp When it was stored
     * @return storedBy Who stored it
     * @return exists Whether the record exists
     */
    function getRecord(string calldata _recordKey)
        external
        view
        returns (bytes32 dataHash, uint256 timestamp, address storedBy, bool exists)
    {
        Record memory r = records[_recordKey];
        return (r.dataHash, r.timestamp, r.storedBy, r.exists);
    }

    /**
     * @dev Verify if a data hash matches the stored hash
     * @param _recordKey The unique record key
     * @param _dataHash  The hash to verify against
     * @return verified  True if the hashes match
     * @return storedAt  Timestamp of the stored record
     */
    function verifyRecord(string calldata _recordKey, bytes32 _dataHash)
        external
        view
        returns (bool verified, uint256 storedAt)
    {
        Record memory r = records[_recordKey];
        if (!r.exists) {
            return (false, 0);
        }
        return (r.dataHash == _dataHash, r.timestamp);
    }
}
