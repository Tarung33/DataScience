const Timetable = require('../models/Timetable');
const Section = require('../models/Section');
const Course = require('../models/Course');
const User = require('../models/User');

// Get config (time slots and days)
exports.getConfig = async (req, res) => {
    try {
        res.json({
            timeSlots: Timetable.TIME_SLOTS,
            days: Timetable.DAYS
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Create a timetable slot
exports.createSlot = async (req, res) => {
    try {
        const { semester, section, day, timeSlot, subject, faculty, department } = req.body;

        // Check for faculty clash
        const facultyClash = await Timetable.checkFacultyClash(faculty, day, timeSlot);
        if (facultyClash) {
            const clashSection = await Section.findById(facultyClash.section);
            return res.status(400).json({
                message: `Faculty clash: This faculty is already assigned to Semester ${facultyClash.semester} - ${clashSection?.name || 'Unknown'} at this time`
            });
        }

        // Check for class clash
        const classClash = await Timetable.checkClassClash(semester, section, day, timeSlot);
        if (classClash) {
            return res.status(400).json({
                message: 'Class clash: This section already has a class scheduled at this time'
            });
        }

        const slot = await Timetable.create({
            semester,
            section,
            day,
            timeSlot,
            subject,
            faculty,
            department,
            createdBy: req.user._id
        });

        const populatedSlot = await Timetable.findById(slot._id)
            .populate('section', 'name')
            .populate('subject', 'name code')
            .populate('faculty', 'name')
            .populate('department', 'name');

        res.status(201).json({ slot: populatedSlot });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get timetable by section
exports.getTimetableBySection = async (req, res) => {
    try {
        const { semester, sectionId } = req.params;

        const slots = await Timetable.find({
            semester: parseInt(semester),
            section: sectionId,
            isActive: true
        })
            .populate('section', 'name semester')
            .populate('subject', 'name code')
            .populate('faculty', 'name')
            .populate('department', 'name')
            .sort({ day: 1, timeSlot: 1 });

        res.json({ slots });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get timetable by faculty
exports.getTimetableByFaculty = async (req, res) => {
    try {
        const facultyId = req.user._id;

        const slots = await Timetable.find({
            faculty: facultyId,
            isActive: true
        })
            .populate('section', 'name semester')
            .populate('subject', 'name code')
            .populate('department', 'name')
            .sort({ day: 1, timeSlot: 1 });

        res.json({ slots });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get timetable grid (for management view)
exports.getTimetableGrid = async (req, res) => {
    try {
        const { semester, sectionId } = req.params;

        const slots = await Timetable.find({
            semester: parseInt(semester),
            section: sectionId,
            isActive: true
        })
            .populate('section', 'name semester')
            .populate('subject', 'name code')
            .populate('faculty', 'name')
            .populate('department', 'name');

        // Build grid structure
        const grid = {};
        Timetable.DAYS.forEach(day => {
            grid[day] = {};
            Timetable.TIME_SLOTS.forEach(slot => {
                grid[day][slot] = null;
            });
        });

        slots.forEach(slot => {
            if (grid[slot.day]) {
                grid[slot.day][slot.timeSlot] = slot;
            }
        });

        res.json({
            grid,
            timeSlots: Timetable.TIME_SLOTS,
            days: Timetable.DAYS,
            slots
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update a slot
exports.updateSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, faculty } = req.body;

        const existingSlot = await Timetable.findById(id);
        if (!existingSlot || !existingSlot.isActive) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        // Check for faculty clash if faculty is changing
        if (faculty && faculty !== existingSlot.faculty.toString()) {
            const facultyClash = await Timetable.checkFacultyClash(
                faculty,
                existingSlot.day,
                existingSlot.timeSlot,
                id
            );
            if (facultyClash) {
                const clashSection = await Section.findById(facultyClash.section);
                return res.status(400).json({
                    message: `Faculty clash: This faculty is already assigned to Semester ${facultyClash.semester} - ${clashSection?.name || 'Unknown'} at this time`
                });
            }
        }

        // Soft delete old slot and create new one (for audit trail)
        existingSlot.isActive = false;
        existingSlot.updatedBy = req.user._id;
        await existingSlot.save();

        const newSlot = await Timetable.create({
            semester: existingSlot.semester,
            section: existingSlot.section,
            day: existingSlot.day,
            timeSlot: existingSlot.timeSlot,
            subject: subject || existingSlot.subject,
            faculty: faculty || existingSlot.faculty,
            department: existingSlot.department,
            createdBy: req.user._id
        });

        const populatedSlot = await Timetable.findById(newSlot._id)
            .populate('section', 'name')
            .populate('subject', 'name code')
            .populate('faculty', 'name')
            .populate('department', 'name');

        res.json({ slot: populatedSlot });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete a slot (soft delete)
exports.deleteSlot = async (req, res) => {
    try {
        const { id } = req.params;

        const slot = await Timetable.findById(id);
        if (!slot || !slot.isActive) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        slot.isActive = false;
        slot.updatedBy = req.user._id;
        await slot.save();

        res.json({ message: 'Slot deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
