const QualityControl = require('./models/QualityControl');
const VendorPayment = require('./models/VendorPayment');
const PurchaseOrder = require('./models/PurchaseOrder');
const Vendor = require('./models/Vendor');

async function test() {
    const qcs = await QualityControl.find();
    console.log("=== ALL QC RECORDS ===");
    console.log(JSON.stringify(qcs, null, 2));

    const payments = await VendorPayment.find();
    console.log("=== ALL VENDOR PAYMENTS ===");
    console.log(JSON.stringify(payments, null, 2));

    const pos = await PurchaseOrder.find();
    console.log("=== ALL PURCHASE ORDERS ===");
    console.log(JSON.stringify(pos, null, 2));
}

test().catch(console.error);
