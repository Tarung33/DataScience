const express = require('express');
const {
    createSection,
    getAllSections,
    getSectionsByDepartment,
    updateSection,
    deleteSection,
} = require('../controllers/sectionController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// Create section - Admin and HOD
router.post('/', protect, checkRole('admin', 'hod'), createSection);

// Get all sections
router.get('/', protect, getAllSections);

// Get sections by department
router.get('/department/:departmentId', protect, getSectionsByDepartment);

// Update and delete section - Admin and HOD
router.put('/:id', protect, checkRole('admin', 'hod'), updateSection);
router.delete('/:id', protect, checkRole('admin', 'hod'), deleteSection);

module.exports = router;
