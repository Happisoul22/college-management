require('dotenv').config();
const blockchain = require('./services/blockchain');
const fs = require('fs');

async function run() {
    await blockchain.initBlockchain();
    console.log("Blockchain connected:", blockchain.isConnected);

    const projects = await blockchain.getAllRecordsOfType('project');
    const projectData = projects.map(p => p.data).filter(Boolean);
    
    // find the project titled 'ccc' or similar
    console.log("Total projects:", projectData.length);
    console.log(JSON.stringify(projectData, null, 2));

    process.exit(0);
}

run();
