const express = require('express');
const {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    assignDepartment,
    toggleSpecialFaculty,
    updateFcmToken,
    bulkPromote,
    bulkAssignCourses,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// Create user - Admin only
router.post('/', protect, checkRole('admin'), createUser);

// Get all users - Admin and HOD
router.get('/', protect, checkRole('admin', 'hod', 'faculty'), getAllUsers);

// Get, update, delete specific user
router.get('/:id', protect, getUserById);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, checkRole('admin'), deleteUser);

// Bulk operations
router.put('/bulk/promote', protect, checkRole('admin'), bulkPromote);
router.put('/bulk/assign-courses', protect, checkRole('admin'), bulkAssignCourses);

// Assign department/section/semester - Admin and HOD
router.put('/:id/assign-department', protect, checkRole('admin', 'hod'), assignDepartment);

// Toggle Special Faculty permission - HOD only
router.patch('/:id/toggle-special', protect, checkRole('hod'), toggleSpecialFaculty);

// Register FCM token for push notifications
router.post('/update-fcm-token', protect, updateFcmToken);

module.exports = router;
