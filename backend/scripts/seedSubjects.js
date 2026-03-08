/**
 * seedSubjects.js
 *
 * Seeds all engineering branch subjects (JNTUA R20 Regulation)
 * for SRIT Ananthapuramu — all 8 semesters × all branches.
 *
 * Run: node scripts/seedSubjects.js
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const ipfs = require('../services/ipfs');
const blockchain = require('../services/blockchain');

// ── Wait for blockchain init ──────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Subject definitions per branch ───────────────────────────────────────────
// Format: { code, name, credits, type }   type: 'Theory' | 'Lab' | 'Elective'

const COMMON_SEM1 = [
    { code: 'MA101', name: 'Mathematics – I (Calculus & Linear Algebra)', credits: 4, type: 'Theory' },
    { code: 'PH101', name: 'Engineering Physics', credits: 4, type: 'Theory' },
    { code: 'CH101', name: 'Engineering Chemistry', credits: 4, type: 'Theory' },
    { code: 'CS101', name: 'Problem Solving & Programming in C', credits: 3, type: 'Theory' },
    { code: 'ME101', name: 'Engineering Graphics', credits: 3, type: 'Theory' },
    { code: 'PH191', name: 'Engineering Physics Lab', credits: 1, type: 'Lab' },
    { code: 'CS191', name: 'C Programming Lab', credits: 1, type: 'Lab' },
];

const COMMON_SEM2 = [
    { code: 'MA201', name: 'Mathematics – II (Differential Equations & Vector Calculus)', credits: 4, type: 'Theory' },
    { code: 'CH201', name: 'Engineering Chemistry', credits: 4, type: 'Theory' },
    { code: 'EE201', name: 'Basic Electrical Engineering', credits: 4, type: 'Theory' },
    { code: 'ME201', name: 'Engineering Mechanics', credits: 3, type: 'Theory' },
    { code: 'CS201', name: 'Data Structures', credits: 3, type: 'Theory' },
    { code: 'CH291', name: 'Engineering Chemistry Lab', credits: 1, type: 'Lab' },
    { code: 'EE291', name: 'Basic Electrical Engineering Lab', credits: 1, type: 'Lab' },
];

// ── CSE subjects ──────────────────────────────────────────────────────────────
const CSE_SUBJECTS = {
    1: COMMON_SEM1,
    2: COMMON_SEM2,
    3: [
        { code: 'CS301', name: 'Data Structures & Algorithms', credits: 4, type: 'Theory' },
        { code: 'CS302', name: 'Digital Logic Design', credits: 4, type: 'Theory' },
        { code: 'CS303', name: 'Discrete Mathematics', credits: 4, type: 'Theory' },
        { code: 'CS304', name: 'Object Oriented Programming using Java', credits: 4, type: 'Theory' },
        { code: 'MA301', name: 'Mathematics – III (Probability & Statistics)', credits: 4, type: 'Theory' },
        { code: 'CS391', name: 'Data Structures Lab', credits: 1, type: 'Lab' },
        { code: 'CS392', name: 'Java Programming Lab', credits: 1, type: 'Lab' },
    ],
    4: [
        { code: 'CS401', name: 'Operating Systems', credits: 4, type: 'Theory' },
        { code: 'CS402', name: 'Database Management Systems', credits: 4, type: 'Theory' },
        { code: 'CS403', name: 'Computer Organization & Architecture', credits: 4, type: 'Theory' },
        { code: 'CS404', name: 'Software Engineering', credits: 4, type: 'Theory' },
        { code: 'CS405', name: 'Formal Languages & Automata Theory', credits: 4, type: 'Theory' },
        { code: 'CS491', name: 'Operating Systems Lab', credits: 1, type: 'Lab' },
        { code: 'CS492', name: 'DBMS Lab', credits: 1, type: 'Lab' },
    ],
    5: [
        { code: 'CS501', name: 'Computer Networks', credits: 4, type: 'Theory' },
        { code: 'CS502', name: 'Compiler Design', credits: 4, type: 'Theory' },
        { code: 'CS503', name: 'Design & Analysis of Algorithms', credits: 4, type: 'Theory' },
        { code: 'CS504', name: 'Web Technologies', credits: 4, type: 'Theory' },
        { code: 'CS505', name: 'Software Testing Methodologies', credits: 4, type: 'Theory' },
        { code: 'CS591', name: 'Computer Networks Lab', credits: 1, type: 'Lab' },
        { code: 'CS592', name: 'Web Technologies Lab', credits: 1, type: 'Lab' },
    ],
    6: [
        { code: 'CS601', name: 'Artificial Intelligence', credits: 4, type: 'Theory' },
        { code: 'CS602', name: 'Cloud Computing', credits: 4, type: 'Theory' },
        { code: 'CS603', name: 'Information Security', credits: 4, type: 'Theory' },
        { code: 'CS604', name: 'Machine Learning', credits: 4, type: 'Theory' },
        { code: 'CS605E', name: 'Big Data Analytics (Elective)', credits: 3, type: 'Elective' },
        { code: 'CS691', name: 'Machine Learning Lab', credits: 1, type: 'Lab' },
        { code: 'CS692', name: 'Cloud Computing Lab', credits: 1, type: 'Lab' },
    ],
    7: [
        { code: 'CS701', name: 'Deep Learning', credits: 4, type: 'Theory' },
        { code: 'CS702', name: 'Internet of Things', credits: 4, type: 'Theory' },
        { code: 'CS703', name: 'Distributed Systems', credits: 4, type: 'Theory' },
        { code: 'CS704E', name: 'Natural Language Processing (Elective)', credits: 3, type: 'Elective' },
        { code: 'CS705E', name: 'Block Chain Technologies (Elective)', credits: 3, type: 'Elective' },
        { code: 'CS791', name: 'Project Phase – I', credits: 2, type: 'Lab' },
    ],
    8: [
        { code: 'CS801', name: 'Cyber Security & Ethical Hacking', credits: 4, type: 'Theory' },
        { code: 'CS802E', name: 'Computer Vision (Elective)', credits: 3, type: 'Elective' },
        { code: 'CS803E', name: 'Edge Computing (Elective)', credits: 3, type: 'Elective' },
        { code: 'CS891', name: 'Project Phase – II', credits: 6, type: 'Lab' },
        { code: 'CS892', name: 'Seminar & Technical Presentation', credits: 2, type: 'Lab' },
    ],
};

// ── ECE subjects ──────────────────────────────────────────────────────────────
const ECE_SUBJECTS = {
    1: COMMON_SEM1,
    2: COMMON_SEM2,
    3: [
        { code: 'EC301', name: 'Electronic Devices & Circuits', credits: 4, type: 'Theory' },
        { code: 'EC302', name: 'Signals & Systems', credits: 4, type: 'Theory' },
        { code: 'EC303', name: 'Network Analysis & Synthesis', credits: 4, type: 'Theory' },
        { code: 'MA301', name: 'Mathematics – III (Probability & Statistics)', credits: 4, type: 'Theory' },
        { code: 'EC304', name: 'Switching Theory & Logic Design', credits: 4, type: 'Theory' },
        { code: 'EC391', name: 'Electronic Devices & Circuits Lab', credits: 1, type: 'Lab' },
        { code: 'EC392', name: 'Digital Electronics Lab', credits: 1, type: 'Lab' },
    ],
    4: [
        { code: 'EC401', name: 'Linear IC Applications', credits: 4, type: 'Theory' },
        { code: 'EC402', name: 'Analog Communications', credits: 4, type: 'Theory' },
        { code: 'EC403', name: 'Pulse & Digital Circuits', credits: 4, type: 'Theory' },
        { code: 'EC404', name: 'Electro Magnetic Waves & Transmission Lines', credits: 4, type: 'Theory' },
        { code: 'EC405', name: 'Microprocessors & Microcontrollers', credits: 4, type: 'Theory' },
        { code: 'EC491', name: 'Linear IC Applications Lab', credits: 1, type: 'Lab' },
        { code: 'EC492', name: 'Analog Communications Lab', credits: 1, type: 'Lab' },
    ],
    5: [
        { code: 'EC501', name: 'Digital Communications', credits: 4, type: 'Theory' },
        { code: 'EC502', name: 'Digital Signal Processing', credits: 4, type: 'Theory' },
        { code: 'EC503', name: 'Microwave Engineering', credits: 4, type: 'Theory' },
        { code: 'EC504', name: 'VLSI Design', credits: 4, type: 'Theory' },
        { code: 'EC505', name: 'Antennas & Wave Propagation', credits: 4, type: 'Theory' },
        { code: 'EC591', name: 'DSP Lab', credits: 1, type: 'Lab' },
        { code: 'EC592', name: 'Microwave Lab', credits: 1, type: 'Lab' },
    ],
    6: [
        { code: 'EC601', name: 'Wireless Communications', credits: 4, type: 'Theory' },
        { code: 'EC602', name: 'Satellite Communication', credits: 4, type: 'Theory' },
        { code: 'EC603', name: 'Optical Fiber Communications', credits: 4, type: 'Theory' },
        { code: 'EC604E', name: 'FPGA based System Design (Elective)', credits: 3, type: 'Elective' },
        { code: 'EC605', name: 'Embedded Systems', credits: 4, type: 'Theory' },
        { code: 'EC691', name: 'VLSI Lab', credits: 1, type: 'Lab' },
        { code: 'EC692', name: 'Embedded Systems Lab', credits: 1, type: 'Lab' },
    ],
    7: [
        { code: 'EC701', name: 'Radar Systems', credits: 4, type: 'Theory' },
        { code: 'EC702', name: 'Digital Image Processing', credits: 4, type: 'Theory' },
        { code: 'EC703E', name: '5G Mobile Communications (Elective)', credits: 3, type: 'Elective' },
        { code: 'EC704E', name: 'IoT & Applications (Elective)', credits: 3, type: 'Elective' },
        { code: 'EC791', name: 'Project Phase – I', credits: 2, type: 'Lab' },
    ],
    8: [
        { code: 'EC801', name: 'Nanoelectronics', credits: 4, type: 'Theory' },
        { code: 'EC802E', name: 'Artificial Intelligence in Signal Processing (Elective)', credits: 3, type: 'Elective' },
        { code: 'EC891', name: 'Project Phase – II', credits: 6, type: 'Lab' },
        { code: 'EC892', name: 'Seminar & Technical Presentation', credits: 2, type: 'Lab' },
    ],
};

// ── EEE subjects ──────────────────────────────────────────────────────────────
const EEE_SUBJECTS = {
    1: COMMON_SEM1,
    2: COMMON_SEM2,
    3: [
        { code: 'EE301', name: 'Electrical Circuit Analysis', credits: 4, type: 'Theory' },
        { code: 'EE302', name: 'Electronic Devices & Circuits', credits: 4, type: 'Theory' },
        { code: 'EE303', name: 'Electrical Machines – I', credits: 4, type: 'Theory' },
        { code: 'MA301', name: 'Mathematics – III (Probability & Statistics)', credits: 4, type: 'Theory' },
        { code: 'EE304', name: 'Electromagnetic Theory', credits: 4, type: 'Theory' },
        { code: 'EE391', name: 'Electrical Machines Lab – I', credits: 1, type: 'Lab' },
        { code: 'EE392', name: 'Electronic Circuits Lab', credits: 1, type: 'Lab' },
    ],
    4: [
        { code: 'EE401', name: 'Electrical Machines – II', credits: 4, type: 'Theory' },
        { code: 'EE402', name: 'Control Systems', credits: 4, type: 'Theory' },
        { code: 'EE403', name: 'Power Systems – I', credits: 4, type: 'Theory' },
        { code: 'EE404', name: 'Linear Integrated Circuits', credits: 4, type: 'Theory' },
        { code: 'EE405', name: 'Signals & Systems', credits: 4, type: 'Theory' },
        { code: 'EE491', name: 'Electrical Machines Lab – II', credits: 1, type: 'Lab' },
        { code: 'EE492', name: 'Control Systems Lab', credits: 1, type: 'Lab' },
    ],
    5: [
        { code: 'EE501', name: 'Power Systems – II', credits: 4, type: 'Theory' },
        { code: 'EE502', name: 'Power Electronics', credits: 4, type: 'Theory' },
        { code: 'EE503', name: 'Digital Electronics & Microprocessors', credits: 4, type: 'Theory' },
        { code: 'EE504', name: 'Switchgear & Protection', credits: 4, type: 'Theory' },
        { code: 'EE505', name: 'Electrical Measurements', credits: 4, type: 'Theory' },
        { code: 'EE591', name: 'Power Electronics Lab', credits: 1, type: 'Lab' },
        { code: 'EE592', name: 'Measurements Lab', credits: 1, type: 'Lab' },
    ],
    6: [
        { code: 'EE601', name: 'High Voltage Engineering', credits: 4, type: 'Theory' },
        { code: 'EE602', name: 'Utilization of Electrical Energy', credits: 4, type: 'Theory' },
        { code: 'EE603', name: 'Flexible AC Transmission Systems', credits: 4, type: 'Theory' },
        { code: 'EE604E', name: 'Renewable Energy Systems (Elective)', credits: 3, type: 'Elective' },
        { code: 'EE691', name: 'Simulation Lab', credits: 1, type: 'Lab' },
    ],
    7: [
        { code: 'EE701', name: 'Power System Operation & Control', credits: 4, type: 'Theory' },
        { code: 'EE702', name: 'Electrical Drives', credits: 4, type: 'Theory' },
        { code: 'EE703E', name: 'Smart Grid Technologies (Elective)', credits: 3, type: 'Elective' },
        { code: 'EE791', name: 'Project Phase – I', credits: 2, type: 'Lab' },
    ],
    8: [
        { code: 'EE801', name: 'Power Quality', credits: 4, type: 'Theory' },
        { code: 'EE802E', name: 'AI in Power Systems (Elective)', credits: 3, type: 'Elective' },
        { code: 'EE891', name: 'Project Phase – II', credits: 6, type: 'Lab' },
        { code: 'EE892', name: 'Seminar & Technical Presentation', credits: 2, type: 'Lab' },
    ],
};

// ── MECH subjects ─────────────────────────────────────────────────────────────
const MECH_SUBJECTS = {
    1: COMMON_SEM1,
    2: COMMON_SEM2,
    3: [
        { code: 'ME301', name: 'Engineering Thermodynamics', credits: 4, type: 'Theory' },
        { code: 'ME302', name: 'Kinematics of Machinery', credits: 4, type: 'Theory' },
        { code: 'ME303', name: 'Manufacturing Processes – I', credits: 4, type: 'Theory' },
        { code: 'ME304', name: 'Strength of Materials', credits: 4, type: 'Theory' },
        { code: 'MA301', name: 'Mathematics – III (Probability & Statistics)', credits: 4, type: 'Theory' },
        { code: 'ME391', name: 'Manufacturing Processes Lab', credits: 1, type: 'Lab' },
        { code: 'ME392', name: 'Strength of Materials Lab', credits: 1, type: 'Lab' },
    ],
    4: [
        { code: 'ME401', name: 'Dynamics of Machinery', credits: 4, type: 'Theory' },
        { code: 'ME402', name: 'Machine Drawing', credits: 4, type: 'Theory' },
        { code: 'ME403', name: 'Fluid Mechanics & Hydraulic Machinery', credits: 4, type: 'Theory' },
        { code: 'ME404', name: 'Heat Transfer', credits: 4, type: 'Theory' },
        { code: 'ME405', name: 'Manufacturing Processes – II', credits: 4, type: 'Theory' },
        { code: 'ME491', name: 'Fluid Mechanics Lab', credits: 1, type: 'Lab' },
        { code: 'ME492', name: 'Metallurgy Lab', credits: 1, type: 'Lab' },
    ],
    5: [
        { code: 'ME501', name: 'Refrigeration & Air Conditioning', credits: 4, type: 'Theory' },
        { code: 'ME502', name: 'Design of Machine Members – I', credits: 4, type: 'Theory' },
        { code: 'ME503', name: 'Metrology & Surface Engineering', credits: 4, type: 'Theory' },
        { code: 'ME504', name: 'Production Technology', credits: 4, type: 'Theory' },
        { code: 'ME505', name: 'Operations Research', credits: 4, type: 'Theory' },
        { code: 'ME591', name: 'Heat Transfer Lab', credits: 1, type: 'Lab' },
        { code: 'ME592', name: 'Metrology Lab', credits: 1, type: 'Lab' },
    ],
    6: [
        { code: 'ME601', name: 'Design of Machine Members – II', credits: 4, type: 'Theory' },
        { code: 'ME602', name: 'CAD/CAM', credits: 4, type: 'Theory' },
        { code: 'ME603', name: 'Automobile Engineering', credits: 4, type: 'Theory' },
        { code: 'ME604E', name: 'Robotics (Elective)', credits: 3, type: 'Elective' },
        { code: 'ME691', name: 'CAD/CAM Lab', credits: 1, type: 'Lab' },
    ],
    7: [
        { code: 'ME701', name: 'Finite Element Methods', credits: 4, type: 'Theory' },
        { code: 'ME702', name: 'Industrial Engineering & Management', credits: 4, type: 'Theory' },
        { code: 'ME703E', name: 'Composite Materials (Elective)', credits: 3, type: 'Elective' },
        { code: 'ME791', name: 'Project Phase – I', credits: 2, type: 'Lab' },
    ],
    8: [
        { code: 'ME801', name: 'Total Quality Management', credits: 4, type: 'Theory' },
        { code: 'ME802E', name: 'Advanced Manufacturing Systems (Elective)', credits: 3, type: 'Elective' },
        { code: 'ME891', name: 'Project Phase – II', credits: 6, type: 'Lab' },
        { code: 'ME892', name: 'Seminar & Technical Presentation', credits: 2, type: 'Lab' },
    ],
};

// ── CIVIL subjects ────────────────────────────────────────────────────────────
const CIVIL_SUBJECTS = {
    1: COMMON_SEM1,
    2: COMMON_SEM2,
    3: [
        { code: 'CE301', name: 'Mechanics of Solids', credits: 4, type: 'Theory' },
        { code: 'CE302', name: 'Fluid Mechanics', credits: 4, type: 'Theory' },
        { code: 'CE303', name: 'Engineering Geology', credits: 4, type: 'Theory' },
        { code: 'CE304', name: 'Surveying', credits: 4, type: 'Theory' },
        { code: 'MA301', name: 'Mathematics – III (Probability & Statistics)', credits: 4, type: 'Theory' },
        { code: 'CE391', name: 'Surveying Lab', credits: 1, type: 'Lab' },
        { code: 'CE392', name: 'Fluid Mechanics Lab', credits: 1, type: 'Lab' },
    ],
    4: [
        { code: 'CE401', name: 'Structural Analysis – I', credits: 4, type: 'Theory' },
        { code: 'CE402', name: 'Building Materials & Construction Technology', credits: 4, type: 'Theory' },
        { code: 'CE403', name: 'Environmental Engineering', credits: 4, type: 'Theory' },
        { code: 'CE404', name: 'Transportation Engineering – I', credits: 4, type: 'Theory' },
        { code: 'CE405', name: 'Concrete Technology', credits: 4, type: 'Theory' },
        { code: 'CE491', name: 'Concrete Tech Lab', credits: 1, type: 'Lab' },
        { code: 'CE492', name: 'Engineering Geology Lab', credits: 1, type: 'Lab' },
    ],
    5: [
        { code: 'CE501', name: 'Structural Analysis – II', credits: 4, type: 'Theory' },
        { code: 'CE502', name: 'Design of RC Structures', credits: 4, type: 'Theory' },
        { code: 'CE503', name: 'Geotechnical Engineering', credits: 4, type: 'Theory' },
        { code: 'CE504', name: 'Hydraulics & Hydraulic Machinery', credits: 4, type: 'Theory' },
        { code: 'CE505', name: 'Transportation Engineering – II', credits: 4, type: 'Theory' },
        { code: 'CE591', name: 'Geotechnical Engineering Lab', credits: 1, type: 'Lab' },
        { code: 'CE592', name: 'Strength of Materials Lab', credits: 1, type: 'Lab' },
    ],
    6: [
        { code: 'CE601', name: 'Design of Steel Structures', credits: 4, type: 'Theory' },
        { code: 'CE602', name: 'Irrigation & Water Resources Engineering', credits: 4, type: 'Theory' },
        { code: 'CE603', name: 'Foundation Engineering', credits: 4, type: 'Theory' },
        { code: 'CE604E', name: 'Remote Sensing & GIS (Elective)', credits: 3, type: 'Elective' },
        { code: 'CE691', name: 'CAD Lab (AutoCAD)', credits: 1, type: 'Lab' },
    ],
    7: [
        { code: 'CE701', name: 'Estimation & Quantity Surveying', credits: 4, type: 'Theory' },
        { code: 'CE702', name: 'Construction Management', credits: 4, type: 'Theory' },
        { code: 'CE703E', name: 'Green Building Technologies (Elective)', credits: 3, type: 'Elective' },
        { code: 'CE791', name: 'Project Phase – I', credits: 2, type: 'Lab' },
    ],
    8: [
        { code: 'CE801', name: 'Environmental Impact Assessment', credits: 4, type: 'Theory' },
        { code: 'CE802E', name: 'Smart Infrastructure (Elective)', credits: 3, type: 'Elective' },
        { code: 'CE891', name: 'Project Phase – II', credits: 6, type: 'Lab' },
        { code: 'CE892', name: 'Seminar & Technical Presentation', credits: 2, type: 'Lab' },
    ],
};

// ── IT subjects ───────────────────────────────────────────────────────────────
const IT_SUBJECTS = {
    1: COMMON_SEM1,
    2: COMMON_SEM2,
    3: [
        { code: 'IT301', name: 'Data Structures & Algorithms', credits: 4, type: 'Theory' },
        { code: 'IT302', name: 'Digital Logic Design', credits: 4, type: 'Theory' },
        { code: 'IT303', name: 'Object Oriented Programming using Java', credits: 4, type: 'Theory' },
        { code: 'MA301', name: 'Mathematics – III (Probability & Statistics)', credits: 4, type: 'Theory' },
        { code: 'IT304', name: 'Computer Organization', credits: 4, type: 'Theory' },
        { code: 'IT391', name: 'Data Structures Lab', credits: 1, type: 'Lab' },
        { code: 'IT392', name: 'Java Lab', credits: 1, type: 'Lab' },
    ],
    4: [
        { code: 'IT401', name: 'Operating Systems', credits: 4, type: 'Theory' },
        { code: 'IT402', name: 'Database Management Systems', credits: 4, type: 'Theory' },
        { code: 'IT403', name: 'Computer Networks', credits: 4, type: 'Theory' },
        { code: 'IT404', name: 'Software Engineering', credits: 4, type: 'Theory' },
        { code: 'IT405', name: 'Theory of Computation', credits: 4, type: 'Theory' },
        { code: 'IT491', name: 'DBMS Lab', credits: 1, type: 'Lab' },
        { code: 'IT492', name: 'Networks Lab', credits: 1, type: 'Lab' },
    ],
    5: [
        { code: 'IT501', name: 'Web Technologies', credits: 4, type: 'Theory' },
        { code: 'IT502', name: 'Information Security', credits: 4, type: 'Theory' },
        { code: 'IT503', name: 'Design & Analysis of Algorithms', credits: 4, type: 'Theory' },
        { code: 'IT504', name: 'Mobile Application Development', credits: 4, type: 'Theory' },
        { code: 'IT505', name: 'Cloud Computing', credits: 4, type: 'Theory' },
        { code: 'IT591', name: 'Web Technologies Lab', credits: 1, type: 'Lab' },
        { code: 'IT592', name: 'Mobile Application Lab', credits: 1, type: 'Lab' },
    ],
    6: [
        { code: 'IT601', name: 'Machine Learning', credits: 4, type: 'Theory' },
        { code: 'IT602', name: 'Big Data Analytics', credits: 4, type: 'Theory' },
        { code: 'IT603', name: 'Cyber Security', credits: 4, type: 'Theory' },
        { code: 'IT604E', name: 'Blockchain Technology (Elective)', credits: 3, type: 'Elective' },
        { code: 'IT691', name: 'Machine Learning Lab', credits: 1, type: 'Lab' },
    ],
    7: [
        { code: 'IT701', name: 'Deep Learning', credits: 4, type: 'Theory' },
        { code: 'IT702', name: 'Internet of Things', credits: 4, type: 'Theory' },
        { code: 'IT703E', name: 'Quantum Computing (Elective)', credits: 3, type: 'Elective' },
        { code: 'IT791', name: 'Project Phase – I', credits: 2, type: 'Lab' },
    ],
    8: [
        { code: 'IT801', name: 'DevOps & Agile Methodologies', credits: 4, type: 'Theory' },
        { code: 'IT802E', name: 'AR/VR Technologies (Elective)', credits: 3, type: 'Elective' },
        { code: 'IT891', name: 'Project Phase – II', credits: 6, type: 'Lab' },
        { code: 'IT892', name: 'Seminar & Technical Presentation', credits: 2, type: 'Lab' },
    ],
};

// ── CSE-AI subjects ───────────────────────────────────────────────────────────
const CSE_AI_SUBJECTS = {
    1: COMMON_SEM1,
    2: COMMON_SEM2,
    3: [
        { code: 'AI301', name: 'Data Structures & Algorithms', credits: 4, type: 'Theory' },
        { code: 'AI302', name: 'Python Programming', credits: 4, type: 'Theory' },
        { code: 'AI303', name: 'Probability Theory & Statistics', credits: 4, type: 'Theory' },
        { code: 'MA301', name: 'Mathematics – III (Linear Algebra for AI)', credits: 4, type: 'Theory' },
        { code: 'AI304', name: 'Discrete Mathematics', credits: 4, type: 'Theory' },
        { code: 'AI391', name: 'Python Programming Lab', credits: 1, type: 'Lab' },
        { code: 'AI392', name: 'Data Structures Lab', credits: 1, type: 'Lab' },
    ],
    4: [
        { code: 'AI401', name: 'Machine Learning', credits: 4, type: 'Theory' },
        { code: 'AI402', name: 'Database Management Systems', credits: 4, type: 'Theory' },
        { code: 'AI403', name: 'Operating Systems', credits: 4, type: 'Theory' },
        { code: 'AI404', name: 'Artificial Intelligence', credits: 4, type: 'Theory' },
        { code: 'AI405', name: 'Software Engineering', credits: 4, type: 'Theory' },
        { code: 'AI491', name: 'Machine Learning Lab', credits: 1, type: 'Lab' },
        { code: 'AI492', name: 'AI Algorithms Lab', credits: 1, type: 'Lab' },
    ],
    5: [
        { code: 'AI501', name: 'Deep Learning', credits: 4, type: 'Theory' },
        { code: 'AI502', name: 'Natural Language Processing', credits: 4, type: 'Theory' },
        { code: 'AI503', name: 'Computer Vision', credits: 4, type: 'Theory' },
        { code: 'AI504', name: 'Knowledge Representation & Reasoning', credits: 4, type: 'Theory' },
        { code: 'AI505', name: 'Big Data Analytics', credits: 4, type: 'Theory' },
        { code: 'AI591', name: 'Deep Learning Lab', credits: 1, type: 'Lab' },
        { code: 'AI592', name: 'NLP Lab', credits: 1, type: 'Lab' },
    ],
    6: [
        { code: 'AI601', name: 'Reinforcement Learning', credits: 4, type: 'Theory' },
        { code: 'AI602', name: 'Generative AI & Transformer Models', credits: 4, type: 'Theory' },
        { code: 'AI603', name: 'Cloud Computing for AI', credits: 4, type: 'Theory' },
        { code: 'AI604E', name: 'Ethics in AI (Elective)', credits: 3, type: 'Elective' },
        { code: 'AI691', name: 'Computer Vision Lab', credits: 1, type: 'Lab' },
    ],
    7: [
        { code: 'AI701', name: 'AI in Healthcare', credits: 4, type: 'Theory' },
        { code: 'AI702', name: 'Autonomous Systems & Robotics', credits: 4, type: 'Theory' },
        { code: 'AI703E', name: 'Federated Learning (Elective)', credits: 3, type: 'Elective' },
        { code: 'AI791', name: 'Project Phase – I', credits: 2, type: 'Lab' },
    ],
    8: [
        { code: 'AI801', name: 'MLOps & Model Deployment', credits: 4, type: 'Theory' },
        { code: 'AI802E', name: 'AI Safety & Alignment (Elective)', credits: 3, type: 'Elective' },
        { code: 'AI891', name: 'Project Phase – II', credits: 6, type: 'Lab' },
        { code: 'AI892', name: 'Seminar & Technical Presentation', credits: 2, type: 'Lab' },
    ],
};

// ── CSE-DS subjects ───────────────────────────────────────────────────────────
const CSE_DS_SUBJECTS = {
    1: COMMON_SEM1,
    2: COMMON_SEM2,
    3: [
        { code: 'DS301', name: 'Data Structures & Algorithms', credits: 4, type: 'Theory' },
        { code: 'DS302', name: 'Python for Data Science', credits: 4, type: 'Theory' },
        { code: 'DS303', name: 'Statistics & Probability', credits: 4, type: 'Theory' },
        { code: 'MA301', name: 'Mathematics – III (Numerical Methods)', credits: 4, type: 'Theory' },
        { code: 'DS304', name: 'Database Management Systems', credits: 4, type: 'Theory' },
        { code: 'DS391', name: 'Python Lab', credits: 1, type: 'Lab' },
        { code: 'DS392', name: 'DBMS Lab', credits: 1, type: 'Lab' },
    ],
    4: [
        { code: 'DS401', name: 'Machine Learning', credits: 4, type: 'Theory' },
        { code: 'DS402', name: 'Big Data Technologies (Hadoop & Spark)', credits: 4, type: 'Theory' },
        { code: 'DS403', name: 'Data Warehousing & Mining', credits: 4, type: 'Theory' },
        { code: 'DS404', name: 'Data Visualization (Tableau, Power BI)', credits: 4, type: 'Theory' },
        { code: 'DS405', name: 'Software Engineering', credits: 4, type: 'Theory' },
        { code: 'DS491', name: 'Machine Learning Lab', credits: 1, type: 'Lab' },
        { code: 'DS492', name: 'Big Data Lab', credits: 1, type: 'Lab' },
    ],
    5: [
        { code: 'DS501', name: 'Deep Learning', credits: 4, type: 'Theory' },
        { code: 'DS502', name: 'Natural Language Processing', credits: 4, type: 'Theory' },
        { code: 'DS503', name: 'Time Series Analysis & Forecasting', credits: 4, type: 'Theory' },
        { code: 'DS504', name: 'Cloud Computing & Data Engineering', credits: 4, type: 'Theory' },
        { code: 'DS505', name: 'Statistical Inference', credits: 4, type: 'Theory' },
        { code: 'DS591', name: 'Data Analytics Lab', credits: 1, type: 'Lab' },
        { code: 'DS592', name: 'Deep Learning Lab', credits: 1, type: 'Lab' },
    ],
    6: [
        { code: 'DS601', name: 'Computer Vision', credits: 4, type: 'Theory' },
        { code: 'DS602', name: 'Recommender Systems', credits: 4, type: 'Theory' },
        { code: 'DS603', name: 'Graph Analytics', credits: 4, type: 'Theory' },
        { code: 'DS604E', name: 'Social Media Analytics (Elective)', credits: 3, type: 'Elective' },
        { code: 'DS691', name: 'Data Engineering Pipeline Lab', credits: 1, type: 'Lab' },
    ],
    7: [
        { code: 'DS701', name: 'Responsible Data Science & Ethics', credits: 4, type: 'Theory' },
        { code: 'DS702', name: 'MLOps & Data Product Development', credits: 4, type: 'Theory' },
        { code: 'DS703E', name: 'Bioinformatics & Health Analytics (Elective)', credits: 3, type: 'Elective' },
        { code: 'DS791', name: 'Project Phase – I', credits: 2, type: 'Lab' },
    ],
    8: [
        { code: 'DS801', name: 'Data Science Capstone Seminar', credits: 4, type: 'Theory' },
        { code: 'DS802E', name: 'Quantum Data Computing (Elective)', credits: 3, type: 'Elective' },
        { code: 'DS891', name: 'Project Phase – II', credits: 6, type: 'Lab' },
        { code: 'DS892', name: 'Seminar & Technical Presentation', credits: 2, type: 'Lab' },
    ],
};

// ── CSE-CS (Cyber Security) subjects ─────────────────────────────────────────
const CSE_CS_SUBJECTS = {
    1: COMMON_SEM1,
    2: COMMON_SEM2,
    3: [
        { code: 'CY301', name: 'Data Structures & Algorithms', credits: 4, type: 'Theory' },
        { code: 'CY302', name: 'Computer Networks', credits: 4, type: 'Theory' },
        { code: 'CY303', name: 'Operating Systems', credits: 4, type: 'Theory' },
        { code: 'MA301', name: 'Mathematics – III (Discrete Math & Cryptography)', credits: 4, type: 'Theory' },
        { code: 'CY304', name: 'Database Management Systems', credits: 4, type: 'Theory' },
        { code: 'CY391', name: 'Networking Lab', credits: 1, type: 'Lab' },
        { code: 'CY392', name: 'OS Security Lab', credits: 1, type: 'Lab' },
    ],
    4: [
        { code: 'CY401', name: 'Cryptography & Network Security', credits: 4, type: 'Theory' },
        { code: 'CY402', name: 'Ethical Hacking & Penetration Testing', credits: 4, type: 'Theory' },
        { code: 'CY403', name: 'Digital Forensics', credits: 4, type: 'Theory' },
        { code: 'CY404', name: 'Web Application Security', credits: 4, type: 'Theory' },
        { code: 'CY405', name: 'Software Engineering', credits: 4, type: 'Theory' },
        { code: 'CY491', name: 'Cryptography Lab', credits: 1, type: 'Lab' },
        { code: 'CY492', name: 'Ethical Hacking Lab', credits: 1, type: 'Lab' },
    ],
    5: [
        { code: 'CY501', name: 'Malware Analysis & Reverse Engineering', credits: 4, type: 'Theory' },
        { code: 'CY502', name: 'Cloud Security', credits: 4, type: 'Theory' },
        { code: 'CY503', name: 'Intrusion Detection Systems', credits: 4, type: 'Theory' },
        { code: 'CY504', name: 'Secure Software Development', credits: 4, type: 'Theory' },
        { code: 'CY505', name: 'Risk Management & Compliance', credits: 4, type: 'Theory' },
        { code: 'CY591', name: 'Malware Analysis Lab', credits: 1, type: 'Lab' },
        { code: 'CY592', name: 'Cloud Security Lab', credits: 1, type: 'Lab' },
    ],
    6: [
        { code: 'CY601', name: 'IoT Security', credits: 4, type: 'Theory' },
        { code: 'CY602', name: 'Blockchain for Security', credits: 4, type: 'Theory' },
        { code: 'CY603', name: 'AI for Cyber Security', credits: 4, type: 'Theory' },
        { code: 'CY604E', name: 'Privacy Engineering (Elective)', credits: 3, type: 'Elective' },
        { code: 'CY691', name: 'CTF & Security Lab', credits: 1, type: 'Lab' },
    ],
    7: [
        { code: 'CY701', name: 'Cyber Laws & Cyber Crime', credits: 4, type: 'Theory' },
        { code: 'CY702', name: 'Incident Response & Threat Intelligence', credits: 4, type: 'Theory' },
        { code: 'CY703E', name: 'Zero Trust Security Architecture (Elective)', credits: 3, type: 'Elective' },
        { code: 'CY791', name: 'Project Phase – I', credits: 2, type: 'Lab' },
    ],
    8: [
        { code: 'CY801', name: 'Advanced Cyber Defense', credits: 4, type: 'Theory' },
        { code: 'CY802E', name: 'Security Operations Center (SOC) Management (Elective)', credits: 3, type: 'Elective' },
        { code: 'CY891', name: 'Project Phase – II', credits: 6, type: 'Lab' },
        { code: 'CY892', name: 'Seminar & Technical Presentation', credits: 2, type: 'Lab' },
    ],
};

// ── Branch → subjects map ─────────────────────────────────────────────────────
const BRANCH_MAP = {
    'CSE':    { label: 'Computer Science & Engineering', subjects: CSE_SUBJECTS },
    'ECE':    { label: 'Electronics & Communication Engineering', subjects: ECE_SUBJECTS },
    'EEE':    { label: 'Electrical & Electronics Engineering', subjects: EEE_SUBJECTS },
    'MECH':   { label: 'Mechanical Engineering', subjects: MECH_SUBJECTS },
    'CIVIL':  { label: 'Civil Engineering', subjects: CIVIL_SUBJECTS },
    'IT':     { label: 'Information Technology', subjects: IT_SUBJECTS },
    'CSE-AI': { label: 'CSE – Artificial Intelligence & ML', subjects: CSE_AI_SUBJECTS },
    'CSE-DS': { label: 'CSE – Data Science', subjects: CSE_DS_SUBJECTS },
    'CSE-CS': { label: 'CSE – Cyber Security', subjects: CSE_CS_SUBJECTS },
};

// ── Seeding function ──────────────────────────────────────────────────────────

async function seed() {
    console.log('\n🌱  SRIT Subject Seeder starting...\n');

    // Give blockchain service time to initialise
    await blockchain.initBlockchain();
    await sleep(3000);

    let total = 0;
    let errors = 0;

    for (const [dept, { label, subjects }] of Object.entries(BRANCH_MAP)) {
        console.log(`\n📚  Seeding ${label} (${dept})...`);

        for (let sem = 1; sem <= 8; sem++) {
            const semSubjects = subjects[sem] || [];
            const year = Math.ceil(sem / 2);

            for (const sub of semSubjects) {
                const id = uuidv4();
                const key = `subj_${id}`;
                const data = {
                    id,
                    code: sub.code,
                    name: sub.name,
                    department: dept,
                    semester: sem,
                    year,
                    credits: sub.credits,
                    type: sub.type,
                    faculty: null,
                    section: '',
                    createdBy: 'seed-script',
                    createdAt: new Date().toISOString(),
                };

                try {
                    await blockchain.storeRecord('subject', key, data, 'seed');
                    console.log(`  ✅  Sem ${sem} | ${sub.code} – ${sub.name}`);
                    total++;
                } catch (err) {
                    console.error(`  ❌  Failed: ${sub.code} – ${err.message}`);
                    errors++;
                }
            }
        }
    }

    console.log(`\n\n✨  Seeding complete!  ${total} subjects added, ${errors} errors.\n`);
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed script failed:', err);
    process.exit(1);
});
