const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// @desc    Get user's groups
// @route   GET /api/groups
// @access  Private
const getMyGroups = async (req, res) => {
    try {
        const user = req.user;
        let query = { isActive: true };

        if (user.role === 'admin') {
            // Admins can see all groups or we can filter
            // For now, let's say they see everything
        } else if (user.role === 'student') {
            query.$or = [
                { type: 'department', department: user.department },
                { type: 'section', section: user.section, semester: user.semester },
                { type: 'course', department: user.department, semester: user.semester },
                { members: user._id }
            ];
        } else if (user.role === 'faculty' || user.role === 'hod') {
            query.$or = [
                { type: 'department', department: user.department },
                { type: 'course', course: { $in: user.courses || [] } },
                { members: user._id }
            ];
        }

        const groups = await Group.find(query)
            .populate('department', 'name code')
            .populate('section', 'name')
            .populate('course', 'name code')
            .sort('-updatedAt');

        res.json({
            success: true,
            groups,
        });
    } catch (error) {
        console.error('Get my groups error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get group messages
// @route   GET /api/groups/:id/messages
// @access  Private
const getGroupMessages = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // TODO: Check if user is member of this group contextually

        const messages = await Message.find({ group: req.params.id })
            .populate('sender', 'name role')
            .sort('createdAt')
            .limit(100); // Pagination could be added later

        res.json({
            success: true,
            messages,
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};



// ...

// @desc    Send message to group
// @route   POST /api/groups/:id/messages
// @access  Private
const sendMessage = async (req, res) => {
    try {
        const { content, attachment } = req.body;
        const groupId = req.params.id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Classroom Mode: Students cannot send messages in Course/Section/Dept groups, only in General or project groups if allowed
        // Exception: If the user is the creator of the group (unlikely for student but good safety)
        if (req.user.role === 'student' && group.type !== 'general' && group.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Students can only react to messages in this channel.' });
        }

        const message = await Message.create({
            group: groupId,
            sender: req.user._id,
            content,
            attachment,
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name role');

        // Update group's updatedAt for sorting
        await Group.findByIdAndUpdate(groupId, { updatedAt: Date.now() });

        // NOTIFICATION LOGIC
        // Notify all members except sender
        const recipients = group.members.filter(memberId => memberId.toString() !== req.user._id.toString());

        if (recipients.length > 0) {
            const notifications = recipients.map(recipient => ({
                recipient,
                title: `New Message in ${group.name}`,
                message: `${req.user.name}: ${content.substring(0, 40)}${content.length > 40 ? '...' : ''}`,
                type: 'general',
                link: `/groups?id=${groupId}`,
                isRead: false
            }));
            await Notification.insertMany(notifications);
        }

        res.status(201).json({
            success: true,
            message: populatedMessage,
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a new group (Admin, HOD, Faculty)
// @route   POST /api/groups
// @access  Private (Admin, HOD, Faculty)
const createGroup = async (req, res) => {
    try {
        const { name, description, type, department, section, course, semester, members } = req.body;
        let finalMembers = members || [];

        // If faculty creates a section/course group, allow auto-populating students
        if (req.user.role === 'faculty' || req.user.role === 'hod') {
            // 1. By Semester & Department (e.g., All 5th Sem CS students)
            if (semester && req.user.department) {
                const query = {
                    semester,
                    department: req.user.department,
                    role: 'student',
                    isActive: true
                };
                // If valid section ID is provided, filter by it too
                if (section && mongoose.Types.ObjectId.isValid(section)) {
                    query.section = section;
                }
                const students = await User.find(query);
                finalMembers = [...finalMembers, ...students.map(s => s._id)];
            }
            // 2. By Section specifically (if provided as valid ID)
            else if (type === 'section' && section && mongoose.Types.ObjectId.isValid(section)) {
                const students = await User.find({ section, role: 'student', isActive: true });
                finalMembers = [...finalMembers, ...students.map(s => s._id)];
            }
        }

        // Ensure creator is a member
        if (!finalMembers.includes(req.user._id)) {
            finalMembers.push(req.user._id);
        }

        const group = await Group.create({
            name,
            description,
            type,
            department: department || undefined,
            section: section || undefined,
            course: course || undefined,
            semester,
            members: finalMembers,
            createdBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            group,
        });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    React to a message
// @route   POST /api/groups/messages/:id/react
// @access  Private
const reactToMessage = async (req, res) => {
    try {
        const { emoji, name } = req.body;
        const messageId = req.params.id;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Check if user already reacted with this emoji
        const existingReactionIndex = message.reactions.findIndex(
            r => r.user.toString() === userId.toString() && r.emoji === emoji
        );

        if (existingReactionIndex > -1) {
            // Remove reaction (toggle)
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            // Add reaction
            message.reactions.push({ user: userId, emoji, name });
        }

        await message.save();

        // Populate to return full message update if needed
        // For now just return success
        res.json({
            success: true,
            reactions: message.reactions
        });
    } catch (error) {
        console.error('Reaction error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getMyGroups,
    getGroupMessages,
    sendMessage,
    createGroup,
    reactToMessage,
};
