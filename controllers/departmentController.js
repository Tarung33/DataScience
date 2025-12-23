const Department = require('../models/Department');
const User = require('../models/User');

// @desc    Create new department
// @route   POST /api/departments
// @access  Private (Admin)
const createDepartment = async (req, res) => {
    try {
        const { name, code, description, hod } = req.body;

        // Check if department already exists
        const deptExists = await Department.findOne({ $or: [{ name }, { code }] });
        if (deptExists) {
            return res.status(400).json({ message: 'Department with this name or code already exists' });
        }

        // If HOD is provided, verify they exist and have correct role
        if (hod) {
            const hodUser = await User.findById(hod);
            if (!hodUser) {
                return res.status(404).json({ message: 'HOD user not found' });
            }
            if (hodUser.role !== 'hod' && hodUser.role !== 'admin') {
                return res.status(400).json({ message: 'User must have HOD or Admin role' });
            }
        }

        const department = await Department.create({
            name,
            code,
            description,
            hod,
        });

        // If HOD assigned, update their department
        if (hod) {
            await User.findByIdAndUpdate(hod, { department: department._id });
        }

        await department.populate('hod', 'name email employeeId');

        res.status(201).json({
            success: true,
            department,
        });
    } catch (error) {
        console.error('Create department error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
const getAllDepartments = async (req, res) => {
    try {
        const departments = await Department.find({ isActive: true })
            .populate('hod', 'name email employeeId')
            .sort('name');

        res.json({
            success: true,
            count: departments.length,
            departments,
        });
    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
const getDepartmentById = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id)
            .populate('hod', 'name email employeeId');

        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        res.json({
            success: true,
            department,
        });
    } catch (error) {
        console.error('Get department error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Admin, HOD)
const updateDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const { name, code, description, hod } = req.body;

        if (name) department.name = name;
        if (code) department.code = code;
        if (description !== undefined) department.description = description;
        if (hod !== undefined) {
            // Verify new HOD
            if (hod) {
                const hodUser = await User.findById(hod);
                if (!hodUser) {
                    return res.status(404).json({ message: 'HOD user not found' });
                }
                if (hodUser.role !== 'hod' && hodUser.role !== 'admin') {
                    return res.status(400).json({ message: 'User must have HOD or Admin role' });
                }
                await User.findByIdAndUpdate(hod, { department: department._id });
            }
            department.hod = hod;
        }

        await department.save();
        await department.populate('hod', 'name email employeeId');

        res.json({
            success: true,
            department,
        });
    } catch (error) {
        console.error('Update department error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Admin)
const deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        // Soft delete
        department.isActive = false;
        await department.save();

        res.json({
            success: true,
            message: 'Department deleted successfully',
        });
    } catch (error) {
        console.error('Delete department error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Assign HOD to department
// @route   PUT /api/departments/:id/assign-hod
// @access  Private (Admin)
const assignHOD = async (req, res) => {
    try {
        const { hodId } = req.body;
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        // Verify HOD user
        const hodUser = await User.findById(hodId);
        if (!hodUser) {
            return res.status(404).json({ message: 'HOD user not found' });
        }

        if (hodUser.role !== 'hod' && hodUser.role !== 'admin') {
            return res.status(400).json({ message: 'User must have HOD or Admin role' });
        }

        department.hod = hodId;
        await department.save();

        // Update HOD's department
        hodUser.department = department._id;
        await hodUser.save();

        await department.populate('hod', 'name email employeeId');

        res.json({
            success: true,
            department,
        });
    } catch (error) {
        console.error('Assign HOD error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
    assignHOD,
};
