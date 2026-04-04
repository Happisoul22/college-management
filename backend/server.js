const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const { initBlockchain } = require('./services/blockchain');

// Load env
dotenv.config();

// Boot blockchain + IPFS (both gracefully degrade)
initBlockchain();

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));

// Dev logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// CORS
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [])
];
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security headers
app.use(helmet());

// Prevent XSS
app.use(xss());

// Rate limiting
app.use('/api', rateLimit({ windowMs: 10 * 60 * 1000, max: 1000 }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Mount routers ──────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/marks', require('./routes/marks'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/blockchain', require('./routes/blockchain'));
app.use('/api/projects', require('./routes/projects'));

app.get('/', (req, res) => res.json({ message: 'Academic System API (Blockchain + IPFS)', version: '2.0.0' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
    console.error(`Unhandled rejection: ${err.message}`);
    server.close(() => process.exit(1));
});
