const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        fileUrl: {
            type: String,
            required: [true, 'File URL is required'],
        },
        fileName: {
            type: String,
            required: [true, 'File name is required'],
        },
        fileType: {
            type: String,
        },
        fileSize: {
            type: Number,
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Course is required'],
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Faculty is required'],
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
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Material', materialSchema);
