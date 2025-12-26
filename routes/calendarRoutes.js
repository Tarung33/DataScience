const express = require('express');
const router = express.Router();
const {
    getEvents,
    addEvent,
    deleteEvent,
    getPersonalNotes,
    addPersonalNote,
    deletePersonalNote
} = require('../controllers/calendarController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

router.route('/')
    .get(protect, getEvents)
    .post(protect, checkRole('admin', 'hod'), addEvent);

router.route('/:id')
    .delete(protect, checkRole('admin', 'hod'), deleteEvent);

// Personal Notes routes
router.route('/notes')
    .get(protect, getPersonalNotes)
    .post(protect, addPersonalNote);

router.route('/notes/:id')
    .delete(protect, deletePersonalNote);

module.exports = router;
