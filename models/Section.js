const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a section name'],
            trim: true,
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: [true, 'Please specify a department'],
        },
        semester: {
            type: Number,
            required: [true, 'Please specify a semester'],
            min: 1,
            max: 8,
        },
        maxStudents: {
            type: Number,
            default: 60,
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

// Compound index to ensure unique section per department per semester
sectionSchema.index({ name: 1, department: 1, semester: 1 }, { unique: true });

// Virtual for current students count
sectionSchema.virtual('currentStudents', {
    ref: 'User',
    localField: '_id',
    foreignField: 'section',
    count: true,
});

module.exports = mongoose.model('Section', sectionSchema);
