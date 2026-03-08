const fs = require('fs');
const blockchain = require('./services/blockchain');

async function test() {
    try {
        const originalLog = console.log;
        process.stdout.clearLine = () => {};
        process.stdout.cursorTo = () => {};
        console.log = () => {};

        const all = await blockchain.getAllRecordsOfType('achievement');
        let results = all.map(r => r.data);
        
        const allUsersList = await blockchain.getAllRecordsOfType('user');
        const userMap = {};
        for (const u of allUsersList) {
            userMap[u.data.id] = u.data;
        }

        results = results.map(r => ({
            ...r,
            user: userMap[r.user] || { id: r.user, name: r.userName || 'Unknown User' },
            reviewer: r.reviewedBy ? {
                id: r.reviewedBy,
                name: userMap[r.reviewedBy]?.name || 'Unknown',
                role: userMap[r.reviewedBy]?.role || 'Unknown'
            } : null
        }));

        fs.writeFileSync('test-api-local-output.json', JSON.stringify(results, null, 2));
    } catch (e) {
        fs.writeFileSync('test-api-local-error.txt', e.toString());
    }
}
test();
