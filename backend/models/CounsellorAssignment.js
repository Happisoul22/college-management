const mongoose = require('mongoose');

const CounsellorAssignmentSchema = new mongoose.Schema({
    faculty: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Please assign a faculty member']
    },
    students: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    department: {
        type: String,
        required: [true, 'Please add a department']
    },
    academicYear: {
        type: String,
        required: [true, 'Please add an academic year']
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

CounsellorAssignmentSchema.index({ faculty: 1, academicYear: 1 });

module.exports = mongoose.model('CounsellorAssignment', CounsellorAssignmentSchema);
