require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Role = require('./models/Role');
const Branch = require('./models/Branch');
const Customer = require('./models/Customer');

const seedSalesData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for Seeding Sales Owners & Customers...');

        // 1. Get Main Branch and Roles
        const mainBranch = await Branch.findOne({ code: 'BR-MAIN' }) || await Branch.findOne({});
        if (!mainBranch) {
            console.error('No branch found! Run initial seed first.');
            process.exit(1);
        }

        let salesRole = await Role.findOne({ name: 'Sales Representative' }) || await Role.findOne({});
        if (!salesRole) {
            salesRole = await Role.create({
                name: 'Sales Representative',
                description: 'Sales and Field Sales Operations',
                permissions: [{ module: 'sales', actions: { view: true, create: true, edit: true } }]
            });
        }

        // 2. Seed Sales Owners (Employees)
        console.log('Seeding Sales Owners / Employees...');
        const salesStaffData = [
            {
                employeeId: 'EMP-SALES-001',
                name: 'Ramesh Kumar',
                username: 'ramesh.sales',
                email: 'ramesh.sales@saravanass.com',
                mobile: '9842011223',
                password: 'Password123!',
                role: salesRole._id,
                primaryBranch: mainBranch._id,
                department: 'Sales & Events',
                designation: 'Party Order Executive',
                status: 'Active'
            },
            {
                employeeId: 'EMP-AUTO-002',
                name: 'Murugan V',
                username: 'murugan.auto',
                email: 'murugan.auto@saravanass.com',
                mobile: '9789033445',
                password: 'Password123!',
                role: salesRole._id,
                primaryBranch: mainBranch._id,
                department: 'Mobile Auto Sales',
                designation: 'Auto Sales Driver & Executive',
                status: 'Active'
            },
            {
                employeeId: 'EMP-DEALER-003',
                name: 'Karthik Raja',
                username: 'karthik.dealer',
                email: 'karthik.dealer@saravanass.com',
                mobile: '9655055667',
                password: 'Password123!',
                role: salesRole._id,
                primaryBranch: mainBranch._id,
                department: 'Wholesale Sales',
                designation: 'Key Dealer Account Manager',
                status: 'Active'
            },
            {
                employeeId: 'EMP-CBE-004',
                name: 'Suresh M',
                username: 'suresh.cbe',
                email: 'suresh.cbe@saravanass.com',
                mobile: '9443077889',
                password: 'Password123!',
                role: salesRole._id,
                primaryBranch: mainBranch._id,
                department: 'Branch Operations',
                designation: 'Coimbatore Sales Incharge',
                status: 'Active'
            },
            {
                employeeId: 'EMP-MDU-005',
                name: 'Prakash K',
                username: 'prakash.mdu',
                email: 'prakash.mdu@saravanass.com',
                mobile: '9894099001',
                password: 'Password123!',
                role: salesRole._id,
                primaryBranch: mainBranch._id,
                department: 'Branch Operations',
                designation: 'Madurai Sales Incharge',
                status: 'Active'
            },
            {
                employeeId: 'EMP-KER-006',
                name: 'Vijayan N',
                username: 'vijayan.ker',
                email: 'vijayan.ker@saravanass.com',
                mobile: '9150011224',
                password: 'Password123!',
                role: salesRole._id,
                primaryBranch: mainBranch._id,
                department: 'Branch Operations',
                designation: 'Kerala Sales Incharge',
                status: 'Active'
            }
        ];

        const seededUsers = [];
        for (const staff of salesStaffData) {
            let u = await User.findOne({ username: staff.username });
            if (!u) {
                u = await User.create(staff);
            }
            seededUsers.push(u);
        }
        console.log(`Successfully prepared ${seededUsers.length} sales owner employees.`);

        const ramesh = seededUsers.find(u => u.username === 'ramesh.sales');
        const murugan = seededUsers.find(u => u.username === 'murugan.auto');
        const karthik = seededUsers.find(u => u.username === 'karthik.dealer');
        const suresh = seededUsers.find(u => u.username === 'suresh.cbe');
        const prakash = seededUsers.find(u => u.username === 'prakash.mdu');
        const vijayan = seededUsers.find(u => u.username === 'vijayan.ker');

        // 3. Seed Categorized Customers with Linked Sales Owners
        console.log('Seeding Categorized Customers with Sales Owners...');
        await Customer.deleteMany({});

        const customersList = [
            // --- PARTY ORDER CUSTOMERS ---
            {
                customerCode: 'C-PARTY-001',
                name: 'Royal Caterers & Event Managers',
                customerType: 'Party Order',
                salesOwner: ramesh._id,
                contactPerson: 'Kannan Sundaram',
                phone: '9843012345',
                email: 'events@royalcaterers.com',
                gstinNumber: '33AAACR1234A1Z1',
                billingAddress: {
                    street: '15, Palace Road',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641018'
                },
                status: 'Active'
            },
            {
                customerCode: 'C-PARTY-002',
                name: 'Grand Marriage Hall & Party Catering',
                customerType: 'Party Order',
                salesOwner: ramesh._id,
                contactPerson: 'Vijay Anand',
                phone: '9003344556',
                email: 'vijay@grandmarriages.com',
                gstinNumber: '33BBBGM5555B1Z2',
                billingAddress: {
                    street: '77, Gandhi Road',
                    city: 'Madurai',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '625003'
                },
                status: 'Active'
            },

            // --- AUTO SALES (VENDING VANS STREET WISE) ---
            {
                customerCode: 'C-AUTO-001',
                name: 'North Zone Mobile Auto 01 (Gandhi Nagar & Peelamedu)',
                customerType: 'Auto Sales',
                salesOwner: murugan._id,
                contactPerson: 'Murugan V (Driver)',
                phone: '9789033445',
                email: 'auto01@saravanass.com',
                gstinNumber: '33AUTO01001Z1',
                billingAddress: {
                    street: 'Street Route #1, Peelamedu Main St',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641004'
                },
                status: 'Active'
            },
            {
                customerCode: 'C-AUTO-002',
                name: 'South Zone Mobile Auto 02 (RS Puram & Ukkadam)',
                customerType: 'Auto Sales',
                salesOwner: murugan._id,
                contactPerson: 'Murugan V (Driver)',
                phone: '9789033446',
                email: 'auto02@saravanass.com',
                gstinNumber: '33AUTO02002Z2',
                billingAddress: {
                    street: 'Street Route #2, DBRoad RS Puram',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641002'
                },
                status: 'Active'
            },

            // --- DEALER (PARLOURS & RETAIL SHOPS) ---
            {
                customerCode: 'C-DEALER-001',
                name: 'Nila Cold Storage & Ice Cream Parlour',
                customerType: 'Dealer',
                salesOwner: karthik._id,
                contactPerson: 'Senthil Kumar',
                phone: '9843055667',
                email: 'nilacoldstorage@gmail.com',
                gstinNumber: '33DDDDD4444D1Z4',
                billingAddress: {
                    street: '102, Main Road',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641002'
                },
                status: 'Active'
            },
            {
                customerCode: 'C-DEALER-002',
                name: 'Aavin Softy & Frozen Treats Supermarket',
                customerType: 'Dealer',
                salesOwner: karthik._id,
                contactPerson: 'Rajesh Sharma',
                phone: '9894088990',
                email: 'orders@aavinfrozen.com',
                gstinNumber: '33EEEED8888E1Z8',
                billingAddress: {
                    street: '45, Cross Cut Road',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641012'
                },
                status: 'Active'
            },

            // --- BRANCH SALES (COIMBATORE, MADURAI, KERALA) ---
            {
                customerCode: 'C-BRANCH-CBE',
                name: 'Coimbatore Main Branch Depot',
                customerType: 'Coimbatore',
                salesOwner: suresh._id,
                contactPerson: 'Suresh M (Branch Head)',
                phone: '9443077889',
                email: 'coimbatore.branch@saravanass.com',
                gstinNumber: '33CBEBR1111C1Z1',
                billingAddress: {
                    street: 'Avinashi Road Branch Hub',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641014'
                },
                status: 'Active'
            },
            {
                customerCode: 'C-BRANCH-MDU',
                name: 'Madurai Distribution Branch Outlet',
                customerType: 'Madurai',
                salesOwner: prakash._id,
                contactPerson: 'Prakash K (Branch Head)',
                phone: '9894099001',
                email: 'madurai.branch@saravanass.com',
                gstinNumber: '33MDUBR2222M1Z2',
                billingAddress: {
                    street: 'KK Nagar Depot Road',
                    city: 'Madurai',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '625020'
                },
                status: 'Active'
            },
            {
                customerCode: 'C-BRANCH-KER',
                name: 'Kerala Regional Branch Depot (Palakkad)',
                customerType: 'Kerala',
                salesOwner: vijayan._id,
                contactPerson: 'Vijayan N (Branch Head)',
                phone: '9150011224',
                email: 'kerala.branch@saravanass.com',
                gstinNumber: '32KERBR3333K1Z3',
                billingAddress: {
                    street: 'Industrial Zone, Walayar',
                    city: 'Palakkad',
                    state: 'Kerala',
                    stateCode: '32',
                    pinCode: '678624'
                },
                status: 'Active'
            }
        ];

        await Customer.insertMany(customersList);
        console.log(`Successfully seeded ${customersList.length} categorized customers with linked Sales Owners!`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding sales customers data:', error);
        process.exit(1);
    }
};

seedSalesData();
