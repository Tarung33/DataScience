const Seating = require('../models/Seating');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Generate Seating Arrangement (Semi-Auto)
// @route   POST /api/seating/generate
// @access  Private (Special Faculty)
const generateSeating = async (req, res) => {
    try {
        const { sectionId, examName, rooms, date, time } = req.body;

        // 1. Get all students in the section
        const students = await User.find({ section: sectionId, role: 'student', isActive: true }).sort('name');

        if (students.length === 0) {
            return res.status(400).json({ message: 'No active students found in this section' });
        }

        // Shuffle students for random seating
        for (let i = students.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [students[i], students[j]] = [students[j], students[i]];
        }

        let studentPool = [...students];
        let roomAssignments = [];

        // 2. Algorithm to assign students to rooms/benches
        for (const room of rooms) {
            const { name, rows, cols, benchCapacity } = room;
            let currentRoomAssignment = {
                roomName: name,
                rows,
                cols,
                benchCapacity,
                studentAssignments: []
            };

            // Fill row by row, column by column
            for (let r = 1; r <= rows; r++) {
                for (let c = 1; c <= cols; c++) {
                    for (let b = 1; b <= benchCapacity; b++) {
                        if (studentPool.length === 0) break;

                        const student = studentPool.shift();
                        currentRoomAssignment.studentAssignments.push({
                            student: student._id,
                            name: student.name,
                            usn: student.enrollmentNumber || 'N/A',
                            row: r,
                            col: c,
                            bench: c, // Usually bench corresponds to column in this simple model
                            seatPosition: b
                        });
                    }
                    if (studentPool.length === 0) break;
                }
                if (studentPool.length === 0) break;
            }
            roomAssignments.push(currentRoomAssignment);
            if (studentPool.length === 0) break;
        }

        if (studentPool.length > 0) {
            return res.status(400).json({
                message: `Capacity exceeded. ${studentPool.length} students could not be seated. Add more rooms or increase bench capacity.`,
                unseatedCount: studentPool.length
            });
        }

        // 3. Save as pending (or just return preview)
        // For now, we save it immediately so faculty can preview the PREVIEW object, 
        // but we'll add a 'draft' state or just return the object for frontend to display.
        // Let's return the generated object without saving yet (Frontend will submit).

        res.json({
            success: true,
            preview: {
                faculty: req.user._id,
                section: sectionId,
                examName,
                roomAssignments,
                date,
                time
            }
        });

    } catch (error) {
        console.error('Generate seating error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Submit Seating Arrangement for Approval
// @route   POST /api/seating
// @access  Private (Special Faculty)
const submitSeating = async (req, res) => {
    try {
        const seatingData = { ...req.body, faculty: req.user._id, status: 'pending' };
        const seating = await Seating.create(seatingData);

        res.status(201).json({
            success: true,
            seating
        });
    } catch (error) {
        console.error('Submit seating error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get Seating Plans for HOD Approval
// @route   GET /api/seating/pending
// @access  Private (HOD)
const getPendingPlans = async (req, res) => {
    try {
        // Find plans for sections in HOD's department
        const plans = await Seating.find({ status: 'pending' })
            .populate('faculty', 'name')
            .populate({
                path: 'section',
                populate: { path: 'department' }
            })
            .populate({
                path: 'roomAssignments.studentAssignments.student',
                select: 'name enrollmentNumber'
            })
            .sort('-createdAt');

        // Filter by HOD's department
        const filteredPlans = plans.filter(p =>
            p.section.department._id.toString() === req.user.department.toString()
        );

        res.json({
            success: true,
            plans: filteredPlans
        });
    } catch (error) {
        console.error('Get pending plans error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Approve/Reject Seating Plan
// @route   PATCH /api/seating/:id/status
// @access  Private (HOD)
const updateSeatingStatus = async (req, res) => {
    try {
        const { status, hodRemarks } = req.body;
        const seating = await Seating.findById(req.params.id).populate('section');

        if (!seating) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        seating.status = status;
        seating.hodRemarks = hodRemarks;
        await seating.save();

        // If approved, notify students
        if (status === 'approved') {
            const students = await User.find({ section: seating.section._id, role: 'student' });

            const notifications = students.map(student => ({
                recipient: student._id,
                title: 'Seating Arrangement Released',
                message: `Seating plan for ${seating.examName} is now available.`,
                type: 'seating',
                link: '/my-seating'
            }));

            await Notification.insertMany(notifications);
        }

        res.json({
            success: true,
            seating
        });
    } catch (error) {
        console.error('Update seating status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get Seating for Student
// @route   GET /api/seating/my-plan
// @access  Private (Student)
const getStudentSeating = async (req, res) => {
    try {
        // Find latest approved seating for student's section
        const plans = await Seating.find({
            section: req.user.section,
            status: 'approved'
        }).sort('-date');

        const studentSeatingDetails = [];

        plans.forEach(p => {
            let foundInPlan = false;
            for (const room of p.roomAssignments) {
                const found = room.studentAssignments.find(a =>
                    a.student && a.student.toString() === req.user._id.toString()
                );

                if (found) {
                    const myAssignment = found;
                    const myRoom = room.roomName;
                    // Calculate Seat Number
                    const r = found.row;
                    const c = found.col;
                    const rows = room.rows;
                    const capacity = room.benchCapacity || 2;
                    const benchIdx = ((c - 1) * rows) + (r - 1);
                    const seatNumber = (benchIdx * capacity) + found.seatPosition;

                    studentSeatingDetails.push({
                        examName: p.examName,
                        date: p.date,
                        time: p.time,
                        room: room.roomName,
                        row: found.row,
                        col: found.col,
                        seatNumber: seatNumber
                    });
                    foundInPlan = true;
                    break;
                }
            }
        });

        res.json({
            success: true,
            seating: studentSeatingDetails
        });
    } catch (error) {
        console.error('Get student seating error:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};

// @desc    Get Notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    try {
        // console.log('Fetching notifications for user:', req.user._id);
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort('-createdAt')
            .limit(10);

        // console.log(`Found ${notifications.length} notifications`);

        res.json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error('SERVER ERROR [getNotifications]:', error);
        res.status(500).json({
            message: 'Server error',
            details: error.message
        });
    }
};

const markAsRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get All Plans created by Faculty
// @route   GET /api/seating/history
// @access  Private (Special Faculty)
const getFacultyPlans = async (req, res) => {
    try {
        const plans = await Seating.find({ faculty: req.user._id })
            .populate('section', 'name')
            .populate({
                path: 'roomAssignments.studentAssignments.student',
                select: 'name enrollmentNumber'
            })
            .sort('-createdAt');

        res.json({
            success: true,
            plans
        });
    } catch (error) {
        console.error('Get faculty plans error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Notify Students about Seating
// @route   POST /api/seating/:id/notify
// @access  Private (Faculty/HOD)
const notifyStudents = async (req, res) => {
    try {
        const seating = await Seating.findById(req.params.id).populate('section');
        if (!seating) {
            return res.status(404).json({ message: 'Seating plan not found' });
        }

        const students = await User.find({ section: seating.section._id, role: 'student' });

        if (students.length === 0) {
            return res.json({ success: true, message: 'No students found in this section to notify', count: 0 });
        }

        const notifications = students.map(student => ({
            recipient: student._id,
            title: 'Seating Arrangement Released',
            message: `Seating plan for ${seating.examName} (${seating.time}) is now available.`,
            type: 'seating',
            link: '/my-seating'
        }));

        await Notification.insertMany(notifications);

        res.json({
            success: true,
            message: `Notifications sent to ${students.length} students`,
            count: students.length
        });
    } catch (error) {
        console.error('Notify students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete Seating Plan
// @route   DELETE /api/seating/:id
// @access  Private (Faculty/HOD)
const deleteSeating = async (req, res) => {
    try {
        const seating = await Seating.findById(req.params.id);

        if (!seating) {
            return res.status(404).json({ message: 'Seating plan not found' });
        }

        // Verify ownership (Faculty can only delete their own, HOD ? maybe all in dept?)
        // Assuming Faculty only for now as per req
        if (req.user.role === 'faculty' && seating.faculty.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this plan' });
        }

        await seating.deleteOne();

        res.json({ success: true, message: 'Seating plan deleted' });
    } catch (error) {
        console.error('Delete seating error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    generateSeating,
    submitSeating,
    getPendingPlans,
    updateSeatingStatus,
    getStudentSeating,
    getNotifications,
    markAsRead,
    getFacultyPlans,
    notifyStudents,
    deleteSeating
};
