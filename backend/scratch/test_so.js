const SalesOrder = require('../models/SalesOrder');

async function testSalesOrder() {
    try {
        console.log('Testing SalesOrder.findById().populate() chaining...');
        const res = await SalesOrder.find().limit(1);
        if (res.length > 0) {
            const item = await SalesOrder.findById(res[0]._id)
                .populate('customer')
                .populate('salesOwner')
                .populate('items.product');
            console.log('Found & Populated item successfully:', item._id, item.invoiceNumber);
        } else {
            console.log('No existing sales orders to query.');
        }
        console.log('TEST PASSED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('TEST FAILED WITH ERROR:', err);
        process.exit(1);
    }
}

testSalesOrder();
