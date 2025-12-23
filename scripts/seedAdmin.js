const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const seedAdmin = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ MongoDB Connected');

        // Check if admin already exists
        const adminExists = await User.findOne({ role: 'admin' });

        if (adminExists) {
            console.log('⚠️  Admin user already exists');
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create({
            name: 'System Admin',
            email: 'admin@erp.com',
            password: 'admin123', // Change this in production!
            role: 'admin',
        });

        console.log('✅ Admin user created successfully');
        console.log('📧 Email: admin@erp.com');
        console.log('🔑 Password: admin123');
        console.log('⚠️  Please change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seedAdmin();
