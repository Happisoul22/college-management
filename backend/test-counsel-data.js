require('dotenv').config();
const fs = require('fs');
const blockchain = require('./services/blockchain');

async function test() {
    await blockchain.initBlockchain();
    const all = await blockchain.getAllRecordsOfType('counselassign');
    fs.writeFileSync('counsel-output.txt', JSON.stringify(all, null, 2));
    console.log("Done");
}

test().catch(console.error);
