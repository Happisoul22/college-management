// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AcademicSystem
 * @dev Fully decentralized academic data registry.
 *      All records are stored as IPFS CIDs. MongoDB is not used.
 *      Data is content-addressed on IPFS and indexed here on-chain.
 */
contract AcademicSystem {

    // ── Structs ───────────────────────────────────────────────────────────────

    struct IPFSRecord {
        string  cid;        // IPFS Content Identifier (CIDv1)
        uint256 timestamp;  // block.timestamp when stored
        address storedBy;   // who called storeRecord()
        bool    exists;
    }

    // ── State ─────────────────────────────────────────────────────────────────

    address public owner;
    uint256 public totalRecords;

    /// Generic record registry: composite key → IPFS CID + metadata
    mapping(string => IPFSRecord) private records;

    /// Email hash → userId  (for O(1) login lookup without Mongo)
    mapping(bytes32 => string) private emailIndex;

    /// userId → list of record keys owned by that user
    mapping(string => string[]) private userRecordKeys;

    /// recordType string → list of all record keys of that type
    mapping(string => string[]) private typeRecordKeys;

    // ── Events ────────────────────────────────────────────────────────────────

    event RecordStored(
        string indexed recordKey,
        string cid,
        string recordType,
        string userId,
        uint256 timestamp,
        address storedBy
    );

    event RecordUpdated(
        string indexed recordKey,
        string oldCid,
        string newCid,
        uint256 timestamp
    );

    event RecordDeleted(string indexed recordKey, uint256 timestamp);

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "AcademicSystem: only owner");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Core Storage ──────────────────────────────────────────────────────────

    /**
     * @dev Store or update a record.
     * @param recordKey   Unique composite key e.g. "user_abc123" / "marks_s1_sub2_2024"
     * @param cid         IPFS CID of the JSON data blob
     * @param recordType  Category: "user" | "marks" | "attendance" | "achievement" |
     *                              "leave" | "subject" | "assignment" | "notification"
     * @param userId      Owner's UUID (or "" for records not tied to a single user)
     */
    function storeRecord(
        string calldata recordKey,
        string calldata cid,
        string calldata recordType,
        string calldata userId
    ) external onlyOwner {
        require(bytes(cid).length > 0,       "AcademicSystem: CID cannot be empty");
        require(bytes(recordKey).length > 0, "AcademicSystem: key cannot be empty");

        if (records[recordKey].exists) {
            // ── Update existing ───────────────────────────────────────────────
            string memory oldCid = records[recordKey].cid;
            records[recordKey].cid       = cid;
            records[recordKey].timestamp = block.timestamp;
            records[recordKey].storedBy  = msg.sender;
            emit RecordUpdated(recordKey, oldCid, cid, block.timestamp);
        } else {
            // ── New record ───────────────────────────────────────────────────
            records[recordKey] = IPFSRecord(cid, block.timestamp, msg.sender, true);
            totalRecords++;

            // Add to type index
            if (bytes(recordType).length > 0) {
                typeRecordKeys[recordType].push(recordKey);
            }

            // Add to user index
            if (bytes(userId).length > 0) {
                userRecordKeys[userId].push(recordKey);
            }

            emit RecordStored(recordKey, cid, recordType, userId, block.timestamp, msg.sender);
        }
    }

    /**
     * @dev Logically delete a record (marks it non-existent; IPFS pin is permanent).
     */
    function deleteRecord(string calldata recordKey) external onlyOwner {
        require(records[recordKey].exists, "AcademicSystem: record not found");
        delete records[recordKey];
        emit RecordDeleted(recordKey, block.timestamp);
    }

    // ── Email Index ───────────────────────────────────────────────────────────

    /**
     * @dev Map a keccak256(email) → userId for O(1) login lookup.
     */
    function setEmailIndex(bytes32 emailHash, string calldata userId) external onlyOwner {
        emailIndex[emailHash] = userId;
    }

    /**
     * @dev Remove email from index (e.g. on account deletion).
     */
    function removeEmailIndex(bytes32 emailHash) external onlyOwner {
        delete emailIndex[emailHash];
    }

    // ── Reads ─────────────────────────────────────────────────────────────────

    function getRecord(string calldata recordKey)
        external view
        returns (string memory cid, uint256 timestamp, address storedBy, bool exists)
    {
        IPFSRecord memory r = records[recordKey];
        return (r.cid, r.timestamp, r.storedBy, r.exists);
    }

    function getUserIdByEmail(bytes32 emailHash) external view returns (string memory) {
        return emailIndex[emailHash];
    }

    /**
     * @dev Get all record keys that belong to a specific user.
     *      Use this to enumerate a user's marks, notifications, etc.
     */
    function getUserRecordKeys(string calldata userId)
        external view returns (string[] memory)
    {
        return userRecordKeys[userId];
    }

    /**
     * @dev Get all record keys of a given type (e.g. all "subject" keys).
     */
    function getTypeRecordKeys(string calldata recordType)
        external view returns (string[] memory)
    {
        return typeRecordKeys[recordType];
    }

    /**
     * @dev Convenience: check whether a CID record exists for a key.
     */
    function recordExists(string calldata recordKey) external view returns (bool) {
        return records[recordKey].exists;
    }
}
