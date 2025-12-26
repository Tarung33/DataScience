const CalendarEvent = require('../models/CalendarEvent');
const CalendarNote = require('../models/CalendarNote');

// @desc    Get all calendar events
// @route   GET /api/calendar
// @access  Private
exports.getEvents = async (req, res) => {
    try {
        const events = await CalendarEvent.find();
        res.json({
            success: true,
            events
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching calendar events',
            error: error.message
        });
    }
};

// @desc    Add new calendar event
// @route   POST /api/calendar
// @access  Private/Admin/HOD
exports.addEvent = async (req, res) => {
    try {
        const { title, date, type, semester, department } = req.body;

        const event = await CalendarEvent.create({
            title,
            date,
            type,
            semester,
            department: department || null,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            event
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating calendar event',
            error: error.message
        });
    }
};

// @desc    Delete calendar event
// @route   DELETE /api/calendar/:id
// @access  Private/Admin/HOD
exports.deleteEvent = async (req, res) => {
    try {
        const event = await CalendarEvent.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        await event.deleteOne();

        res.json({
            success: true,
            message: 'Event removed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting calendar event',
            error: error.message
        });
    }
};

// @desc    Get personal notes for logged in user
// @route   GET /api/calendar/notes
// @access  Private
exports.getPersonalNotes = async (req, res) => {
    try {
        const notes = await CalendarNote.find({ user: req.user._id });
        res.json({
            success: true,
            notes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching personal notes',
            error: error.message
        });
    }
};

// @desc    Add personal note
// @route   POST /api/calendar/notes
// @access  Private
exports.addPersonalNote = async (req, res) => {
    try {
        const { date, title, content } = req.body;

        const note = await CalendarNote.create({
            user: req.user._id,
            date,
            title,
            content
        });

        res.status(201).json({
            success: true,
            note
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding personal note',
            error: error.message
        });
    }
};

// @desc    Delete personal note
// @route   DELETE /api/calendar/notes/:id
// @access  Private
exports.deletePersonalNote = async (req, res) => {
    try {
        const note = await CalendarNote.findById(req.params.id);

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Check ownership
        if (note.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to delete this note'
            });
        }

        await note.deleteOne();

        res.json({
            success: true,
            message: 'Note removed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting personal note',
            error: error.message
        });
    }
};
