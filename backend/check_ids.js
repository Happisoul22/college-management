require('dotenv').config({ path: __dirname + '/.env' });
const blockchain = require('./services/blockchain');

async function main() {
    await blockchain.initBlockchain();
    
    const users = await blockchain.getAllRecordsOfType('user');
    console.log("Found users: " + users.length);
    users.slice(0, 5).forEach(u => console.log(`  - ${u.data.id} (${u.data.name} / ${u.data.email})`));

    const achs = await blockchain.getAllRecordsOfType('achievement');
    console.log("Found achievements: " + achs.length);
    achs.forEach(a => console.log(`  - Ach ID: ${a.data.id} | User ID on Ach: ${a.data.user} | Name: ${a.data.userName}`));
}
main().catch(console.error);
