require('dotenv').config();
const Branch = require('./models/Branch');
const Role = require('./models/Role');
const User = require('./models/User');

async function seedAdmin() {
    try {
        console.log('Seeding Default Branch and Super Admin into DynamoDB...');

        // 1. Create Default Branch
        let branch = await Branch.findOne({ branchCode: 'HO-01' });
        if (!branch) {
            branch = await Branch.create({
                branchCode: 'HO-01',
                branchName: 'Main Head Office & Factory',
                legalBusinessName: 'HIGAI Ice Creams Pvt Ltd',
                gstinNumber: '33AAAAA0000A1Z0',
                fssaiNumber: '10019042000123',
                address: {
                    street: '100 Factory Road',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    stateCode: '27',
                    pinCode: '400001'
                },
                phoneNumber: '9876543210',
                email: 'info@higaiicecreams.com',
                status: 'Active'
            });
            console.log('Created Default Branch HO-01');
        }

        // 2. Create Super Admin Role
        let role = await Role.findOne({ name: 'Super Admin' });
        if (!role) {
            role = await Role.create({
                name: 'Super Admin',
                description: 'Full system access',
                permissions: []
            });
            console.log('Created Super Admin Role');
        }

        // 3. Create Super Admin User
        let admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            admin = await User.create({
                employeeId: 'EMP001',
                name: 'System Admin',
                username: 'admin',
                email: 'admin@higaiicecreams.com',
                password: 'adminpassword123',
                primaryBranch: branch._id || branch.id,
                role: role._id || role.id,
                status: 'Active'
            });
            console.log('Created Super Admin User (admin / adminpassword123)');
        }

        console.log('Admin & Branch seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding admin:', err);
        process.exit(1);
    }
}

seedAdmin();
