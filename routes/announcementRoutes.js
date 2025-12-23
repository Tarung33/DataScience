const express = require('express');
const {
    createAnnouncement,
    getAnnouncements,
    updateAnnouncement,
    deleteAnnouncement,
} = require('../controllers/announcementController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// Create announcement - Admin, HOD, Faculty
router.post('/', protect, checkRole('admin', 'hod', 'faculty'), createAnnouncement);

// Get announcements - All authenticated users
router.get('/', protect, getAnnouncements);

// Update and delete - Admin, HOD, Faculty (creator)
router.put('/:id', protect, checkRole('admin', 'hod', 'faculty'), updateAnnouncement);
router.delete('/:id', protect, checkRole('admin', 'hod', 'faculty'), deleteAnnouncement);

module.exports = router;
