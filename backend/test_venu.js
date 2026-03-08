const blockchain = require('./services/blockchain');

async function test() {
    await blockchain.initBlockchain();
    const users = await blockchain.getAllRecordsOfType('user');
    const user = users.find(u => u.data.name.toLowerCase() === 'venu' || u.data.email.includes('venu'));
    console.log("Venu user profile:", JSON.stringify(user?.data, null, 2));
}

test().catch(console.error);
