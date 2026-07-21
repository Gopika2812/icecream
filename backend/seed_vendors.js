require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const Vendor = require('./models/Vendor');

const runSeed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Read vendors
        const vendorsData = JSON.parse(fs.readFileSync('../vendors.json', 'utf8'));
        console.log(`Loaded ${vendorsData.length} vendors from JSON`);

        // Process to match schema
        const mappedVendors = vendorsData.map(v => {
            return {
                vendorCode: v.vendorCode,
                name: v.companyName || 'Unknown Vendor',
                contactPerson: v.contactPerson,
                phone: v.phone || 'N/A',
                email: v.email || 'N/A',
                gstinNumber: v.gstinNumber || 'URD', // Unregistered Dealer if empty
                address: {
                    street: v.billingAddress.street || 'N/A',
                    city: v.billingAddress.city || 'N/A',
                    state: v.billingAddress.state || 'Tamil Nadu',
                    stateCode: v.billingAddress.stateCode || '33',
                    pinCode: v.billingAddress.pinCode || '600000'
                },
                status: 'Active'
            };
        });

        // Insert
        await Vendor.deleteMany({}); // clear existing
        console.log('Cleared existing vendors');

        await Vendor.insertMany(mappedVendors);
        console.log(`Successfully seeded ${mappedVendors.length} vendors!`);

        process.exit(0);
    } catch (err) {
        console.error('Error seeding vendors:', err);
        process.exit(1);
    }
};

runSeed();
