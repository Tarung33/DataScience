const Course = require('../models/Course');
const Department = require('../models/Department');

// @desc    Create course
// @route   POST /api/courses
// @access  Private (Admin, HOD)
const createCourse = async (req, res) => {
    try {
        const { name, code, department, semester, credits, type, description } = req.body;

        const course = await Course.create({
            name,
            code,
            department,
            semester,
            credits,
            type,
            description,
        });

        await course.populate('department', 'name code');

        res.status(201).json({
            success: true,
            course,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Course code already exists for this department' });
        }
        console.error('Create course error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
const getAllCourses = async (req, res) => {
    try {
        const { department, semester } = req.query;

        const query = { isActive: true };
        if (department) query.department = department;
        if (semester) query.semester = semester;

        const courses = await Course.find(query)
            .populate('department', 'name code')
            .sort('semester name');

        res.json({
            success: true,
            count: courses.length,
            courses,
        });
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get course by ID
// @route   GET /api/courses/:id
// @access  Private
const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('department', 'name code');

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.json({
            success: true,
            course,
        });
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Admin, HOD)
const updateCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const { name, code, semester, credits, type, description } = req.body;

        if (name !== undefined) course.name = name;
        if (code !== undefined) course.code = code;
        if (semester !== undefined) course.semester = semester;
        if (credits !== undefined) course.credits = credits;
        if (type !== undefined) course.type = type;
        if (description !== undefined) course.description = description;

        await course.save();
        await course.populate('department', 'name code');

        res.json({
            success: true,
            course,
        });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Admin)
const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Soft delete
        course.isActive = false;
        await course.save();

        res.json({
            success: true,
            message: 'Course deleted successfully',
        });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
};
