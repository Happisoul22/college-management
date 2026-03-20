require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const blockchain = require('./services/blockchain');

async function run() {
    let out;
    try {
        const usersInfo = await blockchain.getAllRecordsOfType('user');
        const hod = usersInfo.map(r => r.data).find(u => ['HOD', 'Faculty'].includes(u.role)) || usersInfo[0].data;
        const student = usersInfo.map(r => r.data).find(u => u.role === 'Student');

        const token = jwt.sign({ id: hod.id, role: hod.role }, 'replace_this_with_a_secure_secret_key', { expiresIn: '1d' });

        const res = await axios.get('http://localhost:5000/api/projects', {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Also mock authentication as the student to see what `/api/projects/my` returns
        const stuToken = jwt.sign({ id: student.id, role: 'Student' }, 'replace_this_with_a_secure_secret_key', { expiresIn: '1d' });
        const myRes = await axios.get('http://localhost:5000/api/projects/my', {
            headers: { Authorization: `Bearer ${stuToken}` }
        });

        out = {
            hodId: hod.id,
            studentId: student.id,
            allProjectsCount: res.data.count,
            allProjects: res.data.data.slice(0, 5).map(p => ({
                id: p.id,
                title: p.title,
                students: p.students,
            })),
            myProjectsCount: myRes.data.count,
            myProjects: myRes.data.data.map(p => p.id)
        };
    } catch (e) {
        out = { error: e.message, status: e.response?.status, data: e.response?.data };
    }
    fs.writeFileSync('debug_api_out.json', JSON.stringify(out, null, 2));
    process.exit(0);
}

run();
