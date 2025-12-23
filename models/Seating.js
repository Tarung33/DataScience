const mongoose = require('mongoose');

const seatingSchema = new mongoose.Schema(
    {
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section',
            required: true,
        },
        examName: {
            type: String,
            required: [true, 'Please provide an exam name or title'],
            trim: true,
        },
        roomAssignments: [
            {
                roomName: {
                    type: String,
                    required: true,
                },
                rows: {
                    type: Number,
                    required: true,
                },
                cols: {
                    type: Number,
                    required: true,
                },
                benchCapacity: {
                    type: Number,
                    default: 2,
                },
                studentAssignments: [
                    {
                        student: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: 'User',
                        },
                        name: String,
                        usn: String,
                        row: Number,
                        col: Number,
                        bench: Number,
                        seatPosition: Number, // 1 to benchCapacity
                    },
                ],
            },
        ],
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        hodRemarks: {
            type: String,
        },
        date: {
            type: Date,
            required: true,
        },
        time: {
            type: String, // e.g., "10:00 AM - 1:00 PM"
            required: true
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Seating', seatingSchema);
