/**
 * services/ipfs.js
 *
 * IPFS storage layer using Pinata as the pinning service.
 * All academic data (users, marks, attendance, etc.) is stored as JSON
 * pinned on IPFS. The returned CID is what gets indexed on-chain.
 *
 * Fallback: if Pinata is not configured, data is stored in a local
 * in-memory/file store so the app can run without an API key in development.
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const PINATA_API_KEY = process.env.PINATA_API_KEY || '';
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || '';
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

const USE_PINATA = !!(PINATA_API_KEY && PINATA_SECRET_KEY);

// ── Local fallback store (development without Pinata) ─────────────────────────

const LOCAL_STORE_PATH = path.join(__dirname, '..', 'ipfs_local_store');

const ensureLocalStore = () => {
    if (!fs.existsSync(LOCAL_STORE_PATH)) {
        fs.mkdirSync(LOCAL_STORE_PATH, { recursive: true });
    }
};

// Generate a deterministic CID-like string for local dev
const localCid = (data) => {
    const json = JSON.stringify(data);
    return 'Qm' + crypto.createHash('sha256').update(json).digest('hex').substring(0, 44);
};

// ── Pinata API helpers ────────────────────────────────────────────────────────

const pinataHeaders = () => ({
    pinata_api_key: PINATA_API_KEY,
    pinata_secret_api_key: PINATA_SECRET_KEY,
    'Content-Type': 'application/json'
});

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload a JSON object to IPFS.
 * @param {Object} data - Plain JavaScript object to store
 * @param {string} [name] - Optional pin name (for Pinata dashboard)
 * @returns {Promise<string>} IPFS CID
 */
const uploadJSON = async (data, name = 'academic-record') => {
    if (USE_PINATA) {
        // ── Pinata path ───────────────────────────────────────────────────────
        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinJSONToIPFS',
            {
                pinataContent: data,
                pinataMetadata: { name, keyvalues: { app: 'academic-system' } }
            },
            { headers: pinataHeaders() }
        );
        return response.data.IpfsHash; // CIDv0 from Pinata
    } else {
        // ── Local fallback ────────────────────────────────────────────────────
        ensureLocalStore();
        const cid = localCid(data);
        const file = path.join(LOCAL_STORE_PATH, `${cid}.json`);
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
        }
        console.log(`📦 IPFS [local]: stored ${cid}`);
        return cid;
    }
};

/**
 * Fetch a JSON object from IPFS by CID.
 * @param {string} cid - IPFS Content Identifier
 * @returns {Promise<Object>} Parsed JSON object
 */
const fetchJSON = async (cid) => {
    if (!cid) throw new Error('IPFS fetchJSON: CID is required');

    if (USE_PINATA) {
        // ── Pinata gateway ────────────────────────────────────────────────────
        const url = `${IPFS_GATEWAY}${cid}`;
        const response = await axios.get(url, { timeout: 15000 });
        return response.data;
    } else {
        // ── Local fallback ────────────────────────────────────────────────────
        ensureLocalStore();
        const file = path.join(LOCAL_STORE_PATH, `${cid}.json`);
        if (!fs.existsSync(file)) {
            throw new Error(`IPFS [local]: CID not found: ${cid}`);
        }
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
};

/**
 * Unpin / delete a CID from Pinata (no-op for local store).
 * @param {string} cid
 */
const unpinJSON = async (cid) => {
    if (!cid) return;
    if (USE_PINATA) {
        try {
            await axios.delete(
                `https://api.pinata.cloud/pinning/unpin/${cid}`,
                { headers: pinataHeaders() }
            );
        } catch (err) {
            console.warn(`⚠  IPFS unpin failed for ${cid}: ${err.message}`);
        }
    } else {
        const file = path.join(LOCAL_STORE_PATH, `${cid}.json`);
        if (fs.existsSync(file)) fs.unlinkSync(file);
    }
};

/**
 * Check connectivity / API key validity.
 */
const testConnection = async () => {
    if (USE_PINATA) {
        const response = await axios.get(
            'https://api.pinata.cloud/data/testAuthentication',
            { headers: pinataHeaders() }
        );
        return { ok: true, provider: 'pinata', message: response.data.message };
    } else {
        ensureLocalStore();
        return { ok: true, provider: 'local-fs', path: LOCAL_STORE_PATH };
    }
};

module.exports = { uploadJSON, fetchJSON, unpinJSON, testConnection, USE_PINATA };
