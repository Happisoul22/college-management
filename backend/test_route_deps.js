const fs = require('fs');
async function testDeps() {
    try {
        const analyticsController = require('./controllers/analytics');
        const blockchain = require('./services/blockchain');
        await blockchain.initBlockchain();

        const req = { query: { department: 'CSE', type: 'Student' }, user: { role: 'HOD', facultyProfile: { department: 'CSE' } } };
        const res = {
            status: function() { return this; },
            json: function(data) { fs.writeFileSync('test_err.log', "SUCCESS: " + data.data.length + " students"); return this; }
        };
        const next = (err) => { fs.writeFileSync('test_err.log', "NEXT ERR: " + (err.stack || err)); };

        await analyticsController.getDepartmentUsers(req, res, next);
        
    } catch(err) {
        fs.writeFileSync('test_err.log', "EXCEPTION: " + err.stack);
    }
}
testDeps();
