const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        required: [true, 'Please add a reason']
    },
    leaveType: {
        type: String,
        enum: ['Casual Leave', 'Medical Leave', 'Emergency Leave', 'Personal Leave', 'On-Duty Leave', 'Other'],
        default: 'Casual Leave'
    },
    applicantRole: {
        type: String,
        enum: ['Student', 'Faculty', 'ClassTeacher', 'HOD'],
        default: 'Student'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approvedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Leave', LeaveSchema);
