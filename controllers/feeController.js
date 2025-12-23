const Fee = require('../models/Fee');
const User = require('../models/User');

// @desc    Create fee record
// @route   POST /api/fees
// @access  Private (Admin)
const createFee = async (req, res) => {
    try {
        const {
            student,
            semester,
            academicYear,
            totalAmount,
            paidAmount,
            dueDate,
            paymentDate,
            paymentMethod,
            transactionId,
            remarks,
        } = req.body;

        // Verify student exists and is a student
        const studentUser = await User.findById(student);
        if (!studentUser) {
            return res.status(404).json({ message: 'Student not found' });
        }
        if (studentUser.role !== 'student') {
            return res.status(400).json({ message: 'User is not a student' });
        }

        const fee = await Fee.create({
            student,
            semester,
            academicYear,
            totalAmount,
            paidAmount: paidAmount || 0,
            dueDate,
            paymentDate,
            paymentMethod,
            transactionId,
            remarks,
            createdBy: req.user._id,
        });

        await fee.populate('student', 'name email enrollmentNumber');

        res.status(201).json({
            success: true,
            fee,
        });
    } catch (error) {
        console.error('Create fee error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get all fee records
// @route   GET /api/fees
// @access  Private (Admin, HOD)
const getAllFees = async (req, res) => {
    try {
        const { student, semester, status, academicYear } = req.query;

        const query = {};
        if (student) query.student = student;
        if (semester) query.semester = semester;
        if (status) query.status = status;
        if (academicYear) query.academicYear = academicYear;

        const fees = await Fee.find(query)
            .populate('student', 'name email enrollmentNumber department section')
            .populate('createdBy', 'name')
            .sort('-createdAt');

        // Calculate statistics
        const stats = {
            total: fees.length,
            totalAmount: fees.reduce((sum, fee) => sum + fee.totalAmount, 0),
            paidAmount: fees.reduce((sum, fee) => sum + fee.paidAmount, 0),
            pending: fees.filter(f => f.status === 'pending').length,
            partial: fees.filter(f => f.status === 'partial').length,
            paid: fees.filter(f => f.status === 'paid').length,
            overdue: fees.filter(f => f.status === 'overdue').length,
        };

        res.json({
            success: true,
            count: fees.length,
            stats,
            fees,
        });
    } catch (error) {
        console.error('Get fees error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get student's fee records
// @route   GET /api/fees/student/:studentId
// @access  Private (Admin, HOD, Student - own records)
const getStudentFees = async (req, res) => {
    try {
        const { studentId } = req.params;

        // Check authorization - students can only view their own records
        if (
            req.user.role === 'student' &&
            req.user._id.toString() !== studentId
        ) {
            return res.status(403).json({ message: 'Not authorized to view these records' });
        }

        const fees = await Fee.find({ student: studentId })
            .populate('createdBy', 'name')
            .sort('-semester -createdAt');

        res.json({
            success: true,
            count: fees.length,
            fees,
        });
    } catch (error) {
        console.error('Get student fees error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update fee record
// @route   PUT /api/fees/:id
// @access  Private (Admin)
const updateFee = async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        const {
            totalAmount,
            paidAmount,
            dueDate,
            paymentDate,
            paymentMethod,
            transactionId,
            remarks,
        } = req.body;

        if (totalAmount !== undefined) fee.totalAmount = totalAmount;
        if (paidAmount !== undefined) fee.paidAmount = paidAmount;
        if (dueDate) fee.dueDate = dueDate;
        if (paymentDate !== undefined) fee.paymentDate = paymentDate;
        if (paymentMethod) fee.paymentMethod = paymentMethod;
        if (transactionId !== undefined) fee.transactionId = transactionId;
        if (remarks !== undefined) fee.remarks = remarks;

        await fee.save();
        await fee.populate('student', 'name email enrollmentNumber');

        res.json({
            success: true,
            fee,
        });
    } catch (error) {
        console.error('Update fee error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Delete fee record
// @route   DELETE /api/fees/:id
// @access  Private (Admin)
const deleteFee = async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        await fee.deleteOne();

        res.json({
            success: true,
            message: 'Fee record deleted successfully',
        });
    } catch (error) {
        console.error('Delete fee error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Record payment
// @route   POST /api/fees/:id/payment
// @access  Private (Admin)
const recordPayment = async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        const { amount, paymentMethod, transactionId, paymentDate } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Valid payment amount is required' });
        }

        fee.paidAmount += amount;
        fee.paymentMethod = paymentMethod;
        fee.transactionId = transactionId;
        fee.paymentDate = paymentDate || new Date();

        await fee.save();
        await fee.populate('student', 'name email enrollmentNumber');

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            fee,
        });
    } catch (error) {
        console.error('Record payment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Upload fee receipt
// @route   POST /api/fees/:id/receipt
// @access  Private (Admin)
const uploadReceipt = async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        // Standardized path as used in materials: /uploads/materials/filename
        const fileUrl = `/uploads/materials/${req.file.filename}`;

        fee.receiptUrl = fileUrl;
        await fee.save();

        res.json({
            success: true,
            message: 'Receipt uploaded successfully',
            receiptUrl: fileUrl,
            fee
        });
    } catch (error) {
        console.error('Upload receipt error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createFee,
    getAllFees,
    getStudentFees,
    updateFee,
    deleteFee,
    recordPayment,
    uploadReceipt,
};

