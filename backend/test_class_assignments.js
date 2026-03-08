const fs = require('fs');
const blockchain = require('./services/blockchain');

async function test() {
    await blockchain.initBlockchain();
    
    const classAssigns = await blockchain.getAllRecordsOfType('classassign');

    let keys = [];
    if (blockchain.isConnected) {
        const { ethers } = require('ethers');
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
        const signer = await provider.getSigner(0);
        const abi = require('./blockchain/AcademicSystemABI.json');
        const deployment = require('./blockchain/deployment.json');
        const contract = new ethers.Contract(deployment.address, abi, signer);
        keys = await contract.getTypeRecordKeys('classassign');
    }

    fs.writeFileSync('output_debug.json', JSON.stringify({
        assigns: classAssigns,
        keys: keys
    }, null, 2));
}

test().catch(console.error);
