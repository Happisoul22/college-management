require('dotenv').config();
const blockchain = require('./services/blockchain');

async function run() {
    await blockchain.initBlockchain();
    console.log("Blockchain connected:", blockchain.isConnected);

    try {
        const subjects = await blockchain.getAllRecordsOfType('subject');
        console.log('Total subjects found:', subjects.length);
        if (subjects.length > 0) {
            console.log('Sample subject:', subjects[0].data.name);
        }
    } catch(e) {
        console.error('Error fetching subjects:', e);
    }
    
    process.exit(0);
}

run();
