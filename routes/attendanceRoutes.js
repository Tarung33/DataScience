const express = require('express');
const {
    markAttendance,
    markBulkAttendance,
    addBackdatedAttendance,
    getStudentAttendance,
    getAttendanceSummary,
    updateAttendance,
    deleteAttendance,
    getStudentSubjectSummary,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// Mark attendance - Faculty only
router.post('/', protect, checkRole('faculty', 'hod'), markAttendance);
router.post('/bulk', protect, checkRole('faculty', 'hod'), markBulkAttendance);
router.post('/backdate', protect, checkRole('faculty', 'hod'), addBackdatedAttendance);

// Get attendance
router.get('/student/:studentId', protect, getStudentAttendance);
router.get('/my-summary', protect, checkRole('student'), getStudentSubjectSummary);
router.get('/summary', protect, checkRole('faculty', 'hod', 'admin'), getAttendanceSummary);

// Update and delete - Faculty (own records) and Admin
router.put('/:id', protect, checkRole('faculty', 'hod', 'admin'), updateAttendance);
router.delete('/:id', protect, checkRole('admin'), deleteAttendance);

module.exports = router;
