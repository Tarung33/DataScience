const Announcement = require('../models/Announcement');

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private (Admin, HOD, Faculty)
const createAnnouncement = async (req, res) => {
    try {
        const { title, content, targetAudience, department, semester, priority, expiresAt } = req.body;

        const announcement = await Announcement.create({
            title,
            content,
            targetAudience,
            department: department || undefined,
            semester: semester || undefined,
            priority,
            expiresAt: expiresAt || undefined,
            createdBy: req.user._id,
        });

        await announcement.populate('createdBy', 'name role');
        if (department) await announcement.populate('department', 'name');

        res.status(201).json({
            success: true,
            announcement,
        });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get announcements
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res) => {
    try {
        const { department, semester, targetAudience } = req.query;

        const query = { isActive: true };

        // Filtering logic for students/faculty
        if (req.user.role === 'student') {
            query.$or = [
                { targetAudience: 'all' },
                { targetAudience: 'student' }
            ];
            // Filter by department if announcement is department-specific
            query.$and = [
                { $or: [{ department: null }, { department: req.user.department }] },
                { $or: [{ semester: null }, { semester: req.user.semester }] }
            ];
        } else if (req.user.role === 'faculty') {
            query.$or = [
                { targetAudience: 'all' },
                { targetAudience: 'faculty' }
            ];
            query.$and = [
                { $or: [{ department: null }, { department: req.user.department }] }
            ];
        }

        // Manual filters from query
        if (department) query.department = department;
        if (semester) query.semester = semester;
        if (targetAudience) query.targetAudience = targetAudience;

        // Filter out expired announcements
        const expirationQuery = {
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        };

        if (query.$and) {
            query.$and.push(expirationQuery);
        } else {
            query.$and = [expirationQuery];
        }

        const announcements = await Announcement.find(query)
            .populate('createdBy', 'name role')
            .populate('department', 'name')
            .sort('-priority -createdAt');

        res.json({
            success: true,
            count: announcements.length,
            announcements,
        });
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private (Admin, HOD, Creator)
const updateAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        // Check authorization
        if (
            req.user.role !== 'admin' &&
            req.user.role !== 'hod' &&
            announcement.createdBy.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized to update this announcement' });
        }

        const updateData = { ...req.body };
        if (updateData.department === '') updateData.department = undefined;
        if (updateData.semester === '') updateData.semester = undefined;
        if (updateData.expiresAt === '') updateData.expiresAt = undefined;

        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy', 'name role').populate('department', 'name');

        res.json({
            success: true,
            announcement: updatedAnnouncement,
        });
    } catch (error) {
        console.error('Update announcement error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Admin, HOD, Creator)
const deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        // Check authorization
        if (
            req.user.role !== 'admin' &&
            req.user.role !== 'hod' &&
            announcement.createdBy.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized to delete this announcement' });
        }

        await announcement.deleteOne();

        res.json({
            success: true,
            message: 'Announcement deleted successfully',
        });
    } catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createAnnouncement,
    getAnnouncements,
    updateAnnouncement,
    deleteAnnouncement,
};
