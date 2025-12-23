const Material = require('../models/Material');
const fs = require('fs');
const path = require('path');

// @desc    Upload study material
// @route   POST /api/materials
// @access  Private (Faculty, Admin, HOD)
const uploadMaterial = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const { title, description, course, department, semester } = req.body;

        const material = await Material.create({
            title,
            description,
            fileUrl: `/uploads/materials/${req.file.filename}`,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            course,
            faculty: req.user._id,
            department,
            semester,
        });

        await material.populate('course', 'name code');
        await material.populate('faculty', 'name');

        res.status(201).json({
            success: true,
            material,
        });
    } catch (error) {
        console.error('Upload material error:', error);
        // Delete file if DB save fails
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get materials
// @route   GET /api/materials
// @access  Private
const getMaterials = async (req, res) => {
    try {
        const { course, department, semester } = req.query;

        const query = { isActive: true };
        if (course) query.course = course;
        if (department) query.department = department;
        if (semester) query.semester = semester;

        // If student, filter by their department and semester if not specified
        if (req.user.role === 'student' && !department && !semester) {
            query.department = req.user.department;
            query.semester = req.user.semester;
        }

        const materials = await Material.find(query)
            .populate('course', 'name code')
            .populate('faculty', 'name')
            .sort('-createdAt');

        res.json({
            success: true,
            count: materials.length,
            materials,
        });
    } catch (error) {
        console.error('Get materials error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete material
// @route   DELETE /api/materials/:id
// @access  Private (Faculty - own, Admin, HOD)
const deleteMaterial = async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);

        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        // Check authorization
        if (
            req.user.role !== 'admin' &&
            req.user.role !== 'hod' &&
            material.faculty.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized to delete this material' });
        }

        // Soft delete or hard delete? Let's do hard delete for files
        const filePath = path.join(__dirname, '..', material.fileUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await material.deleteOne();

        res.json({
            success: true,
            message: 'Material deleted successfully',
        });
    } catch (error) {
        console.error('Delete material error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    uploadMaterial,
    getMaterials,
    deleteMaterial,
};
