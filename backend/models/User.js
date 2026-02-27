const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ClassAssignment = require('./ClassAssignment');
const CounsellorAssignment = require('./CounsellorAssignment');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    role: {
        type: String,
        enum: ['Student', 'Faculty', 'ClassTeacher', 'HOD', 'Principal', 'Admin'],
        default: 'Student'
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Student Specific Fields
    studentProfile: {
        rollNumber: { type: String, unique: true, sparse: true },
        phone: String,
        whatsapp: String,
        branch: String,
        admissionYear: Number,
        section: String,
        gender: { type: String, enum: ['Male', 'Female', 'Other'] },
        dob: Date,
        fatherName: String,
        fatherPhone: String,
        motherName: String,
        motherPhone: String,
        areaOfInterest: String,
        cgpa: Number,
        attendance: Number
    },
    // Faculty Specific Fields
    facultyProfile: {
        facultyId: { type: String, unique: true, sparse: true },
        phone: String,
        qualification: String,
        experience: Number, // In years
        pan: String,
        aadhaar: String,
        dateOfJoining: Date,
        department: String,
        photo: String
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Calculate Semester for Students
UserSchema.virtual('semester').get(function () {
    if (this.role !== 'Student' || !this.studentProfile || !this.studentProfile.admissionYear) {
        return undefined;
    }
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const admissionYear = this.studentProfile.admissionYear;

    let yearDiff = currentYear - admissionYear;

    // Academic year usually starts in July/August (Month 7/8)
    // If current month is before July, we are in the even semester of the academic year
    // If current month is July or later, we are in the odd semester of the next academic year

    let semester;
    if (currentMonth >= 7) {
        semester = (yearDiff * 2) + 1;
    } else {
        semester = (yearDiff * 2);
    }

    // Cap semester ideally at 8 (4 years)
    return semester > 0 ? semester : 1;
});

// Calculate Academic Year (1st/2nd/3rd/4th) for Students
UserSchema.virtual('currentYear').get(function () {
    if (this.role !== 'Student' || !this.studentProfile || !this.studentProfile.admissionYear) {
        return undefined;
    }
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    const admissionYear = this.studentProfile.admissionYear;

    // Year of study: if before July it's the same academic year, if July+ it's next
    let yearOfStudy = currentYear - admissionYear;
    if (currentMonth >= 7) {
        yearOfStudy += 1;
    }

    // Clamp between 1 and 4
    if (yearOfStudy < 1) return 1;
    if (yearOfStudy > 4) return 4;
    return yearOfStudy;
});

// Cascade delete: remove class & counsellor assignments when a faculty/HOD is deleted
UserSchema.pre('findOneAndDelete', async function (next) {
    const user = await this.model.findOne(this.getFilter());
    if (user && ['Faculty', 'ClassTeacher', 'HOD', 'Counsellor'].includes(user.role)) {
        await ClassAssignment.deleteMany({ faculty: user._id });
        await CounsellorAssignment.deleteMany({ counsellor: user._id });
    }
    next();
});

UserSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    if (['Faculty', 'ClassTeacher', 'HOD', 'Counsellor'].includes(this.role)) {
        await ClassAssignment.deleteMany({ faculty: this._id });
        await CounsellorAssignment.deleteMany({ counsellor: this._id });
    }
    next();
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes

    return resetToken;
};

module.exports = mongoose.model('User', UserSchema);
