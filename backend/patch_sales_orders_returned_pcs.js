const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const SalesOrder = require('./models/SalesOrder');

const runPatch = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sri_saravanass_erp');
        console.log('Connected to MongoDB to patch SalesOrder returnedPcs...');

        const orders = await SalesOrder.find({ returnedPcs: { $gt: 0 } });
        console.log(`Found ${orders.length} sales orders with returnedPcs > 0.`);

        for (const order of orders) {
            if (order.items && order.items.length > 0) {
                // If items don't have returnedPcs, set on first item
                let updated = false;
                order.items.forEach(item => {
                    if (!item.returnedPcs) {
                        item.returnedPcs = order.returnedPcs;
                        updated = true;
                    }
                });

                if (updated) {
                    await order.save();
                    console.log(`Patched SalesOrder ${order.invoiceNumber} with returnedPcs = ${order.returnedPcs}`);
                }
            }
        }

        console.log('SalesOrder patch completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Patch failed:', err);
        process.exit(1);
    }
};

runPatch();
