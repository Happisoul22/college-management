/**
 * utils/initSubjects.js
 *
 * Auto-initializes the subjects collection on server startup.
 * Runs once: only inserts subjects that don't already exist (idempotent).
 * No seed scripts needed — this is embedded in the server startup.
 */
const Subject = require('../models/Subject');

// ─── JNTUA R20 — All Branches ───────────────────────────────────────────────
// Branches: CSE | CSE-AI | CSE-DS | IT | ECE | EEE | MECH | CIVIL

const CSE_FAMILY = ['CSE', 'CSE-AI', 'CSE-DS', 'IT'];

// ── Year 1, Sem 1 (CSE family) ───────────────────────────────────────────────
const Y1S1_CSE = [
    { code: '20A15101', name: 'Linear Algebra and Calculus', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A15201', name: 'Applied Physics', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A15501', name: 'Communicative English', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A10501', name: 'Problem Solving and C Programming', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A10301', name: 'Engineering Drawing', credits: 2, semester: 1, year: 1, type: 'Lab' },
    { code: '20A15202', name: 'Applied Physics Lab', credits: 2, semester: 1, year: 1, type: 'Lab' },
    { code: '20A15502', name: 'Communicative English Lab', credits: 2, semester: 1, year: 1, type: 'Lab' },
    { code: '20A10502', name: 'Problem Solving and C Programming Lab', credits: 2, semester: 1, year: 1, type: 'Lab' },
];

// ── Year 1, Sem 2 (CSE family) ───────────────────────────────────────────────
const Y1S2_CSE = [
    { code: '20A15102', name: 'Differential Equations & Vector Calculus', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A15303', name: 'Chemistry', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A10503', name: 'Python Programming', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A12401', name: 'Basic Electrical and Electronics Engineering', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A10303', name: 'Engineering Workshop', credits: 1, semester: 2, year: 1, type: 'Lab' },
    { code: '20A10505', name: 'CSE Workshop', credits: 2, semester: 2, year: 1, type: 'Lab' },
    { code: '20A10504', name: 'Python Programming Lab', credits: 2, semester: 2, year: 1, type: 'Lab' },
    { code: '20A15304', name: 'Chemistry Lab', credits: 2, semester: 2, year: 1, type: 'Lab' },
    { code: '20A12402', name: 'Basic Electrical and Electronics Engineering Lab', credits: 2, semester: 2, year: 1, type: 'Lab' },
];

// ── Year 1, Sem 1 (ECE/EEE) ─────────────────────────────────────────────────
const Y1S1_ECE_EEE = [
    { code: '20A15101E', name: 'Linear Algebra and Calculus', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A15201E', name: 'Applied Physics', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A15501E', name: 'Communicative English', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A02301E', name: 'Basic Electrical Engineering', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A10301E', name: 'Engineering Drawing', credits: 2, semester: 1, year: 1, type: 'Lab' },
    { code: '20A02301P', name: 'Basic Electrical Engineering Lab', credits: 2, semester: 1, year: 1, type: 'Lab' },
    { code: '20A15202E', name: 'Applied Physics Lab', credits: 2, semester: 1, year: 1, type: 'Lab' },
    { code: '20A15502E', name: 'Communicative English Lab', credits: 2, semester: 1, year: 1, type: 'Lab' },
];

// ── Year 1, Sem 2 (ECE/EEE) ─────────────────────────────────────────────────
const Y1S2_ECE_EEE = [
    { code: '20A15102E', name: 'Differential Equations & Vector Calculus', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A15303E', name: 'Chemistry', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A10506', name: 'C Programming & Data Structures', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A04101', name: 'Electronic Devices & Circuits', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A10303E', name: 'Engineering Workshop', credits: 2, semester: 2, year: 1, type: 'Lab' },
    { code: '20A04101P', name: 'Electronic Devices & Circuits Lab', credits: 2, semester: 2, year: 1, type: 'Lab' },
    { code: '20A10506P', name: 'C Programming & Data Structures Lab', credits: 2, semester: 2, year: 1, type: 'Lab' },
    { code: '20A15304E', name: 'Chemistry Lab', credits: 2, semester: 2, year: 1, type: 'Lab' },
];

// ── Year 1, Sem 1 (MECH/CIVIL) ───────────────────────────────────────────────
const Y1S1_MC = [
    { code: '20A15101M', name: 'Linear Algebra and Calculus', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A15401', name: 'Applied Chemistry', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A15501M', name: 'Communicative English', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A03101', name: 'Engineering Mechanics', credits: 3, semester: 1, year: 1, type: 'Theory' },
    { code: '20A03301', name: 'Engineering Drawing (Mech/Civil)', credits: 2, semester: 1, year: 1, type: 'Lab' },
    { code: '20A15402', name: 'Applied Chemistry Lab', credits: 2, semester: 1, year: 1, type: 'Lab' },
    { code: '20A15502M', name: 'Communicative English Lab', credits: 2, semester: 1, year: 1, type: 'Lab' },
    { code: '20A10303M', name: 'Engineering Workshop', credits: 2, semester: 1, year: 1, type: 'Lab' },
];

// ── Year 1, Sem 2 (MECH/CIVIL) ───────────────────────────────────────────────
const Y1S2_MC = [
    { code: '20A15102M', name: 'Differential Equations & Vector Calculus', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A15201M', name: 'Applied Physics', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A12401M', name: 'Basic Electrical & Electronics Engg', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A03201', name: 'Engineering Materials & Metallurgy', credits: 3, semester: 2, year: 1, type: 'Theory' },
    { code: '20A15202M', name: 'Applied Physics Lab', credits: 2, semester: 2, year: 1, type: 'Lab' },
    { code: '20A12402M', name: 'Basic EEE Lab', credits: 2, semester: 2, year: 1, type: 'Lab' },
];

// ── CSE Year 2-4 (shared base for CSE, CSE-AI, CSE-DS, IT) ──────────────────
const CSE_CORE = [
    // Sem 3
    { code: '20A54304', name: 'Discrete Mathematics & Graph Theory', credits: 3, semester: 3, year: 2, type: 'Theory' },
    { code: '20A38301T', name: 'Digital Logic Design & Computer Organization', credits: 3, semester: 3, year: 2, type: 'Theory' },
    { code: '20A05301T', name: 'Advanced Data Structures & Algorithms', credits: 3, semester: 3, year: 2, type: 'Theory' },
    { code: '20A05302T', name: 'Object Oriented Programming Through Java', credits: 3, semester: 3, year: 2, type: 'Theory' },
    { code: '20A38302', name: 'Human Computer Interaction', credits: 3, semester: 3, year: 2, type: 'Theory' },
    { code: '20A52201', name: 'Universal Human Values', credits: 3, semester: 3, year: 2, type: 'Theory' },
    { code: '20A38301P', name: 'Digital Logic Design & Computer Organization Lab', credits: 2, semester: 3, year: 2, type: 'Lab' },
    { code: '20A05301P', name: 'Advanced Data Structures & Algorithms Lab', credits: 2, semester: 3, year: 2, type: 'Lab' },
    { code: '20A05302P', name: 'Object Oriented Programming Through Java Lab', credits: 2, semester: 3, year: 2, type: 'Lab' },
    // Sem 4
    { code: '20A54406', name: 'Mathematical Modeling and Simulation', credits: 3, semester: 4, year: 2, type: 'Theory' },
    { code: '20A05401T', name: 'Database Management Systems', credits: 3, semester: 4, year: 2, type: 'Theory' },
    { code: '20A05402T', name: 'Operating Systems', credits: 3, semester: 4, year: 2, type: 'Theory' },
    { code: '20A38401T', name: 'Visual Design & Communication', credits: 3, semester: 4, year: 2, type: 'Theory' },
    { code: '20A52301', name: 'Managerial Economics & Financial Analysis', credits: 3, semester: 4, year: 2, type: 'Theory' },
    { code: '20A05401P', name: 'Database Management Systems Lab', credits: 2, semester: 4, year: 2, type: 'Lab' },
    { code: '20A05402P', name: 'Operating Systems Lab', credits: 2, semester: 4, year: 2, type: 'Lab' },
    { code: '20A38401P', name: 'Visual Design & Communication Lab', credits: 2, semester: 4, year: 2, type: 'Lab' },
    // Sem 5
    { code: '20A05501T', name: 'Computer Networks', credits: 3, semester: 5, year: 3, type: 'Theory' },
    { code: '20A05502T', name: 'Compiler Design', credits: 3, semester: 5, year: 3, type: 'Theory' },
    { code: '20A05503T', name: 'Machine Learning', credits: 3, semester: 5, year: 3, type: 'Theory' },
    { code: '20A05504T', name: 'Software Engineering', credits: 3, semester: 5, year: 3, type: 'Theory' },
    { code: '20A05505T', name: 'Microprocessors and Interfacing', credits: 3, semester: 5, year: 3, type: 'Theory' },
    { code: '20A05501P', name: 'Computer Networks Lab', credits: 2, semester: 5, year: 3, type: 'Lab' },
    { code: '20A05502P', name: 'Compiler Design Lab', credits: 2, semester: 5, year: 3, type: 'Lab' },
    { code: '20A05503P', name: 'Machine Learning Lab', credits: 2, semester: 5, year: 3, type: 'Lab' },
    // Sem 6
    { code: '20A05601T', name: 'Artificial Intelligence', credits: 3, semester: 6, year: 3, type: 'Theory' },
    { code: '20A05602T', name: 'Cloud Computing', credits: 3, semester: 6, year: 3, type: 'Theory' },
    { code: '20A05603T', name: 'Cryptography and Network Security', credits: 3, semester: 6, year: 3, type: 'Theory' },
    { code: '20A05604T', name: 'Web Technologies', credits: 3, semester: 6, year: 3, type: 'Theory' },
    { code: '20A05605T', name: 'Data Warehousing and Data Mining', credits: 3, semester: 6, year: 3, type: 'Theory' },
    { code: '20A05601P', name: 'Artificial Intelligence Lab', credits: 2, semester: 6, year: 3, type: 'Lab' },
    { code: '20A05602P', name: 'Cloud Computing Lab', credits: 2, semester: 6, year: 3, type: 'Lab' },
    { code: '20A05603P', name: 'Web Technologies Lab', credits: 2, semester: 6, year: 3, type: 'Lab' },
    // Sem 7
    { code: '20A05701T', name: 'Deep Learning', credits: 3, semester: 7, year: 4, type: 'Theory' },
    { code: '20A05702T', name: 'Internet of Things', credits: 3, semester: 7, year: 4, type: 'Theory' },
    { code: '20A05703T', name: 'Big Data Analytics', credits: 3, semester: 7, year: 4, type: 'Theory' },
    { code: '20A05704T', name: 'Natural Language Processing', credits: 3, semester: 7, year: 4, type: 'Theory' },
    { code: '20A05701P', name: 'Deep Learning Lab', credits: 2, semester: 7, year: 4, type: 'Lab' },
    { code: '20A05702P', name: 'IoT Lab', credits: 2, semester: 7, year: 4, type: 'Lab' },
    { code: '20A05799', name: 'Project Work Phase-I', credits: 2, semester: 7, year: 4, type: 'Project' },
    // Sem 8
    { code: '20A05801T', name: 'Blockchain Technology', credits: 3, semester: 8, year: 4, type: 'Theory' },
    { code: '20A05802T', name: 'DevOps and Agile Methodologies', credits: 3, semester: 8, year: 4, type: 'Theory' },
    { code: '20A05803T', name: 'Mobile Application Development', credits: 3, semester: 8, year: 4, type: 'Theory' },
    { code: '20A05804T', name: 'Cyber Security', credits: 3, semester: 8, year: 4, type: 'Theory' },
    { code: '20A05899', name: 'Project Work Phase-II', credits: 6, semester: 8, year: 4, type: 'Project' },
    { code: '20A05801S', name: 'Seminar', credits: 2, semester: 8, year: 4, type: 'Seminar' },
];

// ── Branch-specific specializations ─────────────────────────────────────────
const BRANCH_EXTRAS = [
    // CSE-AI
    { code: '20A06301T', name: 'Statistical Methods for AI', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'CSE-AI' },
    { code: '20A06302T', name: 'Foundations of Artificial Intelligence', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'CSE-AI' },
    { code: '20A06501T', name: 'Deep Neural Networks', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'CSE-AI' },
    { code: '20A06601T', name: 'Computer Vision', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'CSE-AI' },
    { code: '20A06701T', name: 'Reinforcement Learning', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'CSE-AI' },
    // CSE-DS
    { code: '20A07301T', name: 'Statistical Data Analysis', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'CSE-DS' },
    { code: '20A07302T', name: 'Data Visualization Techniques', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'CSE-DS' },
    { code: '20A07501T', name: 'Big Data Technologies', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'CSE-DS' },
    { code: '20A07601T', name: 'Business Intelligence', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'CSE-DS' },
    { code: '20A07701T', name: 'Data Engineering & Pipelines', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'CSE-DS' },
    // IT
    { code: '20A08301T', name: 'Information Security', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'IT' },
    { code: '20A08302T', name: 'Network Administration', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'IT' },
    { code: '20A08501T', name: 'E-Commerce Technologies', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'IT' },
    { code: '20A08601T', name: 'Service Oriented Architecture', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'IT' },
    { code: '20A08701T', name: 'Enterprise Application Development', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'IT' },
];

// ── ECE Year 2-4 ─────────────────────────────────────────────────────────────
const ECE_CORE = [
    { code: '20A54302', name: 'Complex Variables and Transforms', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'ECE' },
    { code: '20A04301T', name: 'Signals and Systems', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'ECE' },
    { code: '20A02303T', name: 'Electrical Engineering (ECE)', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'ECE' },
    { code: '20A04302T', name: 'Analog Circuits', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'ECE' },
    { code: '20A04303T', name: 'Digital Logic Design (ECE)', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'ECE' },
    { code: '20A04301P', name: 'Simulation Lab (ECE)', credits: 2, semester: 3, year: 2, type: 'Lab', department: 'ECE' },
    { code: '20A04302P', name: 'Analog Circuits Lab', credits: 2, semester: 3, year: 2, type: 'Lab', department: 'ECE' },
    { code: '20A02303P', name: 'Electrical Engineering Lab (ECE)', credits: 2, semester: 3, year: 2, type: 'Lab', department: 'ECE' },
    { code: '20A04401T', name: 'Digital Communications', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'ECE' },
    { code: '20A04402T', name: 'Linear IC Applications', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'ECE' },
    { code: '20A04403T', name: 'Digital Signal Processing (ECE)', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'ECE' },
    { code: '20A04404T', name: 'Electromagnetic Fields & Waves', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'ECE' },
    { code: '20A04401P', name: 'Digital Communications Lab', credits: 2, semester: 4, year: 2, type: 'Lab', department: 'ECE' },
    { code: '20A04402P', name: 'IC Applications Lab', credits: 2, semester: 4, year: 2, type: 'Lab', department: 'ECE' },
    { code: '20A04403P', name: 'Digital Signal Processing Lab', credits: 2, semester: 4, year: 2, type: 'Lab', department: 'ECE' },
    { code: '20A04501', name: 'Control Systems Engineering', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'ECE' },
    { code: '20A04502T', name: 'Digital Signal Processing Advanced', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'ECE' },
    { code: '20A04503T', name: 'Microprocessors and Microcontrollers', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'ECE' },
    { code: '20A04504T', name: 'Communication Systems', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'ECE' },
    { code: '20A04503P', name: 'Microprocessors & Microcontrollers Lab', credits: 2, semester: 5, year: 3, type: 'Lab', department: 'ECE' },
    { code: '20A04504P', name: 'Communication Systems Lab', credits: 2, semester: 5, year: 3, type: 'Lab', department: 'ECE' },
    { code: '20A04601T', name: 'Antennas & Microwave Engineering', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'ECE' },
    { code: '20A04602T', name: 'VLSI Design', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'ECE' },
    { code: '20A04603T', name: 'Communication Networks', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'ECE' },
    { code: '20A04604T', name: 'Embedded Systems', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'ECE' },
    { code: '20A04601P', name: 'Antennas & Microwave Engg Lab', credits: 2, semester: 6, year: 3, type: 'Lab', department: 'ECE' },
    { code: '20A04602P', name: 'VLSI Design Lab', credits: 2, semester: 6, year: 3, type: 'Lab', department: 'ECE' },
    { code: '20A04603P', name: 'Communication Networks Lab', credits: 2, semester: 6, year: 3, type: 'Lab', department: 'ECE' },
    { code: '20A04701T', name: 'Digital Image Processing', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'ECE' },
    { code: '20A04702T', name: 'IoT and Wireless Sensor Networks', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'ECE' },
    { code: '20A04703T', name: 'Radar Engineering', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'ECE' },
    { code: '20A04799', name: 'Project Work Phase-I (ECE)', credits: 2, semester: 7, year: 4, type: 'Project', department: 'ECE' },
    { code: '20A04801', name: 'Full Internship & Project Work (ECE)', credits: 12, semester: 8, year: 4, type: 'Project', department: 'ECE' },
];

// ── EEE Year 2-4 ─────────────────────────────────────────────────────────────
const EEE_CORE = [
    { code: '20A35102', name: 'Complex Variables & Transform Techniques', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'EEE' },
    { code: '20A30201', name: 'Electrical Circuit Analysis', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'EEE' },
    { code: '20A30202', name: 'DC Machines & Transformers', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'EEE' },
    { code: '20A30404', name: 'Digital Logic Design (EEE)', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'EEE' },
    { code: '20A30201P', name: 'Electrical Circuit Analysis Lab', credits: 2, semester: 3, year: 2, type: 'Lab', department: 'EEE' },
    { code: '20A30202P', name: 'DC Machines & Transformers Lab', credits: 2, semester: 3, year: 2, type: 'Lab', department: 'EEE' },
    { code: '20A30301', name: 'Electromagnetic Fields & Waves (EEE)', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'EEE' },
    { code: '20A30302', name: 'AC Machines', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'EEE' },
    { code: '20A30303', name: 'Signals & Systems (EEE)', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'EEE' },
    { code: '20A30304', name: 'Electronic Devices & Circuits (EEE)', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'EEE' },
    { code: '20A30302P', name: 'AC Machines Lab', credits: 2, semester: 4, year: 2, type: 'Lab', department: 'EEE' },
    { code: '20A30304P', name: 'Electronic Devices & Circuits Lab (EEE)', credits: 2, semester: 4, year: 2, type: 'Lab', department: 'EEE' },
    { code: '20A02501', name: 'Power System Architecture', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'EEE' },
    { code: '20A02502T', name: 'Control Systems (EEE)', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'EEE' },
    { code: '20A02503T', name: 'Measurements & Sensors', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'EEE' },
    { code: '20A02504T', name: 'Power Electronics', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'EEE' },
    { code: '20A02502P', name: 'Control Systems Lab (EEE)', credits: 2, semester: 5, year: 3, type: 'Lab', department: 'EEE' },
    { code: '20A02503P', name: 'Measurements & Sensors Lab', credits: 2, semester: 5, year: 3, type: 'Lab', department: 'EEE' },
    { code: '20A02504P', name: 'Power Electronics Lab', credits: 2, semester: 5, year: 3, type: 'Lab', department: 'EEE' },
    { code: '20A02601T', name: 'Power System Analysis', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'EEE' },
    { code: '20A02602T', name: 'Electrical Machines Design', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'EEE' },
    { code: '20A02603T', name: 'High Voltage Engineering', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'EEE' },
    { code: '20A02604T', name: 'Digital Control Systems', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'EEE' },
    { code: '20A02601P', name: 'Power Systems Simulation Lab', credits: 2, semester: 6, year: 3, type: 'Lab', department: 'EEE' },
    { code: '20A02701T', name: 'Switchgear & Protection', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'EEE' },
    { code: '20A02702T', name: 'FACTS & HVDC Transmission', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'EEE' },
    { code: '20A02703T', name: 'Renewable Energy Systems', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'EEE' },
    { code: '20A02799', name: 'Project Work Phase-I (EEE)', credits: 2, semester: 7, year: 4, type: 'Project', department: 'EEE' },
    { code: '20A02801', name: 'Power System Reliability', credits: 3, semester: 8, year: 4, type: 'Theory', department: 'EEE' },
    { code: '20A02899', name: 'Project Work Phase-II (EEE)', credits: 6, semester: 8, year: 4, type: 'Project', department: 'EEE' },
];

// ── MECH Year 2-4 ────────────────────────────────────────────────────────────
const MECH_CORE = [
    { code: '20A35103', name: 'Numerical Methods and Probability (MECH)', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'MECH' },
    { code: '20A03302', name: 'Fluid Mechanics & Hydraulic Machines', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'MECH' },
    { code: '20A03303', name: 'Manufacturing Processes', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'MECH' },
    { code: '20A03304', name: 'Thermodynamics', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'MECH' },
    { code: '20A03305', name: 'Mechanics of Materials', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'MECH' },
    { code: '20A03302P', name: 'Fluid Mechanics Lab', credits: 2, semester: 3, year: 2, type: 'Lab', department: 'MECH' },
    { code: '20A03303P', name: 'Manufacturing Processes Lab', credits: 2, semester: 3, year: 2, type: 'Lab', department: 'MECH' },
    { code: '20A03401', name: 'Applied Thermodynamics', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'MECH' },
    { code: '20A03402', name: 'Kinematics of Machinery', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'MECH' },
    { code: '20A03403', name: 'Manufacturing Technology', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'MECH' },
    { code: '20A03404', name: 'Numerical Methods (MECH)', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'MECH' },
    { code: '20A03401P', name: 'Thermal Engineering Lab', credits: 2, semester: 4, year: 2, type: 'Lab', department: 'MECH' },
    { code: '20A03402P', name: 'Kinematics of Machinery Lab', credits: 2, semester: 4, year: 2, type: 'Lab', department: 'MECH' },
    { code: '20A03501T', name: 'Dynamics of Machinery', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'MECH' },
    { code: '20A03502T', name: 'Design of Machine Elements', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'MECH' },
    { code: '20A03503T', name: 'Heat Transfer', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'MECH' },
    { code: '20A03504T', name: 'Metrology & Instrumentation', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'MECH' },
    { code: '20A03501P', name: 'Dynamics of Machinery Lab', credits: 2, semester: 5, year: 3, type: 'Lab', department: 'MECH' },
    { code: '20A03503P', name: 'Heat Transfer Lab', credits: 2, semester: 5, year: 3, type: 'Lab', department: 'MECH' },
    { code: '20A03601T', name: 'Finite Element Methods', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'MECH' },
    { code: '20A03602T', name: 'Refrigeration & Air Conditioning', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'MECH' },
    { code: '20A03603T', name: 'Industrial Robotics', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'MECH' },
    { code: '20A03604T', name: 'Operations Research', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'MECH' },
    { code: '20A03601P', name: 'CAD/CAM Lab', credits: 2, semester: 6, year: 3, type: 'Lab', department: 'MECH' },
    { code: '20A03602P', name: 'Refrigeration & AC Lab', credits: 2, semester: 6, year: 3, type: 'Lab', department: 'MECH' },
    { code: '20A03701T', name: 'Gas Dynamics & Jet Propulsion', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'MECH' },
    { code: '20A03702T', name: 'Mechatronics', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'MECH' },
    { code: '20A03703T', name: 'Automobile Engineering', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'MECH' },
    { code: '20A03799', name: 'Project Work Phase-I (MECH)', credits: 2, semester: 7, year: 4, type: 'Project', department: 'MECH' },
    { code: '20A03801T', name: 'Production Planning & Control', credits: 3, semester: 8, year: 4, type: 'Theory', department: 'MECH' },
    { code: '20A03899', name: 'Project Work Phase-II (MECH)', credits: 6, semester: 8, year: 4, type: 'Project', department: 'MECH' },
];

// ── CIVIL Year 2-4 ───────────────────────────────────────────────────────────
const CIVIL_CORE = [
    { code: '20A35101', name: 'Numerical Methods & Probability (CIVIL)', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'CIVIL' },
    { code: '20A30101', name: 'Strength of Materials - II', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'CIVIL' },
    { code: '20A30102', name: 'Fluid Mechanics (CIVIL)', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'CIVIL' },
    { code: '20A30103', name: 'Surveying', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'CIVIL' },
    { code: '20A30104', name: 'Concrete Technology', credits: 3, semester: 3, year: 2, type: 'Theory', department: 'CIVIL' },
    { code: '20A30105', name: 'Surveying Lab', credits: 2, semester: 3, year: 2, type: 'Lab', department: 'CIVIL' },
    { code: '20A30106', name: 'Concrete Technology Lab', credits: 2, semester: 3, year: 2, type: 'Lab', department: 'CIVIL' },
    { code: '20A40101', name: 'Geological Sciences for Civil Engineers', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'CIVIL' },
    { code: '20A40102', name: 'Structural Analysis', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'CIVIL' },
    { code: '20A40103', name: 'Hydraulics & Hydraulic Machinery', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'CIVIL' },
    { code: '20A40104', name: 'Environmental Engineering', credits: 3, semester: 4, year: 2, type: 'Theory', department: 'CIVIL' },
    { code: '20A40105', name: 'Fluid Mechanics & Hydraulic Machinery Lab', credits: 2, semester: 4, year: 2, type: 'Lab', department: 'CIVIL' },
    { code: '20A40106', name: 'Environmental Engineering Lab', credits: 2, semester: 4, year: 2, type: 'Lab', department: 'CIVIL' },
    { code: '20A01501T', name: 'Design of Steel Structures', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'CIVIL' },
    { code: '20A01502T', name: 'Foundation Engineering', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'CIVIL' },
    { code: '20A01503T', name: 'Transportation Engineering', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'CIVIL' },
    { code: '20A01504T', name: 'Advanced Structural Analysis', credits: 3, semester: 5, year: 3, type: 'Theory', department: 'CIVIL' },
    { code: '20A01501P', name: 'Structural Analysis Lab', credits: 2, semester: 5, year: 3, type: 'Lab', department: 'CIVIL' },
    { code: '20A01601T', name: 'Design of RCC Structures', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'CIVIL' },
    { code: '20A01602T', name: 'Water Resources Engineering', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'CIVIL' },
    { code: '20A01603T', name: 'Quantity Surveying & Estimation', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'CIVIL' },
    { code: '20A01604T', name: 'GIS & Remote Sensing', credits: 3, semester: 6, year: 3, type: 'Theory', department: 'CIVIL' },
    { code: '20A01601P', name: 'CAD for Civil Engineering', credits: 2, semester: 6, year: 3, type: 'Lab', department: 'CIVIL' },
    { code: '20A01701T', name: 'Construction Management', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'CIVIL' },
    { code: '20A01702T', name: 'Prestressed Concrete Structures', credits: 3, semester: 7, year: 4, type: 'Theory', department: 'CIVIL' },
    { code: '20A01799', name: 'Project Work Phase-I (CIVIL)', credits: 2, semester: 7, year: 4, type: 'Project', department: 'CIVIL' },
    { code: '20A01801T', name: 'Smart Infrastructure', credits: 3, semester: 8, year: 4, type: 'Theory', department: 'CIVIL' },
    { code: '20A01899', name: 'Project Work Phase-II (CIVIL)', credits: 6, semester: 8, year: 4, type: 'Project', department: 'CIVIL' },
];

// ── Build master list ────────────────────────────────────────────────────────
function buildSubjectList() {
    const list = [];

    // CSE family Year 1
    for (const dept of CSE_FAMILY) {
        for (const s of [...Y1S1_CSE, ...Y1S2_CSE]) list.push({ ...s, department: dept });
    }
    // ECE/EEE Year 1
    for (const dept of ['ECE', 'EEE']) {
        for (const s of [...Y1S1_ECE_EEE, ...Y1S2_ECE_EEE]) list.push({ ...s, department: dept });
    }
    // MECH/CIVIL Year 1
    for (const dept of ['MECH', 'CIVIL']) {
        for (const s of [...Y1S1_MC, ...Y1S2_MC]) list.push({ ...s, department: dept });
    }
    // CSE family Year 2-4 core
    for (const dept of CSE_FAMILY) {
        for (const s of CSE_CORE) list.push({ ...s, department: dept });
    }
    // Branch extras + dedicated branch lists
    list.push(...BRANCH_EXTRAS, ...ECE_CORE, ...EEE_CORE, ...MECH_CORE, ...CIVIL_CORE);

    // Deduplicate by code+department
    const seen = new Set();
    return list.filter(s => {
        const key = `${s.code.toUpperCase()}|${s.department}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ── Public function called by server.js on startup ───────────────────────────
const initSubjects = async () => {
    try {
        const count = await Subject.countDocuments();
        if (count > 0) {
            console.log(`📚 Subjects already initialized (${count} records). Skipping.`);
            return;
        }

        const subjects = buildSubjectList();
        let inserted = 0;
        for (const sub of subjects) {
            try {
                await Subject.create({ ...sub, code: sub.code.toUpperCase() });
                inserted++;
            } catch (e) {
                if (e.code !== 11000) console.warn(`  Skipped ${sub.code} (${sub.department}):`, e.message);
            }
        }

        const depts = [...new Set(subjects.map(s => s.department))].sort();
        console.log(`\n📚 Subjects initialized: ${inserted} subjects across [${depts.join(', ')}]`);
    } catch (err) {
        console.error('❌ initSubjects error:', err.message);
    }
};

module.exports = initSubjects;
