const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Load env vars
dotenv.config({ path: './.env' });

// We need to require blockchain after dotenv so it picks up the right network
const blockchain = require('./services/blockchain');

const SUBJECT_TEMPLATE = [
    // Semester 1
    { code: "MA101", name: "Engineering Mathematics I", type: "Theory", semester: 1 },
    { code: "PH101", name: "Engineering Physics", type: "Theory", semester: 1 },
    { code: "CS101", name: "Programming for Problem Solving", type: "Theory", semester: 1 },
    { code: "ME101", name: "Engineering Graphics", type: "Lab", semester: 1 },
    { code: "CS102", name: "Programming Lab", type: "Lab", semester: 1 },
    
    // Semester 2
    { code: "MA102", name: "Engineering Mathematics II", type: "Theory", semester: 2 },
    { code: "CH101", name: "Engineering Chemistry", type: "Theory", semester: 2 },
    { code: "EE101", name: "Basic Electrical Engineering", type: "Theory", semester: 2 },
    { code: "CH102", name: "Chemistry Lab", type: "Lab", semester: 2 },
    { code: "EE102", name: "Electrical Engineering Lab", type: "Lab", semester: 2 },

    // Semester 3
    { code: "CS201", name: "Data Structures and Algorithms", type: "Theory", semester: 3 },
    { code: "CS202", name: "Digital Logic Design", type: "Theory", semester: 3 },
    { code: "CS203", name: "Computer Organization", type: "Theory", semester: 3 },
    { code: "CS204", name: "Data Structures Lab", type: "Lab", semester: 3 },
    { code: "CS205", name: "Digital Logic Lab", type: "Lab", semester: 3 },

    // Semester 4
    { code: "CS206", name: "Object Oriented Programming", type: "Theory", semester: 4 },
    { code: "CS207", name: "Database Management Systems", type: "Theory", semester: 4 },
    { code: "CS208", name: "Design and Analysis of Algorithms", type: "Theory", semester: 4 },
    { code: "CS209", name: "DBMS Lab", type: "Lab", semester: 4 },
    { code: "CS210", name: "Mini Project I", type: "Project", semester: 4 },

    // Semester 5
    { code: "CS301", name: "Operating Systems", type: "Theory", semester: 5 },
    { code: "CS302", name: "Computer Networks", type: "Theory", semester: 5 },
    { code: "CS303", name: "Software Engineering", type: "Theory", semester: 5 },
    { code: "CS304", name: "Operating Systems Lab", type: "Lab", semester: 5 },
    { code: "CS305", name: "Computer Networks Lab", type: "Lab", semester: 5 },

    // Semester 6
    { code: "CS306", name: "Compiler Design", type: "Theory", semester: 6 },
    { code: "CS307", name: "Machine Learning", type: "Theory", semester: 6 },
    { code: "CS308", name: "Web Technologies", type: "Theory", semester: 6 },
    { code: "CS309", name: "Web Technologies Lab", type: "Lab", semester: 6 },
    { code: "CS310", name: "Mini Project II", type: "Project", semester: 6 },

    // Semester 7
    { code: "CS401", name: "Cryptography and Network Security", type: "Theory", semester: 7 },
    { code: "CS402", name: "Cloud Computing", type: "Theory", semester: 7 },
    { code: "CS403", name: "Data Analytics", type: "Theory", semester: 7 },
    { code: "CS404", name: "Cloud Computing Lab", type: "Lab", semester: 7 },
    { code: "CS405", name: "Technical Seminar", type: "Seminar", semester: 7 },

    // Semester 8
    { code: "CS406", name: "Information Security", type: "Theory", semester: 8 },
    { code: "CS407", name: "Major Project Phase I", type: "Project", semester: 8 },
    { code: "CS408", name: "Major Project Phase II", type: "Project", semester: 8 },
    { code: "CS409", name: "Comprehensive Viva", type: "Seminar", semester: 8 }
];

const seedSubjects = async () => {
    try {
        console.log('Connecting to blockchain/IPFS...');
        // Small delay to ensure contract initializes
        await new Promise(r => setTimeout(r, 2000));
        
        let existingSubjects = [];
        try {
            existingSubjects = await blockchain.getAllRecordsOfType('subject');
        } catch (e) {
            console.log('No existing subjects found or error scanning:', e.message);
        }
        
        const existingCodes = new Set(existingSubjects.map(s => s.data.code));
        
        console.log(`Found ${existingCodes.size} existing subjects.`);
        
        let count = 0;
        for (const subj of SUBJECT_TEMPLATE) {
            if (existingCodes.has(subj.code)) {
                console.log(`Skipping ${subj.code} (already exists)`);
                continue;
            }
            
            const id = uuidv4();
            const key = blockchain.keys.subject(id);
            
            const subjData = {
                id,
                code: subj.code,
                name: subj.name,
                department: "CSE",
                semester: subj.semester,
                year: Math.ceil(subj.semester / 2),
                credits: subj.type === 'Theory' ? 3 : (subj.type === 'Lab' ? 2 : 4),
                type: subj.type,
                faculty: null,
                section: "",
                createdBy: "system_seeder",
                createdAt: new Date().toISOString()
            };
            
            await blockchain.storeRecord('subject', key, subjData, "system_seeder");
            console.log(`Created: ${subj.code} - ${subj.name} (Semester ${subj.semester})`);
            count++;
        }
        
        console.log(`\nSuccessfully seeded ${count} new subjects!`);
        process.exit(0);
        
    } catch (err) {
        console.error('Error seeding subjects:', err);
        process.exit(1);
    }
};

seedSubjects();
