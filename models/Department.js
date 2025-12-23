const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a department name'],
            unique: true,
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Please provide a department code'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        hod: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
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

// Virtual for getting sections in this department
departmentSchema.virtual('sections', {
    ref: 'Section',
    localField: '_id',
    foreignField: 'department',
});

// Virtual for getting students count
departmentSchema.virtual('studentsCount', {
    ref: 'User',
    localField: '_id',
    foreignField: 'department',
    count: true,
});

module.exports = mongoose.model('Department', departmentSchema);
