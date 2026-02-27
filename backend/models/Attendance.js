const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        required: [true, 'Please add a date']
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'OD', 'Late'],
        required: true
    },
    period: {
        type: Number,
        min: 1,
        max: 8
    },
    markedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent duplicate attendance for same student, subject, date, period
AttendanceSchema.index({ student: 1, subject: 1, date: 1, period: 1 }, { unique: true });
// Quick lookups
AttendanceSchema.index({ student: 1, date: 1 });
AttendanceSchema.index({ subject: 1, date: 1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);
