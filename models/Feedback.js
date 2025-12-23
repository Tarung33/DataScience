const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: true,
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        semester: {
            type: Number,
            required: true,
        },
        // Ratings (1-5)
        courseContent: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        teachingQuality: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        supportMaterial: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        overallRating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comments: {
            type: String,
            trim: true,
        },
        isAnonymous: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate feedback from the same student for the same course in the same semester
feedbackSchema.index({ student: 1, course: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
