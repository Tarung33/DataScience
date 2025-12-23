const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Course = require('../models/Course');

// @desc    Mark attendance
// @route   POST /api/attendance
// @access  Private (Faculty)
const markAttendance = async (req, res) => {
    try {
        const { student, course, date, status, remarks, section, semester } = req.body;

        // Verify student exists
        const studentUser = await User.findById(student);
        if (!studentUser || studentUser.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        const attendance = await Attendance.create({
            student,
            faculty: req.user._id,
            course,
            date: date || new Date(),
            status,
            remarks,
            section,
            semester,
            isBackdated: false,
        });

        await attendance.populate('student', 'name enrollmentNumber');

        res.status(201).json({
            success: true,
            attendance,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Attendance already marked for this student on this date'
            });
        }
        console.error('Mark attendance error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Mark attendance for multiple students (bulk)
// @route   POST /api/attendance/bulk
// @access  Private (Faculty)
const markBulkAttendance = async (req, res) => {
    try {
        const { students, course, date, section, semester } = req.body;

        if (!students || students.length === 0) {
            return res.status(400).json({ message: 'No students provided' });
        }

        const attendanceRecords = [];
        const errors = [];

        for (const studentData of students) {
            try {
                const attendance = await Attendance.create({
                    student: studentData.studentId,
                    faculty: req.user._id,
                    course,
                    date: date || new Date(),
                    status: studentData.status,
                    remarks: studentData.remarks,
                    section,
                    semester,
                    isBackdated: false,
                });

                await attendance.populate('student', 'name enrollmentNumber');
                attendanceRecords.push(attendance);
            } catch (error) {
                if (error.code === 11000) {
                    errors.push({
                        studentId: studentData.studentId,
                        error: 'Already marked',
                    });
                } else {
                    errors.push({
                        studentId: studentData.studentId,
                        error: error.message,
                    });
                }
            }
        }

        res.status(201).json({
            success: true,
            count: attendanceRecords.length,
            attendance: attendanceRecords,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error('Bulk attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Add backdated attendance
// @route   POST /api/attendance/backdate
// @access  Private (Faculty)
const addBackdatedAttendance = async (req, res) => {
    try {
        const { student, course, date, status, backdateReason, remarks, section, semester } = req.body;

        if (!backdateReason) {
            return res.status(400).json({ message: 'Backdate reason is required' });
        }

        // Verify date is in the past
        const attendanceDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (attendanceDate >= today) {
            return res.status(400).json({ message: 'Backdated attendance must be for a past date' });
        }

        const attendance = await Attendance.create({
            student,
            faculty: req.user._id,
            course,
            date: attendanceDate,
            status,
            isBackdated: true,
            backdateReason,
            remarks,
            section,
            semester,
        });

        await attendance.populate('student', 'name enrollmentNumber');

        res.status(201).json({
            success: true,
            attendance,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Attendance already exists for this student on this date'
            });
        }
        console.error('Backdate attendance error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get student attendance
// @route   GET /api/attendance/student/:studentId
// @access  Private (Faculty, Admin, Student - own records)
const getStudentAttendance = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { course, startDate, endDate } = req.query;

        // Check authorization
        if (
            req.user.role === 'student' &&
            req.user._id.toString() !== studentId
        ) {
            return res.status(403).json({ message: 'Not authorized to view these records' });
        }

        const query = { student: studentId };
        if (course) query.course = course;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const attendance = await Attendance.find(query)
            .populate('faculty', 'name')
            .sort('-date');

        // Get summary
        const summary = await Attendance.getStudentSummary(studentId);

        res.json({
            success: true,
            count: attendance.length,
            summary,
            attendance,
        });
    } catch (error) {
        console.error('Get student attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get attendance summary
// @route   GET /api/attendance/summary
// @access  Private (Faculty, Admin, HOD)
const getAttendanceSummary = async (req, res) => {
    try {
        const { section, semester, course, date } = req.query;

        const query = {};
        if (section) query.section = section;
        if (semester) query.semester = semester;
        if (course) query.course = course;
        if (date) {
            const queryDate = new Date(date);
            query.date = {
                $gte: new Date(queryDate.setHours(0, 0, 0, 0)),
                $lt: new Date(queryDate.setHours(23, 59, 59, 999)),
            };
        }

        const attendance = await Attendance.find(query)
            .populate('student', 'name enrollmentNumber')
            .sort('-date');

        // Calculate statistics
        const stats = {
            total: attendance.length,
            present: attendance.filter(a => a.status === 'present').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            late: attendance.filter(a => a.status === 'late').length,
            excused: attendance.filter(a => a.status === 'excused').length,
        };

        stats.presentPercentage = stats.total > 0
            ? Math.round(((stats.present + stats.late) / stats.total) * 100)
            : 0;

        res.json({
            success: true,
            count: attendance.length,
            stats,
            attendance,
        });
    } catch (error) {
        console.error('Get attendance summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private (Faculty - own records, Admin)
const updateAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);

        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        // Check if user is the faculty who marked it or admin
        if (
            req.user.role !== 'admin' &&
            attendance.faculty.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                message: 'Not authorized to update this record'
            });
        }

        const { status, remarks } = req.body;

        if (status) attendance.status = status;
        if (remarks !== undefined) attendance.remarks = remarks;

        await attendance.save();
        await attendance.populate('student', 'name enrollmentNumber');

        res.json({
            success: true,
            attendance,
        });
    } catch (error) {
        console.error('Update attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private (Admin)
const deleteAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);

        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        await attendance.deleteOne();

        res.json({
            success: true,
            message: 'Attendance record deleted successfully',
        });
    } catch (error) {
        console.error('Delete attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get student's subject-wise attendance summary
// @route   GET /api/attendance/my-summary
// @access  Private (Student)
const getStudentSubjectSummary = async (req, res) => {
    try {
        const studentId = req.user._id;
        const { semester, department } = req.user;

        if (!semester || !department) {
            return res.status(400).json({ message: 'Student profile incomplete (semester/department missing)' });
        }

        // Fetch all courses for the student's department and semester
        const courses = await Course.find({ department, semester, isActive: true });

        const subjectSummaries = [];

        for (const course of courses) {
            const records = await Attendance.find({ student: studentId, course: course.name });

            const summary = {
                courseName: course.name,
                courseCode: course.code,
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

            subjectSummaries.push(summary);
        }

        res.json({
            success: true,
            summaries: subjectSummaries,
        });
    } catch (error) {
        console.error('Get subject summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    markAttendance,
    markBulkAttendance,
    addBackdatedAttendance,
    getStudentAttendance,
    getAttendanceSummary,
    updateAttendance,
    deleteAttendance,
    getStudentSubjectSummary,
};
