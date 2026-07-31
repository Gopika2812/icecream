const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Customer = require('../models/Customer');
const CustomerReceipt = require('../models/CustomerReceipt');

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sri_saravanass_erp');
        console.log('Testing Customer Ledger query...');
        
        const customer = await Customer.findOne({ customerType: 'Auto Sales' });
        if (customer) {
            console.log(`Found Customer: ${customer.name} (${customer._id})`);
            const receipts = await CustomerReceipt.find({ customer: customer._id });
            console.log(`Receipts found: ${receipts.length}`);
        } else {
            console.log('No Auto Sales customer found');
        }

        process.exit(0);
    } catch (err) {
        console.error('Test failed', err);
        process.exit(1);
    }
};

test();
