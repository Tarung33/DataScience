const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Group name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: ['department', 'section', 'course', 'general'],
            required: true,
        },
        // Academic Context
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        },
        section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section',
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
        },
        semester: {
            type: Number,
        },
        // Participants
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast lookup based on context
groupSchema.index({ type: 1, department: 1, section: 1, semester: 1 });
groupSchema.index({ type: 1, course: 1 });

module.exports = mongoose.model('Group', groupSchema);
