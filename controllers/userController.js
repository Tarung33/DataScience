const User = require('../models/User');
const Department = require('../models/Department');
const Section = require('../models/Section');

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private (Admin)
const createUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            department,
            section,
            semester,
            dateOfBirth,
            phone,
            address,
            enrollmentNumber,
            employeeId,
            courses,
        } = req.body;

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Create user object
        const userData = {
            name,
            email,
            password,
            role,
            dateOfBirth,
            phone,
            address,
        };

        // Add role-specific fields
        if (role === 'student') {
            userData.department = department || undefined;
            userData.section = section || undefined;
            userData.semester = semester || undefined;
            userData.enrollmentNumber = enrollmentNumber;
        } else if (role === 'faculty' || role === 'hod') {
            userData.department = department || undefined;
            userData.employeeId = employeeId;
            userData.courses = Array.isArray(courses) ? courses : [];
        }

        const user = await User.create(userData);

        // Populate references
        await user.populate('department section');

        res.status(201).json({
            success: true,
            user,
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin, HOD)
const getAllUsers = async (req, res) => {
    try {
        const { role, department, section, semester } = req.query;

        // Build query
        const query = { isActive: true };

        if (role) query.role = role;
        if (department) query.department = department;
        if (section) query.section = section;
        if (semester) query.semester = semester;

        // If user is HOD, filter by their department
        if (req.user.role === 'hod') {
            query.department = req.user.department;
        }

        const users = await User.find(query)
            .populate('department', 'name code')
            .populate('section', 'name semester')
            .sort('-createdAt');

        res.json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('department', 'name code')
            .populate('section', 'name semester');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check authorization - users can view their own profile, admin/hod can view all
        if (
            req.user._id.toString() !== user._id.toString() &&
            req.user.role !== 'admin' &&
            req.user.role !== 'hod'
        ) {
            return res.status(403).json({ message: 'Not authorized to view this user' });
        }

        res.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check authorization
        const isSelf = req.user._id.toString() === user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isHOD = req.user.role === 'hod';

        if (!isSelf && !isAdmin && !isHOD) {
            return res.status(403).json({ message: 'Not authorized to update this user' });
        }

        // Fields that can be updated
        const allowedFields = ['name', 'phone', 'address', 'dateOfBirth'];

        // Admin can update more fields
        if (isAdmin || isHOD) {
            allowedFields.push('email', 'role', 'department', 'section', 'semester', 'isActive', 'enrollmentNumber', 'employeeId');
        }

        // Update only allowed fields
        Object.keys(req.body).forEach((key) => {
            if (allowedFields.includes(key)) {
                // Handle empty strings for ID fields
                if (['department', 'section'].includes(key) && req.body[key] === '') {
                    user[key] = undefined;
                } else {
                    user[key] = req.body[key];
                }
            }
        });

        // Special handling for courses
        if ((isAdmin || isHOD) && req.body.courses && Array.isArray(req.body.courses)) {
            user.courses = req.body.courses;
        }

        await user.save();
        await user.populate('department section');

        res.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Soft delete - set isActive to false
        user.isActive = false;
        await user.save();

        res.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Assign department/section/semester to student
// @route   PUT /api/users/:id/assign-department
// @access  Private (Admin, HOD)
const assignDepartment = async (req, res) => {
    try {
        const { department, section, semester } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'student') {
            return res.status(400).json({ message: 'Can only assign department to students' });
        }

        // Verify department exists
        const deptExists = await Department.findById(department);
        if (!deptExists) {
            return res.status(404).json({ message: 'Department not found' });
        }

        // Verify section exists
        const sectionExists = await Section.findById(section);
        if (!sectionExists) {
            return res.status(404).json({ message: 'Section not found' });
        }

        user.department = department;
        user.section = section;
        user.semester = semester;

        await user.save();
        await user.populate('department section');

        res.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error('Assign department error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Toggle Special Faculty permission
// @route   PATCH /api/users/:id/toggle-special
// @access  Private (HOD)
const toggleSpecialFaculty = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only HOD can toggle for faculty in their department
        if (req.user.role !== 'hod' || req.user.department.toString() !== user.department.toString()) {
            return res.status(403).json({ message: 'Not authorized to change this user\'s permissions' });
        }

        if (user.role !== 'faculty') {
            return res.status(400).json({ message: 'Special permission can only be granted to faculty' });
        }

        user.isSpecialFaculty = !user.isSpecialFaculty;
        await user.save();

        res.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error('Toggle special faculty error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update FCM token for push notifications
// @route   POST /api/users/update-fcm-token
// @access  Private
const updateFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ message: 'FCM token is required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if token already exists to avoid duplicates
        if (!user.fcmTokens.includes(fcmToken)) {
            user.fcmTokens.push(fcmToken);
            await user.save();
        }

        res.json({
            success: true,
            message: 'FCM token updated successfully',
        });
    } catch (error) {
        console.error('Update FCM token error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Bulk promote students to next semester
// @route   PUT /api/users/bulk-promote
// @access  Private (Admin)
const bulkPromote = async (req, res) => {
    try {
        const { department, currentSemester } = req.body;

        if (!department || !currentSemester) {
            return res.status(400).json({ message: 'Department and current semester are required' });
        }

        const result = await User.updateMany(
            {
                role: 'student',
                department,
                semester: currentSemester,
                isActive: true
            },
            {
                $inc: { semester: 1 }
            }
        );

        res.json({
            success: true,
            message: `Successfully promoted ${result.modifiedCount} students`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Bulk promote error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Bulk assign courses to students based on department and semester
// @route   PUT /api/users/bulk-assign-courses
// @access  Private (Admin)
const bulkAssignCourses = async (req, res) => {
    try {
        const { department, semester } = req.body;

        if (!department || !semester) {
            return res.status(400).json({ message: 'Department and semester are required' });
        }

        // 1. Get all active courses for this dept and semester
        const Course = require('../models/Course');
        const courses = await Course.find({
            department,
            semester,
            isActive: true
        });

        if (courses.length === 0) {
            return res.status(404).json({ message: 'No courses found for this department and semester' });
        }

        const courseIds = courses.map(c => c._id);

        // 2. Assign these courses to all matching students
        const result = await User.updateMany(
            {
                role: 'student',
                department,
                semester,
                isActive: true
            },
            {
                $set: { courses: courseIds }
            }
        );

        res.json({
            success: true,
            message: `Successfully assigned courses to ${result.modifiedCount} students`,
            modifiedCount: result.modifiedCount,
            coursesCount: courseIds.length
        });
    } catch (error) {
        console.error('Bulk assign courses error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
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
};
