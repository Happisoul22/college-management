require('dotenv').config();
const { getDepartmentUsers } = require('./controllers/analytics');
const { getMarks, getCgpa } = require('./controllers/marks');
const { getAttendanceSummary } = require('./controllers/attendance');
const { getAchievements } = require('./controllers/achievements');
const blockchain = require('./services/blockchain');

async function test() {
    await blockchain.initBlockchain();
    
    const req = {
        user: { role: 'ClassTeacher', id: '2175f917-0506-4309-8073-8330626a8f9a', facultyProfile: { department: 'CSE' } },
        query: { type: 'Student' }, 
        params: {}
    };
    
    const createRes = (name) => ({
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { console.log(`[${name}] Status: ${this.statusCode}`); }
    });
    
    const next = (err) => console.error(err);
    
    const id = 'acf8caf3-c83a-402d-b44a-b959b22aef4f'; // arfeen

    console.log("1. /analytics/department-users");
    await getDepartmentUsers(req, createRes('dept-users'), next);

    console.log("2. /marks");
    req.query = { student: id };
    await getMarks(req, createRes('marks'), next);

    console.log("3. /marks/cgpa");
    req.params = { studentId: id };
    await getCgpa(req, createRes('cgpa'), next);

    console.log("4. /attendance/summary");
    req.params = { studentId: id };
    await getAttendanceSummary(req, createRes('attendance'), next);

    console.log("5. /achievements");
    req.query = { student: id };
    await getAchievements(req, createRes('achievements'), next);
}

test().catch(console.error);
