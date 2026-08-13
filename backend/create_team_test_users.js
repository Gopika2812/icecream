const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Branch = require('./models/Branch');

const testUsers = [
  {
    name: 'Purchase Team User',
    username: 'purchase',
    password: 'password123',
    employeeId: 'EMP-PUR-01',
    role: 'Purchase Team',
    status: 'Active',
    allowedPages: [
      '/dashboard',
      '/purchase-orders',
      '/qc',
      '/vendor-ledgers',
      '/raw-material-stock',
      '/vendors',
      '/products'
    ]
  },
  {
    name: 'QC Team User',
    username: 'qc',
    password: 'password123',
    employeeId: 'EMP-QC-01',
    role: 'QC Team',
    status: 'Active',
    allowedPages: [
      '/dashboard',
      '/qc',
      '/raw-material-stock'
    ]
  },
  {
    name: 'Production Team User',
    username: 'production',
    password: 'password123',
    employeeId: 'EMP-PROD-01',
    role: 'Production Team',
    status: 'Active',
    allowedPages: [
      '/dashboard',
      '/raw-material-stock',
      '/store-room-requisitions',
      '/production',
      '/finished-goods-stock',
      '/products'
    ]
  },
  {
    name: 'Sales Team User',
    username: 'sales',
    password: 'password123',
    employeeId: 'EMP-SALES-01',
    role: 'Sales Team',
    status: 'Active',
    allowedPages: [
      '/dashboard',
      '/finished-goods-stock',
      '/sales-invoices',
      '/auto-sales-ledger',
      '/customer-ledgers',
      '/customers',
      '/products'
    ]
  }
];

const seedUsers = async () => {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    const branch = await Branch.findOne({});
    const branchId = branch ? branch._id : null;

    for (const u of testUsers) {
      const existing = await User.findOne({ username: u.username });
      if (existing) {
        console.log(`Updating existing user: ${u.username}`);
        existing.name = u.name;
        existing.role = u.role;
        existing.status = u.status;
        existing.employeeId = u.employeeId;
        existing.allowedPages = u.allowedPages;
        if (branchId) existing.primaryBranch = branchId;
        existing.password = u.password;
        await existing.save();
      } else {
        console.log(`Creating new user: ${u.username}`);
        u.primaryBranch = branchId;
        await User.create(u);
      }
    }

    console.log('Successfully seeded 4 Team Test Users!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding test users:', err);
    process.exit(1);
  }
};

seedUsers();
