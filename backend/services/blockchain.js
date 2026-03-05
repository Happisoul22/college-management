/**
 * services/blockchain.js
 *
 * Ethereum blockchain service for tamper-proof academic record verification.
 * Connects to a local Hardhat node, loads the AcademicRecords smart contract,
 * and exposes helpers for storing / verifying record hashes.
 *
 * Gracefully degrades: if the blockchain is unavailable, operations log a
 * warning and return null instead of crashing the application.
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// ── State ────────────────────────────────────────────────────────────────────
let provider = null;
let signers = [];
let rawContract = null;
let isConnected = false;

const getContract = () => {
    if (!rawContract || signers.length === 0) return null;
    const randomSigner = signers[Math.floor(Math.random() * signers.length)];
    return rawContract.connect(randomSigner);
};

// ── Initialization ───────────────────────────────────────────────────────────

/**
 * Initialize the blockchain connection and load the deployed contract.
 * Called once during server startup.
 */
const initBlockchain = async () => {
    try {
        const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';

        // Connect to local Hardhat node
        provider = new ethers.JsonRpcProvider(rpcUrl);

        // Verify connection
        const network = await provider.getNetwork();
        console.log(`⛓  Blockchain connected: chainId ${network.chainId}`);

        let keys = [];
        if (process.env.BLOCKCHAIN_KEYS) {
            keys = process.env.BLOCKCHAIN_KEYS.split(',');
        } else if (process.env.BLOCKCHAIN_PRIVATE_KEY) {
            keys = [process.env.BLOCKCHAIN_PRIVATE_KEY];
        } else {
            keys = ['0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'];
        }
        signers = keys.map(k => new ethers.Wallet(k.trim(), provider));

        // Load contract ABI and address
        const deploymentPath = path.join(__dirname, '..', 'blockchain', 'deployment.json');
        const abiPath = path.join(__dirname, '..', 'blockchain', 'AcademicRecordsABI.json');

        if (!fs.existsSync(deploymentPath) || !fs.existsSync(abiPath)) {
            console.warn('⚠  Blockchain contract not deployed. Run: npx hardhat run scripts/deploy.js --network localhost');
            return;
        }

        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));

        const contractAddress = process.env.CONTRACT_ADDRESS || deployment.address;
        rawContract = new ethers.Contract(contractAddress, abi, provider);

        // Quick sanity check
        const totalRecords = await rawContract.totalRecords();
        console.log(`⛓  AcademicRecords contract loaded at ${contractAddress} (${totalRecords} records on-chain)`);

        isConnected = true;
    } catch (err) {
        console.warn(`⚠  Blockchain initialization failed: ${err.message}`);
        console.warn('   The app will continue without blockchain verification.');
        isConnected = false;
    }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a deterministic hash of a data object.
 * Sorts keys to ensure the same data always produces the same hash.
 */
const hashData = (dataObject) => {
    const sorted = JSON.stringify(dataObject, Object.keys(dataObject).sort());
    return ethers.keccak256(ethers.toUtf8Bytes(sorted));
};

/**
 * Build a record key from type and MongoDB ID.
 * e.g., "marks_65abc123def456789"
 */
const buildRecordKey = (type, mongoId) => `${type}_${mongoId.toString()}`;

/**
 * Extract the relevant fields from a record for hashing.
 * We only hash the immutable/critical fields, not metadata like updatedAt.
 */
const extractHashableData = (type, record) => {
    switch (type) {
        case 'marks':
            return {
                student: record.student?.toString() || record.student,
                subject: record.subject?.toString() || record.subject,
                semester: record.semester,
                year: record.year,
                academicYear: record.academicYear || '',
                internalTotal: record.internalTotal,
                externalTotal: record.externalTotal,
                totalMarks: record.totalMarks,
                grade: record.grade,
                gradePoint: record.gradePoint
            };
        case 'achievement':
            return {
                user: record.user?.toString() || record.user,
                type: record.type,
                title: record.title,
                description: record.description,
                year: record.year,
                status: record.status
            };
        case 'attendance':
            return {
                student: record.student?.toString() || record.student,
                subject: record.subject?.toString() || record.subject,
                date: record.date?.toISOString?.() || record.date,
                status: record.status,
                period: record.period
            };
        case 'user':
            return {
                name: record.name,
                email: record.email,
                role: record.role
            };
        case 'login':
            return {
                user: record.user?.toString() || record.user,
                timestamp: record.timestamp?.toISOString?.() || record.timestamp
            };
        case 'assignment':
            return {
                faculty: record.faculty?.toString() || record.faculty,
                department: record.department,
                section: record.section || '',
                year: record.year || '',
                studentCounts: record.students ? record.students.length : 0
            };
        case 'leave':
            return {
                user: record.user?.toString() || record.user,
                applicantRole: record.applicantRole,
                type: record.type,
                startDate: record.startDate?.toISOString?.() || record.startDate,
                endDate: record.endDate?.toISOString?.() || record.endDate,
                status: record.status,
                approvedBy: record.approvedBy?.toString() || record.approvedBy || ''
            };
        default:
            return record;
    }
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Store a record hash on the blockchain.
 * @param {string} type - Record type: 'marks', 'achievement', 'attendance'
 * @param {string} mongoId - MongoDB document _id
 * @param {Object} dataObject - The full MongoDB document (will extract hashable fields)
 * @returns {Object|null} - { txHash, recordKey, dataHash } or null if unavailable
 */
const storeRecordHash = async (type, mongoId, dataObject) => {
    const contract = getContract();
    if (!isConnected || !contract) {
        console.warn(`⚠  Blockchain unavailable, skipping hash storage for ${type}/${mongoId}`);
        return null;
    }

    try {
        const recordKey = buildRecordKey(type, mongoId);
        const hashableData = extractHashableData(type, dataObject);
        const dataHash = hashData(hashableData);

        const tx = await contract.storeRecord(recordKey, dataHash);
        const receipt = await tx.wait();

        console.log(`⛓  Stored ${type}/${mongoId} on-chain (tx: ${receipt.hash})`);

        return {
            txHash: receipt.hash,
            recordKey,
            dataHash,
            blockNumber: receipt.blockNumber
        };
    } catch (err) {
        console.error(`⚠  Blockchain store failed for ${type}/${mongoId}:`, err.message);
        return null;
    }
};

/**
 * Verify a record's integrity against the blockchain.
 * @param {string} type - Record type
 * @param {string} mongoId - MongoDB document _id
 * @param {Object} dataObject - Current MongoDB document data
 * @returns {Object} - { verified, storedAt, currentHash, storedHash }
 */
const verifyRecordHash = async (type, mongoId, dataObject) => {
    if (!isConnected || !rawContract) {
        return { verified: false, error: 'Blockchain not connected' };
    }

    try {
        const recordKey = buildRecordKey(type, mongoId);
        const hashableData = extractHashableData(type, dataObject);
        const currentHash = hashData(hashableData);

        const [storedHash, timestamp, storedBy, exists] = await rawContract.getRecord(recordKey);

        if (!exists) {
            return {
                verified: false,
                error: 'Record not found on blockchain',
                recordKey
            };
        }

        const verified = storedHash === currentHash;
        const storedAt = new Date(Number(timestamp) * 1000).toISOString();

        return {
            verified,
            recordKey,
            storedAt,
            storedBy,
            currentHash,
            storedHash,
            ...(verified ? {} : { warning: 'Data may have been tampered with!' })
        };
    } catch (err) {
        console.error(`⚠  Blockchain verify failed for ${type}/${mongoId}:`, err.message);
        return { verified: false, error: err.message };
    }
};

/**
 * Get blockchain record info (without verification).
 */
const getRecordInfo = async (type, mongoId) => {
    if (!isConnected || !rawContract) {
        return { error: 'Blockchain not connected' };
    }

    try {
        const recordKey = buildRecordKey(type, mongoId);
        const [dataHash, timestamp, storedBy, exists] = await rawContract.getRecord(recordKey);

        if (!exists) {
            return { exists: false, recordKey };
        }

        return {
            exists: true,
            recordKey,
            dataHash,
            storedAt: new Date(Number(timestamp) * 1000).toISOString(),
            storedBy
        };
    } catch (err) {
        return { error: err.message };
    }
};

/**
 * Get the current blockchain connection status.
 */
const getStatus = async () => {
    if (!isConnected) {
        return { connected: false, message: 'Blockchain not connected' };
    }

    try {
        const network = await provider.getNetwork();
        const totalRecords = await rawContract.totalRecords();
        const contractAddress = await rawContract.getAddress();

        return {
            connected: true,
            network: {
                chainId: Number(network.chainId),
                name: network.name
            },
            contractAddress,
            totalRecords: Number(totalRecords),
            signerAddress: signers.length > 0 ? signers[0].address : null,
            availableSigners: signers.length
        };
    } catch (err) {
        return { connected: false, error: err.message };
    }
};

module.exports = {
    initBlockchain,
    storeRecordHash,
    verifyRecordHash,
    getRecordInfo,
    getStatus,
    hashData,
    extractHashableData,
    buildRecordKey
};
