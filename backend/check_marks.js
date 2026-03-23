require('dotenv').config({ path: __dirname + '/.env' });
const blockchain = require('./services/blockchain');

async function main() {
    await blockchain.initBlockchain();
    const marks = await blockchain.getAllRecordsOfType('marks');
    console.log("Marks count: " + marks.length);
    const subjs = await blockchain.getAllRecordsOfType('subject');
    console.log("Subjects count: " + subjs.length);
}
main().catch(console.error);
