const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Student is required'],
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Faculty is required'],
        },
        course: {
            type: String,
            required: [true, 'Course name is required'],
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'late', 'excused'],
            required: [true, 'Attendance status is required'],
        },
        isBackdated: {
            type: Boolean,
            default: false,
        },
        backdateReason: {
            type: String,
            required: function () {
                return this.isBackdated;
            },
        },
        remarks: {
            type: String,
        },
        section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section',
        },
        semester: {
            type: Number,
            min: 1,
            max: 8,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to prevent duplicate entries
attendanceSchema.index({ student: 1, course: 1, date: 1 }, { unique: true });

// Static method to calculate attendance percentage
attendanceSchema.statics.calculatePercentage = async function (studentId, course = null) {
    const query = { student: studentId };
    if (course) query.course = course;

    const total = await this.countDocuments(query);
    const present = await this.countDocuments({
        ...query,
        status: { $in: ['present', 'late'] }
    });

    return total > 0 ? Math.round((present / total) * 100) : 0;
};

// Static method to get attendance summary
attendanceSchema.statics.getStudentSummary = async function (studentId) {
    const records = await this.find({ student: studentId });

    const summary = {
        total: records.length,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
    };

    records.forEach(record => {
        summary[record.status]++;
    });

    summary.percentage = records.length > 0
        ? Math.round(((summary.present + summary.late) / records.length) * 100)
        : 0;

    return summary;
};

module.exports = mongoose.model('Attendance', attendanceSchema);
