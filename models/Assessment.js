const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please provide a title'],
            trim: true,
        },
        type: {
            type: String,
            enum: ['internal', 'assignment', 'quiz', 'seminar', 'other'],
            required: [true, 'Please provide an assessment type'],
        },
        otherTitle: {
            type: String,
            required: function () {
                return this.type === 'other';
            },
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Course is required'],
        },
        section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section',
            required: [true, 'Section is required'],
        },
        semester: {
            type: Number,
            required: [true, 'Semester is required'],
            min: 1,
            max: 8,
        },
        totalMarks: {
            type: Number,
            required: [true, 'Total marks are required'],
            min: 1,
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Assessment', assessmentSchema);
