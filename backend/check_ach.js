require('dotenv').config({ path: __dirname + '/.env' });
const blockchain = require('./services/blockchain');

async function main() {
    await blockchain.initBlockchain();
    const all = await blockchain.getAllRecordsOfType('achievement');
    console.log(`Found ${all.length} total achievements`);
    all.forEach(h => {
        console.log(`ID: ${h.data.id} | Title: ${h.data.title} | Status: ${h.data.status} | User: ${h.data.user} | Role: ${h.data.submittedByRole}`);
    });
}
main().catch(console.error);
