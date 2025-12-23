const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Student is required'],
        },
        semester: {
            type: Number,
            required: [true, 'Semester is required'],
            min: 1,
            max: 8,
        },
        academicYear: {
            type: String,
            required: [true, 'Academic year is required'],
        },
        totalAmount: {
            type: Number,
            required: [true, 'Total amount is required'],
            min: 0,
        },
        paidAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        dueDate: {
            type: Date,
            required: [true, 'Due date is required'],
        },
        paymentDate: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['pending', 'partial', 'paid', 'overdue'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'card', 'online', 'cheque', 'other'],
        },
        transactionId: {
            type: String,
        },
        remarks: {
            type: String,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        receiptUrl: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Virtual for remaining amount
feeSchema.virtual('remainingAmount').get(function () {
    return this.totalAmount - this.paidAmount;
});

// Method to update status based on payment
feeSchema.methods.updateStatus = function () {
    const today = new Date();
    if (this.paidAmount >= this.totalAmount) {
        this.status = 'paid';
    } else if (this.paidAmount > 0) {
        this.status = 'partial';
    } else if (today > this.dueDate) {
        this.status = 'overdue';
    } else {
        this.status = 'pending';
    }
};

// Update status before saving
feeSchema.pre('save', function (next) {
    this.updateStatus();
    next();
});

module.exports = mongoose.model('Fee', feeSchema);
