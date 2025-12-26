const mongoose = require('mongoose');

// Configurable time slots
const TIME_SLOTS = [
    '9:00-10:00',
    '10:00-11:00',
    '11:15-12:15',
    '12:15-1:15',
    '2:30-3:20',
    '3:20-4:10',
    '4:10-5:00'
];

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const timetableSchema = new mongoose.Schema({
    semester: {
        type: Number,
        required: [true, 'Semester is required'],
        min: 1,
        max: 8
    },
    section: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: [true, 'Section is required']
    },
    day: {
        type: String,
        required: [true, 'Day is required'],
        enum: DAYS
    },
    timeSlot: {
        type: String,
        required: [true, 'Time slot is required'],
        enum: TIME_SLOTS
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Subject is required']
    },
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Faculty is required']
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: [true, 'Department is required']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
timetableSchema.index({ semester: 1, section: 1, day: 1, timeSlot: 1, isActive: 1 });
timetableSchema.index({ faculty: 1, day: 1, timeSlot: 1, isActive: 1 });
timetableSchema.index({ department: 1 });

// Static method to check for faculty clash
timetableSchema.statics.checkFacultyClash = async function (facultyId, day, timeSlot, excludeId = null) {
    const query = {
        faculty: facultyId,
        day: day,
        timeSlot: timeSlot,
        isActive: true
    };

    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    const existing = await this.findOne(query);
    return existing;
};

// Static method to check for class clash (same section, same time)
timetableSchema.statics.checkClassClash = async function (semester, sectionId, day, timeSlot, excludeId = null) {
    const query = {
        semester: semester,
        section: sectionId,
        day: day,
        timeSlot: timeSlot,
        isActive: true
    };

    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    const existing = await this.findOne(query);
    return existing;
};

// Export time slots and days for use in controllers
timetableSchema.statics.TIME_SLOTS = TIME_SLOTS;
timetableSchema.statics.DAYS = DAYS;

module.exports = mongoose.model('Timetable', timetableSchema);
