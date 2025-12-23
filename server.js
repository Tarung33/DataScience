const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true,
    })
);

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            touchAfter: 24 * 3600, // lazy session update
        }),
        cookie: {
            maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 1 day
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true in production
            sameSite: 'lax',
        },
    })
);

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const sectionRoutes = require('./routes/sectionRoutes');
const feeRoutes = require('./routes/feeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const courseRoutes = require('./routes/courseRoutes');
const materialRoutes = require('./routes/materialRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const groupRoutes = require('./routes/groupRoutes');
const marksRoutes = require('./routes/marksRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/seating', require('./routes/seatingRoutes'));

// Static folder for uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ message: 'ERP Platform API is running', status: 'OK' });
});

// Error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});
