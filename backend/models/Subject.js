const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Please add a subject code'],
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Please add a subject name'],
        trim: true
    },
    department: {
        type: String,
        required: [true, 'Please add a department']
    },
    semester: {
        type: Number,
        required: [true, 'Please add a semester'],
        min: 1,
        max: 8
    },
    year: {
        type: Number,
        required: [true, 'Please add a year'],
        min: 1,
        max: 4
    },
    credits: {
        type: Number,
        required: [true, 'Please add credits'],
        min: 1,
        max: 6
    },
    type: {
        type: String,
        enum: ['Theory', 'Lab', 'Project', 'Seminar'],
        default: 'Theory'
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    // Faculty assigned to teach this subject
    faculty: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        default: null
    },
    // Section this subject-faculty combo is for (optional)
    section: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Unique per code+department (same code can apply to multiple branches)
SubjectSchema.index({ code: 1, department: 1 }, { unique: true });
// Quick lookup by dept+semester
SubjectSchema.index({ department: 1, semester: 1 });

module.exports = mongoose.model('Subject', SubjectSchema);
