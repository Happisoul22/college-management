#!/usr/bin/env node
/**
 * scripts/encrypt-existing.js
 *
 * One-time migration: encrypts all existing plain-text JSON records in
 * ipfs_local_store/ using the current IPFS_ENCRYPTION_KEY.
 *
 * Usage:
 *   node backend/scripts/encrypt-existing.js
 *
 * Requirements:
 *   - Must have IPFS_ENCRYPTION_KEY set in backend/.env (or environment)
 *   - Run ONCE after first setting up the encryption key
 *   - Safe to re-run — already-encrypted files are skipped
 *
 * Backup your ipfs_local_store/ directory before running!
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const aes = require('../services/crypto');

const LOCAL_STORE_PATH = path.join(__dirname, '..', 'ipfs_local_store');
const KEY_INDEX = path.join(LOCAL_STORE_PATH, 'local_key_index.json');

// ── Guard ─────────────────────────────────────────────────────────────────────
if (!aes.ENCRYPTION_ENABLED) {
    console.error(
        '\n❌ ENCRYPTION IS NOT ENABLED.\n' +
        'Set a valid IPFS_ENCRYPTION_KEY (64-char hex) in backend/.env first.\n' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n'
    );
    process.exit(1);
}

if (!fs.existsSync(LOCAL_STORE_PATH)) {
    console.log('📂 Local IPFS store not found — nothing to migrate.');
    process.exit(0);
}

// ── Load existing key index ───────────────────────────────────────────────────
let keyIndex = {};
if (fs.existsSync(KEY_INDEX)) {
    keyIndex = JSON.parse(fs.readFileSync(KEY_INDEX, 'utf-8'));
}

// Build reverse map: cid → key
const cidToKey = {};
for (const [k, cid] of Object.entries(keyIndex)) cidToKey[cid] = k;

// ── Process files ─────────────────────────────────────────────────────────────
const files = fs.readdirSync(LOCAL_STORE_PATH)
    .filter(f => f.endsWith('.json') && !f.startsWith('local_'));

let skipped = 0;    // already encrypted
let migrated = 0;   // successfully encrypted
let errors = 0;     // failed

console.log(`\n🔒 AES-256-GCM Migration — ${files.length} file(s) found\n`);

for (const file of files) {
    const filePath = path.join(LOCAL_STORE_PATH, file);
    const oldCid = file.replace('.json', '');

    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        if (aes.isEncrypted(raw)) {
            console.log(`  ⏭  ${oldCid.slice(0, 24)}… — already encrypted, skipping`);
            skipped++;
            continue;
        }

        // Encrypt and compute the new CID hash (sha256 of JSON string of envelope)
        const envelope = aes.encrypt(raw);
        const newCidSuffix = require('crypto')
            .createHash('sha256')
            .update(JSON.stringify(envelope))
            .digest('hex')
            .substring(0, 44);
        const newCid = 'Qm' + newCidSuffix;
        const newFilePath = path.join(LOCAL_STORE_PATH, `${newCid}.json`);

        // Write encrypted file
        fs.writeFileSync(newFilePath, JSON.stringify(envelope, null, 2), 'utf-8');

        // Update key index: old CID → new CID for all matching keys
        if (cidToKey[oldCid]) {
            const recordKey = cidToKey[oldCid];
            keyIndex[recordKey] = newCid;
            console.log(`  ✅  ${oldCid.slice(0, 24)}… → ${newCid.slice(0, 24)}…  [${recordKey}]`);
        } else {
            console.log(`  ✅  ${oldCid.slice(0, 24)}… → ${newCid.slice(0, 24)}…  [key not indexed]`);
        }

        // Remove old unencrypted file
        if (newCid !== oldCid) {
            fs.unlinkSync(filePath);
        }

        migrated++;
    } catch (err) {
        console.error(`  ❌  ${file} — ERROR: ${err.message}`);
        errors++;
    }
}

// ── Save updated key index ────────────────────────────────────────────────────
if (migrated > 0) {
    fs.writeFileSync(KEY_INDEX, JSON.stringify(keyIndex, null, 2), 'utf-8');
    console.log('\n📝 Key index updated.');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`
════════════════════════════════════════
Migration complete.
  Migrated : ${migrated}
  Skipped  : ${skipped} (already encrypted)
  Errors   : ${errors}
════════════════════════════════════════

${migrated > 0 ? '✔  Restart the backend server to use the new encrypted store.' : ''}
`);

process.exitCode = errors > 0 ? 1 : 0;
