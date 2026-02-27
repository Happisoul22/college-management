const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log to console for dev
    console.log(err);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found`;
        error = new ErrorResponse(message, 404);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        // Extract the duplicated field key from MongoDB error
        const field = err.keyValue ? Object.keys(err.keyValue)[0] : null;

        let message = 'Duplicate field value entered';
        if (field === 'email') {
            message = 'An account with this email already exists. Please use a different email or sign in.';
        } else if (field && (field === 'rollNumber' || field.includes('rollNumber'))) {
            message = 'This roll number is already registered. Please check your roll number or contact admin.';
        } else if (field && (field === 'facultyId' || field.includes('facultyId'))) {
            message = 'This Faculty ID is already registered. Please check your ID or contact admin.';
        } else if (field) {
            // Simplify nested path like "studentProfile.rollNumber" → "roll number"
            const readable = field.split('.').pop().replace(/([A-Z])/g, ' $1').toLowerCase();
            message = `The value for "${readable}" is already taken. Please use a different value.`;
        }

        error = new ErrorResponse(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = new ErrorResponse(message, 400);
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};

class ErrorResponse extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

module.exports = errorHandler;
module.exports.ErrorResponse = ErrorResponse;
