require('dotenv').config({ path: __dirname + '/.env' });
const blockchain = require('./services/blockchain');

async function main() {
    await blockchain.initBlockchain();
    console.log("Connected to blockchain:", blockchain.isConnected);
    
    // Simulate what scanLocalIPFSStore is exactly doing for 'projrole'
    const scanLocalIPFSStore = async (recordType) => {
        const fs = require('fs');
        const path = require('path');
        const LOCAL_STORE_PATH = path.join(__dirname, 'ipfs_local_store');
        const LOCAL_KEY_INDEX_PATH = path.join(LOCAL_STORE_PATH, 'local_key_index.json');
        const results = [];
        if (!fs.existsSync(LOCAL_STORE_PATH)) return results;
    
        let cidToKey = {};
        if (fs.existsSync(LOCAL_KEY_INDEX_PATH)) {
            const keyIndex = JSON.parse(fs.readFileSync(LOCAL_KEY_INDEX_PATH, 'utf-8'));
            for (const [k, cid] of Object.entries(keyIndex)) {
                cidToKey[cid] = k;
            }
        }
    
        const typePrefix = recordType + '_';
        const relevantEntries = Object.entries(cidToKey).filter(([, key]) => key.startsWith(typePrefix));
        
        console.log(`[Diagnostic] Found ${relevantEntries.length} entries for type ${typePrefix} in cidToKey`);
        return relevantEntries;
    };
    
    await scanLocalIPFSStore('projrole');
    const records = await blockchain.getAllRecordsOfType('projrole');
    console.log("getAllRecordsOfType('projrole') returned:", records.length);
}
main().catch(console.error);
