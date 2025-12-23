const express = require('express');
const {
    createFee,
    getAllFees,
    getStudentFees,
    updateFee,
    deleteFee,
    recordPayment,
    uploadReceipt,
} = require('../controllers/feeController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

const router = express.Router();

// Create and get all fees - Admin only
router.post('/', protect, checkRole('admin'), createFee);
router.get('/', protect, checkRole('admin', 'hod'), getAllFees);

// Get student fees - Admin, HOD, and students (own records)
router.get('/student/:studentId', protect, getStudentFees);

// Update and delete fees - Admin only
router.put('/:id', protect, checkRole('admin'), updateFee);
router.delete('/:id', protect, checkRole('admin'), deleteFee);

// Record payment - Admin only
router.post('/:id/payment', protect, checkRole('admin'), recordPayment);

// Upload receipt - Admin only
router.post('/:id/receipt', protect, checkRole('admin'), upload.single('file'), uploadReceipt);

module.exports = router;
