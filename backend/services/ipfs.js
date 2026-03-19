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
const aes = require('./crypto'); // AES-256-GCM layer

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
 * If IPFS_ENCRYPTION_KEY is set, the object is AES-256-GCM encrypted before upload.
 * @param {Object} data - Plain JavaScript object to store
 * @param {string} [name] - Optional pin name (for Pinata dashboard)
 * @returns {Promise<string>} IPFS CID
 */
const uploadJSON = async (data, name = 'academic-record') => {
    // ── Encrypt payload if key is configured ─────────────────────────────────
    const payload = aes.ENCRYPTION_ENABLED ? aes.encrypt(data) : data;

    if (USE_PINATA) {
        // ── Pinata path ───────────────────────────────────────────────────────
        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinJSONToIPFS',
            {
                pinataContent: payload,
                pinataMetadata: { name, keyvalues: { app: 'academic-system', encrypted: String(aes.ENCRYPTION_ENABLED) } }
            },
            { headers: pinataHeaders() }
        );
        return response.data.IpfsHash; // CIDv0 from Pinata
    } else {
        // ── Local fallback ────────────────────────────────────────────────────
        ensureLocalStore();
        const cid = localCid(payload);          // CID computed over encrypted envelope
        const file = path.join(LOCAL_STORE_PATH, `${cid}.json`);
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf-8');
        }
        console.log(`📦 IPFS [local]: stored ${cid}${aes.ENCRYPTION_ENABLED ? ' 🔒' : ''}`);
        return cid;
    }
};

/**
 * Fetch a JSON object from IPFS by CID.
 * Automatically decrypts AES-256-GCM encrypted envelopes.
 * Plain (unencrypted) records are returned as-is (backward compatible).
 * @param {string} cid - IPFS Content Identifier
 * @returns {Promise<Object>} Parsed JSON object (decrypted if needed)
 */
const fetchJSON = async (cid) => {
    if (!cid) throw new Error('IPFS fetchJSON: CID is required');

    let raw;
    if (USE_PINATA) {
        // ── Pinata gateway ────────────────────────────────────────────────────
        const url = `${IPFS_GATEWAY}${cid}`;
        const response = await axios.get(url, { timeout: 15000 });
        raw = response.data;
    } else {
        // ── Local fallback ────────────────────────────────────────────────────
        ensureLocalStore();
        const file = path.join(LOCAL_STORE_PATH, `${cid}.json`);
        if (!fs.existsSync(file)) {
            throw new Error(`IPFS [local]: CID not found: ${cid}`);
        }
        raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }

    // ── Decrypt if this is an encrypted envelope ──────────────────────────────
    return aes.decrypt(raw); // pass-through if not encrypted
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
