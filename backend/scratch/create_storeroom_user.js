const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('../models/User');

async function createStoreroomUser() {
  await mongoose.connect(process.env.MONGODB_URI);

  const hashedPassword = await bcrypt.hash('password123', 10);
  const userData = {
    name: 'Store Room Team User',
    username: 'storeroom',
    password: hashedPassword,
    employeeId: 'EMP-STORE-01',
    role: 'Store Room Team',
    status: 'Active',
    allowedPages: [
      '/dashboard',
      '/store-room-requisitions',
      '/raw-material-stock'
    ]
  };

  const existing = await User.findOne({ username: 'storeroom' });
  if (existing) {
    await User.updateOne({ username: 'storeroom' }, userData);
    console.log('✅ Updated storeroom user account in DB');
  } else {
    await User.create(userData);
    console.log('✅ Created storeroom user account in DB');
  }

  const allUsers = await User.find({});
  console.log('Total Users:', allUsers.length, allUsers.map(u => ({ username: u.username, role: u.role, pages: u.allowedPages?.length })));

  process.exit(0);
}

createStoreroomUser();
