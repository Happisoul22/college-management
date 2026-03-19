/**
 * services/crypto.js  —  AES-256-GCM encryption helpers for IPFS data layer.
 *
 * Usage:
 *   const { encrypt, decrypt, isEncrypted, ENCRYPTION_ENABLED } = require('./crypto');
 *
 * Environment:
 *   IPFS_ENCRYPTION_KEY  – 64-char hex string (32 bytes).
 *   Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Envelope format stored in IPFS:
 *   { __enc: true, iv: "<12-byte-hex>", tag: "<16-byte-hex>", ct: "<base64>" }
 *
 * Backward compatibility:
 *   Records that do NOT have __enc:true are returned as-is (plain JSON).
 */

const nodeCrypto = require('crypto');

// ── Key setup ─────────────────────────────────────────────────────────────────

const HEX_KEY = (process.env.IPFS_ENCRYPTION_KEY || '').trim();

/**
 * Whether AES encryption is currently active.
 * Requires IPFS_ENCRYPTION_KEY to be a valid 64-char hex string.
 */
const ENCRYPTION_ENABLED = HEX_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(HEX_KEY);

let encKey = null;
if (ENCRYPTION_ENABLED) {
    encKey = Buffer.from(HEX_KEY, 'hex'); // 32 bytes → AES-256
    console.log('🔒 IPFS AES-256-GCM encryption: ENABLED');
} else {
    if (HEX_KEY.length > 0) {
        console.warn('⚠  IPFS_ENCRYPTION_KEY is set but invalid (must be 64 hex chars). Encryption DISABLED.');
    } else {
        console.log('🔓 IPFS AES-256-GCM encryption: DISABLED (no IPFS_ENCRYPTION_KEY set)');
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check whether an object is an encrypted envelope.
 * @param {*} obj
 * @returns {boolean}
 */
const isEncrypted = (obj) =>
    obj !== null &&
    typeof obj === 'object' &&
    obj.__enc === true &&
    typeof obj.iv === 'string' &&
    typeof obj.ct === 'string';

/**
 * Encrypt a plain JS object.
 * Returns the ciphertext envelope object (safe to JSON.stringify and upload to IPFS).
 *
 * @param {Object} plainObj
 * @returns {{ __enc: true, iv: string, tag: string, ct: string }}
 * @throws if encryption is disabled (call only when ENCRYPTION_ENABLED)
 */
const encrypt = (plainObj) => {
    if (!ENCRYPTION_ENABLED || !encKey) {
        throw new Error('crypto.encrypt called but ENCRYPTION_ENABLED is false');
    }

    const iv = nodeCrypto.randomBytes(12);               // 96-bit IV for GCM
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', encKey, iv);

    const plaintext = JSON.stringify(plainObj);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();                      // 16-byte auth tag

    return {
        __enc: true,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        ct: encrypted.toString('base64'),
    };
};

/**
 * Decrypt an encrypted envelope back to the original plain JS object.
 * If the object is NOT an encrypted envelope, returns it unchanged.
 *
 * @param {Object} obj
 * @returns {Object} decrypted JS object (or the original obj if not encrypted)
 */
const decrypt = (obj) => {
    // Pass-through for plain records (backward compat)
    if (!isEncrypted(obj)) return obj;

    if (!ENCRYPTION_ENABLED || !encKey) {
        throw new Error(
            'Data is encrypted but IPFS_ENCRYPTION_KEY is not set or invalid. ' +
            'Set the correct key to access this data.'
        );
    }

    const iv = Buffer.from(obj.iv, 'hex');
    const tag = Buffer.from(obj.tag, 'hex');
    const ct = Buffer.from(obj.ct, 'base64');

    const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', encKey, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
};

/**
 * Re-encrypt an object: decrypt if already encrypted, then re-encrypt with current key.
 * Useful for key rotation.
 *
 * @param {Object} obj
 * @returns {Object} fresh encrypted envelope
 */
const reEncrypt = (obj) => {
    const plain = isEncrypted(obj) ? decrypt(obj) : obj;
    return encrypt(plain);
};

module.exports = { encrypt, decrypt, isEncrypted, reEncrypt, ENCRYPTION_ENABLED };
