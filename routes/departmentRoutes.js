const express = require('express');
const {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
    assignHOD,
} = require('../controllers/departmentController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// Create department - Admin only
router.post('/', protect, checkRole('admin'), createDepartment);

// Get all departments - All authenticated users
router.get('/', protect, getAllDepartments);

// Get, update, delete specific department
router.get('/:id', protect, getDepartmentById);
router.put('/:id', protect, checkRole('admin', 'hod'), updateDepartment);
router.delete('/:id', protect, checkRole('admin'), deleteDepartment);

// Assign HOD - Admin only
router.put('/:id/assign-hod', protect, checkRole('admin'), assignHOD);

module.exports = router;
