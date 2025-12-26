const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRole, checkSpecialFacultyOrRole } = require('../middleware/roleCheck');
const {
    getConfig,
    createSlot,
    getTimetableBySection,
    getTimetableByFaculty,
    getTimetableGrid,
    updateSlot,
    deleteSlot
} = require('../controllers/timetableController');

// Get config (available to all authenticated users)
router.get('/config', protect, getConfig);

// Get timetable by section (available to all authenticated users)
router.get('/section/:semester/:sectionId', protect, getTimetableBySection);

// Get timetable grid for management
router.get('/grid/:semester/:sectionId', protect, getTimetableGrid);

// Get faculty timetable
router.get('/faculty', protect, getTimetableByFaculty);

// Create slot (admin, hod, or special faculty only)
router.post('/slots', protect, checkSpecialFacultyOrRole('admin', 'hod'), createSlot);

// Update slot (admin, hod, or special faculty only)
router.put('/slots/:id', protect, checkSpecialFacultyOrRole('admin', 'hod'), updateSlot);

// Delete slot (admin, hod, or special faculty only)
router.delete('/slots/:id', protect, checkSpecialFacultyOrRole('admin', 'hod'), deleteSlot);

module.exports = router;
