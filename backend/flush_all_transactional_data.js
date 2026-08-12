const mongoose = require('mongoose');
require('dotenv').config();

const Production = require('./models/Production');
const ProductRequisition = require('./models/ProductRequisition');
const SalesOrder = require('./models/SalesOrder');
const AutoSalesEntry = require('./models/AutoSalesEntry');
const CustomerReceipt = require('./models/CustomerReceipt');
const VendorPayment = require('./models/VendorPayment');
const PurchaseOrder = require('./models/PurchaseOrder');
const QualityControl = require('./models/QualityControl');
const GRN = require('./models/GRN');
const Inventory = require('./models/Inventory');
const InventoryTransaction = require('./models/InventoryTransaction');

const User = require('./models/User');
const Vendor = require('./models/Vendor');
const Customer = require('./models/Customer');
const Product = require('./models/Product');
const Branch = require('./models/Branch');

const runFlush = async () => {
    try {
        console.log('Connecting to MongoDB Atlas Database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        console.log('--- PRESERVING MASTER DATA ---');
        const userCount = await User.countDocuments();
        const vendorCount = await Vendor.countDocuments();
        const customerCount = await Customer.countDocuments();
        const productCount = await Product.countDocuments();
        const branchCount = await Branch.countDocuments();

        console.log(`Preserving ${userCount} Users (Superadmin credentials intact).`);
        console.log(`Preserving ${vendorCount} Vendors.`);
        console.log(`Preserving ${customerCount} Customers.`);
        console.log(`Preserving ${productCount} Products.`);
        console.log(`Preserving ${branchCount} Branches.`);

        console.log('\n--- FLUSHING ALL TRANSACTIONAL & OPERATIONAL DATA ---');
        
        const resProd = await Production.deleteMany({});
        console.log(`Deleted ${resProd.deletedCount} Production & Mix Requisition records.`);

        const resProdReq = await ProductRequisition.deleteMany({});
        console.log(`Deleted ${resProdReq.deletedCount} Product Requisition records.`);

        const resSO = await SalesOrder.deleteMany({});
        console.log(`Deleted ${resSO.deletedCount} Sales Orders & Invoices.`);

        const resAuto = await AutoSalesEntry.deleteMany({});
        console.log(`Deleted ${resAuto.deletedCount} Auto Sales Ledger records.`);

        const resCustRc = await CustomerReceipt.deleteMany({});
        console.log(`Deleted ${resCustRc.deletedCount} Customer Receipts & Ledgers.`);

        const resVenPay = await VendorPayment.deleteMany({});
        console.log(`Deleted ${resVenPay.deletedCount} Vendor Payments & Ledgers.`);

        const resPO = await PurchaseOrder.deleteMany({});
        console.log(`Deleted ${resPO.deletedCount} Purchase Orders & Invoices.`);

        const resQC = await QualityControl.deleteMany({});
        console.log(`Deleted ${resQC.deletedCount} Quality Control records.`);

        const resGRN = await GRN.deleteMany({});
        console.log(`Deleted ${resGRN.deletedCount} Goods Received Notes (GRN).`);

        const resInv = await Inventory.deleteMany({});
        console.log(`Deleted ${resInv.deletedCount} Inventory Stock records.`);

        const resInvTx = await InventoryTransaction.deleteMany({});
        console.log(`Deleted ${resInvTx.deletedCount} Inventory Transaction logs.`);

        console.log('\n========================================');
        console.log('SUCCESS: All operational records flushed clean!');
        console.log('Kept: SuperAdmin Credentials, Vendors, Customers, Products & Branches.');
        console.log('========================================');

        process.exit(0);
    } catch (err) {
        console.error('Error during data flush:', err);
        process.exit(1);
    }
};

runFlush();
