const express = require('express');
const {
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
} = require('../controllers/seatingController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// Notification routes
router.get('/notifications', protect, getNotifications);
router.patch('/notifications/:id/read', protect, markAsRead);

// Seating routes
router.post('/generate', protect, checkRole('faculty', 'hod'), generateSeating);
router.post('/', protect, checkRole('faculty', 'hod'), submitSeating);
router.get('/pending', protect, checkRole('hod'), getPendingPlans);
router.get('/history', protect, checkRole('faculty', 'hod'), getFacultyPlans);
router.post('/:id/notify', protect, checkRole('faculty', 'hod'), notifyStudents);
router.delete('/:id', protect, checkRole('faculty', 'hod'), deleteSeating);
router.patch('/:id/status', protect, checkRole('hod'), updateSeatingStatus);
router.get('/my-plan', protect, checkRole('student'), getStudentSeating);

module.exports = router;
