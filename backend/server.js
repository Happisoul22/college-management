const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { initBlockchain } = require('./services/blockchain');

// Load env vars
dotenv.config();

// Connect to database, then initialize blockchain
connectDB().then(() => {
    // Initialize blockchain connection (graceful — won't crash if unavailable)
    initBlockchain();
});

const app = express();

// Body parser
app.use(express.json());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Enable CORS - must be before helmet
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 mins
    max: 1000 // increased for development
});
app.use('/api', limiter);

// Prevent http param pollution
app.use(mongoSanitize());

// Serve uploaded files as static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routers
const auth = require('./routes/auth');
const achievements = require('./routes/achievements');
const analytics = require('./routes/analytics');
const leaves = require('./routes/leaves');
const reports = require('./routes/reports');
const ai = require('./routes/ai');
const subjects = require('./routes/subjects');
const marks = require('./routes/marks');
const attendance = require('./routes/attendance');
const assignments = require('./routes/assignments');

const notifications = require('./routes/notifications');
const blockchainRoutes = require('./routes/blockchain');

app.use('/api/auth', auth);
app.use('/api/achievements', achievements);
app.use('/api/analytics', analytics);
app.use('/api/leaves', leaves);
app.use('/api/reports', reports);
app.use('/api/ai', ai);
app.use('/api/subjects', subjects);
app.use('/api/marks', marks);
app.use('/api/attendance', attendance);
app.use('/api/assignments', assignments);
app.use('/api/notifications', notifications);
app.use('/api/blockchain', blockchainRoutes);





app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
