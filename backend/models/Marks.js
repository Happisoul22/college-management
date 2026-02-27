const mongoose = require('mongoose');

const MarksSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: mongoose.Schema.ObjectId,
        ref: 'Subject',
        required: true
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 8
    },
    year: {
        type: Number,
        required: true,
        min: 1,
        max: 4
    },
    academicYear: {
        type: String // e.g. '2024-25'
    },
    // Internal marks breakdown
    internal: {
        mid1: { type: Number, default: 0, min: 0, max: 30 },
        mid2: { type: Number, default: 0, min: 0, max: 30 },
        assignments: { type: Number, default: 0, min: 0, max: 20 },
        attendance: { type: Number, default: 0, min: 0, max: 10 },
        // Lab-specific
        labInternal: { type: Number, default: 0, min: 0, max: 40 }
    },
    // External marks
    external: {
        examScore: { type: Number, default: 0, min: 0, max: 100 }
    },
    // Calculated totals
    internalTotal: {
        type: Number,
        default: 0
    },
    externalTotal: {
        type: Number,
        default: 0
    },
    totalMarks: {
        type: Number,
        default: 0
    },
    grade: {
        type: String,
        enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F', 'AB', ''],
        default: ''
    },
    gradePoint: {
        type: Number,
        default: 0
    },
    enteredBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent duplicate marks entry
MarksSchema.index({ student: 1, subject: 1, academicYear: 1 }, { unique: true });
// Quick lookup
MarksSchema.index({ student: 1, semester: 1 });

// Calculate totals and grade before saving
MarksSchema.pre('save', function (next) {
    // Internal total
    const i = this.internal;
    if (this.subject?.type === 'Lab') {
        this.internalTotal = (i.labInternal || 0);
    } else {
        this.internalTotal = (i.mid1 || 0) + (i.mid2 || 0) + (i.assignments || 0) + (i.attendance || 0);
    }

    // External total
    this.externalTotal = this.external.examScore || 0;

    // Total (normalized to 100)
    this.totalMarks = this.internalTotal + this.externalTotal;

    // Grade mapping (10-point scale)
    const pct = this.totalMarks;
    if (pct >= 90) { this.grade = 'O'; this.gradePoint = 10; }
    else if (pct >= 80) { this.grade = 'A+'; this.gradePoint = 9; }
    else if (pct >= 70) { this.grade = 'A'; this.gradePoint = 8; }
    else if (pct >= 60) { this.grade = 'B+'; this.gradePoint = 7; }
    else if (pct >= 55) { this.grade = 'B'; this.gradePoint = 6; }
    else if (pct >= 50) { this.grade = 'C'; this.gradePoint = 5; }
    else if (pct >= 40) { this.grade = 'P'; this.gradePoint = 4; }
    else { this.grade = 'F'; this.gradePoint = 0; }

    next();
});

module.exports = mongoose.model('Marks', MarksSchema);
