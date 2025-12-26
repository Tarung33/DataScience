const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        enum: ['exam', 'internal', 'academic', 'holiday'],
        default: 'academic'
    },
    semester: {
        type: Number,
        default: null // null means for all semesters
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        default: null // null means for all departments
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
