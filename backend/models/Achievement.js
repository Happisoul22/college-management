const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'Internship',
            'NPTEL',
            'Certification',
            'Mini Project',
            'Major Project',
            'Research Paper',
            'Publication',
            'Patent',
            'NCC/NSS',
            'Placement'
        ],
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please add a title']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    year: {
        type: Number,
        required: true
    },
    semester: {
        type: Number
    },
    // Internship-specific
    startDate: { type: Date },
    endDate: { type: Date },
    weeks: { type: Number },          // Number of weeks
    domain: { type: String },          // Area of domain
    organization: { type: String },
    // NPTEL-specific
    nptelCourseType: { type: String },         // Core / Elective / MOOC / Value Added / Honours
    nptelDuration: { type: String },         // "4 Weeks" / "8 Weeks" etc.
    score: { type: Number },         // Score / Percentage
    instructor: { type: String },         // Name of instructor / faculty coordinator
    // Project-specific (Mini Project / Major Project)
    workType: { type: String, enum: ['Individual', 'Team'] },
    projectRole: { type: String },   // e.g. Team Lead, Team Member, Developer, etc.
    contribution: { type: String },   // Student's own contribution description
    teamMembers: [
        {
            name: { type: String },
            rollNumber: { type: String },
            role: { type: String },
        }
    ],
    // Proof / certificate
    proofUrl: { type: String },        // Cloudinary / file URL
    proofPublicId: { type: String },        // Cloudinary ID
    proofFileName: { type: String },        // Original filename for display
    // Review
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    remarks: { type: String },
    reviewedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Achievement', AchievementSchema);
