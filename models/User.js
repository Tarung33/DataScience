const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a name'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Please provide an email'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email',
            ],
        },
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: 6,
            select: false, // Don't include password in queries by default
        },
        role: {
            type: String,
            enum: ['admin', 'hod', 'faculty', 'student'],
            required: [true, 'Please specify a role'],
        },
        // Academic mapping (primarily for students)
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: function () {
                return this.role === 'student' || this.role === 'faculty' || this.role === 'hod';
            },
        },
        section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section',
            required: function () {
                return this.role === 'student';
            },
        },
        semester: {
            type: Number,
            min: 1,
            max: 8,
            required: function () {
                return this.role === 'student';
            },
        },
        // Additional information
        dateOfBirth: {
            type: Date,
        },
        phone: {
            type: String,
            match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
        },
        address: {
            type: String,
        },
        // Student-specific fields
        enrollmentNumber: {
            type: String,
            unique: true,
            sparse: true, // Allows null values while maintaining uniqueness
            required: function () {
                return this.role === 'student';
            },
        },
        // Faculty/HOD-specific fields
        employeeId: {
            type: String,
            unique: true,
            sparse: true,
            required: function () {
                return this.role === 'faculty' || this.role === 'hod';
            },
        },
        courses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
        }],
        // Status
        isActive: {
            type: Boolean,
            default: true,
        },
        isSpecialFaculty: {
            type: Boolean,
            default: false,
        },
        fcmTokens: [{
            type: String,
        }],
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
