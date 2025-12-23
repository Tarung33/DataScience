const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Course name is required'],
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Course code is required'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: [true, 'Department is required'],
        },
        semester: {
            type: Number,
            required: [true, 'Semester is required'],
            min: 1,
            max: 8,
        },
        credits: {
            type: Number,
            default: 3,
            min: 1,
            max: 6,
        },
        type: {
            type: String,
            enum: ['theory', 'practical', 'project'],
            default: 'theory',
        },
        description: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for uniqueness
courseSchema.index({ code: 1, department: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
