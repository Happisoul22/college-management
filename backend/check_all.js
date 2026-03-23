require('dotenv').config({ path: __dirname + '/.env' });
const blockchain = require('./services/blockchain');

async function main() {
    await blockchain.initBlockchain();
    const users = await blockchain.getAllRecordsOfType('user');
    console.log("All users:");
    users.forEach(u => console.log(` - ID: ${u.data.id} | Name: ${u.data.name}`));
    const achs = await blockchain.getAllRecordsOfType('achievement');
    console.log("All achievements:");
    achs.forEach(a => console.log(` - ID: ${a.data.id} | Title: ${a.data.title} | User: ${a.data.userName}`));
}
main().catch(console.error);
