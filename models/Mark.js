const mongoose = require('mongoose');

const markSchema = new mongoose.Schema(
    {
        assessment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Assessment',
            required: [true, 'Assessment is required'],
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Student is required'],
        },
        obtainedMarks: {
            type: Number,
            required: [true, 'Obtained marks are required'],
            min: 0,
            validate: {
                validator: async function (value) {
                    const assessment = await mongoose.model('Assessment').findById(this.assessment);
                    return value <= assessment.totalMarks;
                },
                message: 'Obtained marks cannot exceed total marks',
            },
        },
        remarks: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure one mark per student per assessment
markSchema.index({ assessment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);
