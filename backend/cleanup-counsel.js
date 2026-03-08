require('dotenv').config();
const blockchain = require('./services/blockchain');

async function cleanup() {
    await blockchain.initBlockchain();
    console.log("Fetching all counsel records...");
    const all = await blockchain.getAllRecordsOfType('counselassign');
    
    for (let a of all) {
        if (!a || !a.id) continue;
        let needsFix = false;
        
        // Clean students array
        const cleanStudents = (a.students || []).map(s => {
            if (typeof s === 'object') {
                needsFix = true;
                return s.id || s._id;
            }
            return s;
        }).filter(Boolean);
        
        // Deduplicate
        const uniqueStudents = [...new Set(cleanStudents)];
        if (uniqueStudents.length !== (a.students || []).length) {
            needsFix = true;
        }

        if (needsFix) {
            console.log(`Fixing corrupted assignment: ${a.id}`);
            const updated = { ...a, students: uniqueStudents };
            const key = blockchain.keys.counselAssign(a.id);
            // Re-store clean record
            await blockchain.storeRecord('counselassign', key, updated, a.faculty);
            console.log("Fixed!");
        }
    }
    console.log("Cleanup complete!");
}

cleanup().catch(console.error);
