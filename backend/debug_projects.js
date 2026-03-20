require('dotenv').config();
const blockchain = require('./services/blockchain');
const fs = require('fs');

async function run() {
    const projects = await blockchain.getAllRecordsOfType('project');
    const projectData = projects.map(p => p.data).filter(Boolean);
    
    const users = await blockchain.getAllRecordsOfType('user');
    const userData = users.map(u => u.data).filter(Boolean);
    const students = userData.filter(u => u.role === 'Student');
    
    const out = {
        projects: projectData.slice(0, 3).map(p => ({
            id: p.id,
            title: p.title,
            students: p.students
        })),
        students: students.slice(0, 3).map(u => ({
            id: u.id,
            name: u.name,
            email: u.email
        }))
    };
    
    fs.writeFileSync('debug_out.json', JSON.stringify(out, null, 2));
    process.exit(0);
}

run();
