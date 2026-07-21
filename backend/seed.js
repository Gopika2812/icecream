const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Role = require('./models/Role');
const Branch = require('./models/Branch');

dotenv.config();

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for Seeding');

        // Check if Admin exists to prevent duplicates
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('Admin user already exists.');
            console.log('Username: admin');
            console.log('Password: password123 (if not changed)');
            process.exit();
        }

        // 1. Create Super Admin Role
        let superAdminRole = await Role.findOne({ name: 'Super Admin' });
        if (!superAdminRole) {
            superAdminRole = await Role.create({
                name: 'Super Admin',
                description: 'Full system access',
                permissions: []
            });
        }

        // 2. Create Main Branch
        let mainBranch = await Branch.findOne({ branchCode: 'MAIN-001' });
        if (!mainBranch) {
            mainBranch = await Branch.create({
                branchCode: 'MAIN-001',
                branchName: 'Headquarters',
                status: 'Active'
            });
        }

        // 3. Create Super Admin User
        const adminUser = await User.create({
            employeeId: 'EMP-001',
            name: 'System Admin',
            email: 'admin@srisaravanass.com',
            username: 'admin',
            password: 'password123',
            role: superAdminRole._id,
            primaryBranch: mainBranch._id,
            assignedBranches: [mainBranch._id],
            status: 'Active'
        });

        console.log('Database Seeded Successfully!');
        console.log('---------------------------------');
        console.log('Login Credentials:');
        console.log('Username: admin');
        console.log('Password: password123');
        console.log('---------------------------------');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedDB();
