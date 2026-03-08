require('dotenv').config();
const { getDepartmentUsers } = require('./controllers/analytics');
const blockchain = require('./services/blockchain');

async function test() {
    await blockchain.initBlockchain();
    
    // Mock req and res for a ClassTeacher calling WITHOUT department query string
    const req = {
        user: { role: 'ClassTeacher', id: '2175f917-0506-4309-8073-8330626a8f9a', facultyProfile: { department: 'CSE' } },
        query: { type: 'Student' } // NO department passed!
    };
    
    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            console.log(`Status: ${this.statusCode}`);
            console.log(`Count: ${data.count}`);
            // console.log(JSON.stringify(data.data.slice(0, 2), null, 2));

            const arfeen = data.data.find(u => u.id === 'acf8caf3-c83a-402d-b44a-b959b22aef4f');
            if (arfeen) console.log('Found Arfeen:', arfeen.name);
            else console.log('Arfeen NOT found!');
        }
    };
    
    const next = (err) => console.error(err);
    
    await getDepartmentUsers(req, res, next);
}

test().catch(console.error);
