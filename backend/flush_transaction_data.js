const mongoose = require('mongoose');
require('dotenv').config();

const SalesOrder = require('./models/SalesOrder');
const AutoSalesEntry = require('./models/AutoSalesEntry');
const CustomerReceipt = require('./models/CustomerReceipt');
const VendorPayment = require('./models/VendorPayment');
const PurchaseOrder = require('./models/PurchaseOrder');
const QualityControl = require('./models/QualityControl');
const GRN = require('./models/GRN');
const Production = require('./models/Production');
const Inventory = require('./models/Inventory');
const InventoryTransaction = require('./models/InventoryTransaction');

const flushData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas / Database...');

        const resSO = await SalesOrder.deleteMany({});
        console.log(`Deleted ${resSO.deletedCount} SalesOrder records.`);

        const resAuto = await AutoSalesEntry.deleteMany({});
        console.log(`Deleted ${resAuto.deletedCount} AutoSalesEntry records.`);

        const resCustRc = await CustomerReceipt.deleteMany({});
        console.log(`Deleted ${resCustRc.deletedCount} CustomerReceipt records.`);

        const resVenPay = await VendorPayment.deleteMany({});
        console.log(`Deleted ${resVenPay.deletedCount} VendorPayment records.`);

        const resPO = await PurchaseOrder.deleteMany({});
        console.log(`Deleted ${resPO.deletedCount} PurchaseOrder records.`);

        const resQC = await QualityControl.deleteMany({});
        console.log(`Deleted ${resQC.deletedCount} QualityControl records.`);

        const resGRN = await GRN.deleteMany({});
        console.log(`Deleted ${resGRN.deletedCount} GRN records.`);

        const resProd = await Production.deleteMany({});
        console.log(`Deleted ${resProd.deletedCount} Production records.`);

        const resInv = await Inventory.deleteMany({});
        console.log(`Deleted ${resInv.deletedCount} Inventory records.`);

        const resInvTx = await InventoryTransaction.deleteMany({});
        console.log(`Deleted ${resInvTx.deletedCount} InventoryTransaction records.`);

        console.log('FLUSH COMPLETE! Kept Users/Admins, Products, Vendors, Customers & Branches.');
        process.exit(0);
    } catch (error) {
        console.error('Error flushing data:', error);
        process.exit(1);
    }
};

flushData();
