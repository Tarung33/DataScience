const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        content: {
            type: String,
            required: [true, 'Content is required'],
        },
        targetAudience: {
            type: String,
            enum: ['all', 'faculty', 'student'],
            default: 'all',
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            // Optional: if null, it's for all departments
        },
        semester: {
            type: Number,
            // Optional: if null, it's for all semesters
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator is required'],
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        expiresAt: {
            type: Date,
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

module.exports = mongoose.model('Announcement', announcementSchema);
