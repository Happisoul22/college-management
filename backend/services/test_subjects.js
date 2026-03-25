const blockchain = require('./blockchain');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

async function test() {
    console.log("Waiting for init...");
    await new Promise(r => setTimeout(r, 2000));
    const subjects = await blockchain.getAllRecordsOfType('subject');
    console.log("Total subjects found:", subjects.length);
    const cse8 = subjects.filter(s => s.data.department === 'CSE' && s.data.semester === 8);
    console.log("CSE Sem 8 subjects:", cse8.length);
    console.log(cse8.map(s => s.data.name));
    process.exit(0);
}
test();
