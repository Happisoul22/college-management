/**
 * services/blockchain.js
 *
 * Ethereum blockchain service — fully decentralized mode.
 * Works together with services/ipfs.js:
 *   • Write: ipfs.uploadJSON(data) → CID → storeRecord(key, cid) on-chain
 *   • Read : getRecord(key) → CID → ipfs.fetchJSON(cid)
 *
 * Connects to Hardhat local node (or any EVM-compatible RPC).
 * Gracefully degrades if blockchain is unavailable.
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const ipfs = require('./ipfs');

// ── Local IPFS store path (mirrors services/ipfs.js) ─────────────────────────
const LOCAL_STORE_PATH = path.join(__dirname, '..', 'ipfs_local_store');
const LOCAL_KEY_INDEX_PATH = path.join(LOCAL_STORE_PATH, 'local_key_index.json');

// Persist a recordKey → CID mapping to disk so getRecord works offline
const saveKeyIndex = (recordKey, cid) => {
    try {
        let index = {};
        if (fs.existsSync(LOCAL_KEY_INDEX_PATH)) {
            index = JSON.parse(fs.readFileSync(LOCAL_KEY_INDEX_PATH, 'utf-8'));
        }
        index[recordKey] = cid;
        fs.writeFileSync(LOCAL_KEY_INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
    } catch (e) { /* non-fatal */ }
};

const getLocalCid = (recordKey) => {
    try {
        if (fs.existsSync(LOCAL_KEY_INDEX_PATH)) {
            const index = JSON.parse(fs.readFileSync(LOCAL_KEY_INDEX_PATH, 'utf-8'));
            return index[recordKey] || null;
        }
    } catch (e) { /* non-fatal */ }
    return null;
};

// Scan ALL files in local IPFS store and return records matching a recordType.
// Uses ipfs.fetchJSON so that AES-encrypted envelopes are transparently decrypted.
const scanLocalIPFSStore = async (recordType) => {
    const results = [];
    if (!fs.existsSync(LOCAL_STORE_PATH)) return results;

    // Build reverse map: cid → recordKey (from key index)
    let cidToKey = {};
    if (fs.existsSync(LOCAL_KEY_INDEX_PATH)) {
        try {
            const keyIndex = JSON.parse(fs.readFileSync(LOCAL_KEY_INDEX_PATH, 'utf-8'));
            for (const [k, cid] of Object.entries(keyIndex)) {
                cidToKey[cid] = k;
            }
        } catch (e) { /* non-fatal */ }
    }

    let typePrefix = recordType + '_';
    if (recordType === 'subject') typePrefix = 'subj_';
    else if (recordType === 'user') typePrefix = 'user_';
    else if (recordType === 'leave') typePrefix = 'leave_';
    else if (recordType === 'achievement') typePrefix = 'ach_';
    else if (recordType === 'notification') typePrefix = 'notif_';
    else if (recordType === 'classassign') typePrefix = 'ca_';
    else if (recordType === 'counselassign') typePrefix = 'counsel_';
    else if (recordType === 'attendance') typePrefix = 'att_';
    else if (recordType === 'project') typePrefix = 'proj_';
    else if (recordType === 'projrole') typePrefix = 'projrole_';
    else if (recordType === 'projsched') typePrefix = 'projsched_';

    const files = fs.readdirSync(LOCAL_STORE_PATH).filter(f => f.endsWith('.json') && !f.startsWith('local_'));

    // Only process keys that belong to this record type
    const relevantEntries = Object.entries(cidToKey).filter(([, key]) => key.startsWith(typePrefix));

    await Promise.all(relevantEntries.map(async ([cid, key]) => {
        try {
            // fetchJSON handles decryption of AES-encrypted envelopes automatically
            const data = await ipfs.fetchJSON(cid);
            results.push({ key, data, cid, timestamp: 0, storedBy: '' });
        } catch (e) {
            console.warn(`scanLocalIPFSStore: skipping ${cid} (${e.message})`);
        }
    }));

    return results;
};

// ── State ─────────────────────────────────────────────────────────────────────

let provider = null;
let signers = [];
let rawContract = null;
let isConnected = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

const getContract = () => {
    if (!rawContract || signers.length === 0) return null;
    const signer = signers[Math.floor(Math.random() * signers.length)];
    return rawContract.connect(signer);
};

// ── Initialization ────────────────────────────────────────────────────────────

const initBlockchain = async () => {
    try {
        const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545';
        provider = new ethers.JsonRpcProvider(rpcUrl);

        const network = await provider.getNetwork();
        console.log(`⛓  Blockchain connected: chainId ${network.chainId}`);

        // Load private keys or use node signer
        if (process.env.BLOCKCHAIN_KEYS) {
            const keys = process.env.BLOCKCHAIN_KEYS.split(',').map(k => k.trim());
            signers = keys.map(k => new ethers.Wallet(k, provider));
        } else if (process.env.BLOCKCHAIN_PRIVATE_KEY) {
            const keys = [process.env.BLOCKCHAIN_PRIVATE_KEY.trim()];
            signers = keys.map(k => new ethers.Wallet(k, provider));
        } else {
            const signer = await provider.getSigner(0);
            signers = [signer];
        }

        // Load ABI + deployment
        const deploymentPath = path.join(__dirname, '..', 'blockchain', 'deployment.json');
        const abiPath = path.join(__dirname, '..', 'blockchain', 'AcademicSystemABI.json');

        if (!fs.existsSync(deploymentPath) || !fs.existsSync(abiPath)) {
            console.warn('⚠  Contract not deployed. Run: npx hardhat run scripts/deploy.js --network localhost');
            return;
        }

        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
        const contractAddress = process.env.CONTRACT_ADDRESS || deployment.address;

        rawContract = new ethers.Contract(contractAddress, abi, provider);

        const total = await rawContract.totalRecords();
        console.log(`⛓  AcademicSystem contract at ${contractAddress} (${total} records)`);

        // Also test IPFS
        const ipfsStatus = await ipfs.testConnection();
        console.log(`📦 IPFS: ${ipfsStatus.provider} – ${ipfsStatus.ok ? 'OK' : 'FAILED'}`);

        isConnected = true;
    } catch (err) {
        console.warn(`⚠  Blockchain init failed: ${err.message}`);
        console.warn('   App will continue – blockchain writes will be skipped.');
        isConnected = false;
    }
};

// ── Core Write ────────────────────────────────────────────────────────────────

/**
 * Upload data to IPFS then store the CID on-chain.
 *
 * @param {string} recordType  - "user" | "marks" | "attendance" | "achievement" | "leave" | "subject" | "assignment" | "notification"
 * @param {string} recordKey   - Unique composite key for this specific record
 * @param {Object} data        - Plain JS object to persist
 * @param {string} [userId]    - Owner's userId string (for per-user index)
 * @returns {Promise<{cid, txHash, recordKey, blockNumber}|null>}
 */
const storeRecord = async (recordType, recordKey, data, userId = '') => {
    if (!isConnected) {
        console.warn(`⚠  Blockchain unavailable – skipping store for ${recordType}/${recordKey}`);
        // Still try IPFS-only (useful in tests)
        try {
            const cid = await ipfs.uploadJSON(data, `${recordType}-${recordKey}`);
            console.log(`📦 IPFS-only store: ${recordKey} → ${cid}`);
            saveKeyIndex(recordKey, cid);  // persist key→CID to disk
            typeCache.delete(`type_${recordType}`); // Invalidate cache in fallback mode
            return { cid, txHash: null, recordKey, blockNumber: null };
        } catch (e) {
            console.error('IPFS-only store also failed:', e.message);
            return null;
        }
    }

    try {
        // 1. Upload data to IPFS
        const cid = await ipfs.uploadJSON(data, `${recordType}-${recordKey}`);

        // 2. Store CID on-chain
        const contract = getContract();
        const tx = await contract.storeRecord(recordKey, cid, recordType, userId);
        const receipt = await tx.wait();

        // 3. Persist the key→CID mapping locally so fallback works
        saveKeyIndex(recordKey, cid);

        console.log(`⛓  Stored ${recordType}/${recordKey} → CID: ${cid} (tx: ${receipt.hash})`);

        // Invalidate type cache
        typeCache.delete(`type_${recordType}`);

        return {
            cid,
            txHash: receipt.hash,
            recordKey,
            blockNumber: receipt.blockNumber
        };
    } catch (err) {
        console.error(`⚠  storeRecord failed [${recordType}/${recordKey}]:`, err.message);
        return null;
    }
};

// ── Core Read ─────────────────────────────────────────────────────────────────

/**
 * Read a record: get CID from chain, fetch JSON from IPFS.
 *
 * @param {string} recordKey
 * @returns {Promise<{data, cid, timestamp, storedBy}|null>}
 */
const getRecord = async (recordKey) => {
    // Try blockchain first
    if (rawContract) {
        try {
            const [cid, timestamp, storedBy, exists] = await rawContract.getRecord(recordKey);
            if (exists && cid) {
                const data = await ipfs.fetchJSON(cid);
                return { data, cid, timestamp: Number(timestamp), storedBy };
            }
        } catch (err) {
            console.error(`⚠  getRecord blockchain failed [${recordKey}]:`, err.message);
        }
    }

    // Fallback: look up CID in local key index then fetch from local IPFS store
    const localCid = getLocalCid(recordKey);
    if (localCid) {
        try {
            const data = await ipfs.fetchJSON(localCid);
            return { data, cid: localCid, timestamp: 0, storedBy: '' };
        } catch (err) {
            console.error(`⚠  getRecord local fallback failed [${recordKey}]:`, err.message);
        }
    }

    return null;
};

// ── Enumeration ───────────────────────────────────────────────────────────────

/**
 * Get all record keys for a user, optionally filtered by record type prefix.
 */
const getUserRecordKeys = async (userId, typePrefix = null) => {
    if (!rawContract) return [];
    try {
        const keys = await rawContract.getUserRecordKeys(userId);
        if (typePrefix) return keys.filter(k => k.startsWith(typePrefix));
        return [...keys];
    } catch (err) {
        console.error('getUserRecordKeys error:', err.message);
        return [];
    }
};

/**
 * Fetch multiple records by keys in parallel, chunked to prevent overloading the 
 * Node HTTP agent or triggering EMFILE on local disks.
 */
const getRecords = async (keys) => {
    const results = [];
    const chunkSize = 20;
    
    for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        const resolvedChunk = await Promise.all(chunk.map(async k => {
            const rec = await getRecord(k);
            return rec ? { key: k, ...rec } : null;
        }));
        results.push(...resolvedChunk);
    }
    
    return results.filter(Boolean);
};

// ── Caching ───────────────────────────────────────────────────────────────────
const typeCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds limit

/**
 * Get all records of a given type. Returns array of {data, cid, key} objects.
 */
const getAllRecordsOfType = async (recordType) => {
    const cacheKey = `type_${recordType}`;
    const cached = typeCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
    }

    let results = [];
    // Try blockchain first
    if (rawContract) {
        try {
            const keys = await rawContract.getTypeRecordKeys(recordType);
            if (keys && keys.length > 0) {
                results = await getRecords(keys);
            }
        } catch (err) {
            console.error(`getAllRecordsOfType(${recordType}) blockchain error:`, err.message);
        }
    }

    // Always scan local IPFS store to serve as persistent fallback and merge missing records
    // This prevents "vanishing data" when the Hardhat node restarts and resets its in-memory state
    try {
        const localResults = await scanLocalIPFSStore(recordType);
        const existingKeys = new Set(results.map(r => r.key));
        for (const lr of localResults) {
            if (!existingKeys.has(lr.key)) {
                results.push(lr);
            }
        }
    } catch (e) {
        console.error(`Local store merge failed for ${recordType}:`, e.message);
    }

    if (results.length > 0) {
        typeCache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL });
    }
    
    return results;
};

// ── Email Index ───────────────────────────────────────────────────────────────

const setEmailIndex = async (email, userId) => {
    if (!isConnected) return;
    try {
        const emailHash = ethers.keccak256(ethers.toUtf8Bytes(email.toLowerCase()));
        const contract = getContract();
        const tx = await contract.setEmailIndex(emailHash, userId);
        await tx.wait();
        // Invalidate cache for 'user' type, as email index implies user record
        typeCache.delete('type_user');
    } catch (err) {
        console.error('setEmailIndex error:', err.message);
    }
};

const getUserIdByEmail = async (email) => {
    if (!rawContract) return null;
    try {
        const emailHash = ethers.keccak256(ethers.toUtf8Bytes(email.toLowerCase()));
        const userId = await rawContract.getUserIdByEmail(emailHash);
        return userId || null;
    } catch (err) {
        console.error('getUserIdByEmail error:', err.message);
        return null;
    }
};

const removeEmailIndex = async (email) => {
    if (!isConnected) return;
    try {
        const emailHash = ethers.keccak256(ethers.toUtf8Bytes(email.toLowerCase()));
        const contract = getContract();
        const tx = await contract.removeEmailIndex(emailHash);
        await tx.wait();
        // Invalidate cache for 'user' type, as email index implies user record
        typeCache.delete('type_user');
    } catch (err) {
        console.error('removeEmailIndex error:', err.message);
    }
};

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteRecord = async (recordKey) => {
    if (!isConnected) return false;
    try {
        const contract = getContract();
        const tx = await contract.deleteRecord(recordKey);
        await tx.wait();
        
        // Remove from local fallback persist index to avoid zombies
        try {
            if (fs.existsSync(LOCAL_KEY_INDEX_PATH)) {
                const index = JSON.parse(fs.readFileSync(LOCAL_KEY_INDEX_PATH, 'utf-8'));
                if (index[recordKey]) {
                    delete index[recordKey];
                    fs.writeFileSync(LOCAL_KEY_INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
                }
            }
        } catch (e) { /* non-fatal */ }

        // Invalidate cache for the record's type
        const recordType = recordKey.split('_')[0]; // Assuming recordKey starts with type_
        typeCache.delete(`type_${recordType}`);
        return true;
    } catch (err) {
        console.error(`deleteRecord(${recordKey}) error:`, err.message);
        return false;
    }
};

// ── Status ────────────────────────────────────────────────────────────────────

const getStatus = async () => {
    if (!isConnected) return { connected: false, message: 'Blockchain not initialised' };
    try {
        const network = await provider.getNetwork();
        const total = await rawContract.totalRecords();
        const address = await rawContract.getAddress();
        const ipfsStat = await ipfs.testConnection().catch(() => ({ ok: false }));
        return {
            connected: true,
            network: { chainId: Number(network.chainId), name: network.name },
            contractAddress: address,
            totalRecords: Number(total),
            signerAddress: signers[0]?.address ?? null,
            ipfs: ipfsStat
        };
    } catch (err) {
        return { connected: false, error: err.message };
    }
};

// ── Key Builders (exported for controllers) ───────────────────────────────────

const keys = {
    user: (id) => `user_${id}`,
    marks: (studentId, subjectId, year) => `marks_${studentId}_${subjectId}_${year || 'na'}`,
    attendance: (studentId, subjectId, date, period) => `att_${studentId}_${subjectId}_${date}_${period || 1}`,
    achievement: (id) => `ach_${id}`,
    leave: (id) => `leave_${id}`,
    subject: (id) => `subj_${id}`,
    classAssign: (dept, year, sem, section, ay) => `ca_${dept}_y${year}_s${sem}_${section}_${ay}`,
    counselAssign: (id) => `counsel_${id}`,
    notification: (id) => `notif_${id}`,
    project: (id) => `proj_${id}`,
    projRole: (id) => `projrole_${id}`,
    projSched: (id) => `projsched_${id}`,
};

module.exports = {
    initBlockchain,
    storeRecord,
    getRecord,
    getRecords,
    getUserRecordKeys,
    getAllRecordsOfType,
    setEmailIndex,
    getUserIdByEmail,
    removeEmailIndex,
    deleteRecord,
    getStatus,
    keys,
    get isConnected() { return isConnected; }
};
