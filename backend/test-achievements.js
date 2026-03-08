const fs = require('fs');
const blockchain = require('./services/blockchain');

async function test() {
    try {
        const originalLog = console.log;
        const originalClear = process.stdout.clearLine;
        const originalCursor = process.stdout.cursorTo;
        // Suppress blockchain logging to avoid garbled output
        console.log = function() {};
        process.stdout.clearLine = function() {};
        process.stdout.cursorTo = function() {};
        
        const all = await blockchain.getAllRecordsOfType('achievement');
        fs.writeFileSync('test-achievements-output.json', JSON.stringify(all.map(r => r.data), null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
