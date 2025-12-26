const mongoose = require('mongoose');

const calendarNoteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 30
    },
    content: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

// Ensure a user can have multiple notes on the same date if needed, 
// or one note per date? Let's allow multiple for flexibility.

module.exports = mongoose.model('CalendarNote', calendarNoteSchema);
