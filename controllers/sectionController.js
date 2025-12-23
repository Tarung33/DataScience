const Section = require('../models/Section');
const Department = require('../models/Department');

// @desc    Create new section
// @route   POST /api/sections
// @access  Private (Admin, HOD)
const createSection = async (req, res) => {
    try {
        const { name, department, semester, maxStudents } = req.body;

        // Verify department exists
        const deptExists = await Department.findById(department);
        if (!deptExists) {
            return res.status(404).json({ message: 'Department not found' });
        }

        // If user is HOD, ensure they can only create sections for their department
        if (req.user.role === 'hod' && req.user.department.toString() !== department) {
            return res.status(403).json({ message: 'HOD can only create sections for their own department' });
        }

        const section = await Section.create({
            name,
            department,
            semester,
            maxStudents: maxStudents || 60,
        });

        await section.populate('department', 'name code');

        res.status(201).json({
            success: true,
            section,
        });
    } catch (error) {
        console.error('Create section error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get all sections
// @route   GET /api/sections
// @access  Private
const getAllSections = async (req, res) => {
    try {
        const query = { isActive: true };

        // If user is HOD, filter by their department
        if (req.user.role === 'hod') {
            query.department = req.user.department;
        }

        const sections = await Section.find(query)
            .populate('department', 'name code')
            .sort('department semester name');

        res.json({
            success: true,
            count: sections.length,
            sections,
        });
    } catch (error) {
        console.error('Get sections error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get sections by department
// @route   GET /api/sections/department/:departmentId
// @access  Private
const getSectionsByDepartment = async (req, res) => {
    try {
        const { semester } = req.query;
        const query = {
            department: req.params.departmentId,
            isActive: true,
        };

        if (semester) {
            query.semester = semester;
        }

        const sections = await Section.find(query)
            .populate('department', 'name code')
            .sort('semester name');

        res.json({
            success: true,
            count: sections.length,
            sections,
        });
    } catch (error) {
        console.error('Get sections by department error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update section
// @route   PUT /api/sections/:id
// @access  Private (Admin, HOD)
const updateSection = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);

        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }

        // If user is HOD, ensure section belongs to their department
        if (req.user.role === 'hod' && req.user.department.toString() !== section.department.toString()) {
            return res.status(403).json({ message: 'HOD can only update sections in their own department' });
        }

        const { name, semester, maxStudents } = req.body;

        if (name) section.name = name;
        if (semester) section.semester = semester;
        if (maxStudents) section.maxStudents = maxStudents;

        await section.save();
        await section.populate('department', 'name code');

        res.json({
            success: true,
            section,
        });
    } catch (error) {
        console.error('Update section error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Delete section
// @route   DELETE /api/sections/:id
// @access  Private (Admin, HOD)
const deleteSection = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);

        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }

        // If user is HOD, ensure section belongs to their department
        if (req.user.role === 'hod' && req.user.department.toString() !== section.department.toString()) {
            return res.status(403).json({ message: 'HOD can only delete sections in their own department' });
        }

        // Soft delete
        section.isActive = false;
        await section.save();

        res.json({
            success: true,
            message: 'Section deleted successfully',
        });
    } catch (error) {
        console.error('Delete section error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createSection,
    getAllSections,
    getSectionsByDepartment,
    updateSection,
    deleteSection,
};
