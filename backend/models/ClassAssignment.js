const mongoose = require('mongoose');

const ClassAssignmentSchema = new mongoose.Schema({
    faculty: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Please assign a faculty member']
    },
    department: {
        type: String,
        required: [true, 'Please add a department']
    },
    year: {
        type: Number,
        required: [true, 'Please add a year'],
        min: 1,
        max: 4
    },
    semester: {
        type: Number,
        required: [true, 'Please add a semester'],
        min: 1,
        max: 8
    },
    section: {
        type: String,
        required: [true, 'Please add a section'],
        uppercase: true,
        trim: true
    },
    academicYear: {
        type: String,
        required: [true, 'Please add an academic year'] // e.g. '2024-25'
    },
    assignedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// One class teacher per section
ClassAssignmentSchema.index(
    { department: 1, year: 1, semester: 1, section: 1, academicYear: 1 },
    { unique: true }
);

module.exports = mongoose.model('ClassAssignment', ClassAssignmentSchema);
