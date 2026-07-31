const mongoose = require('mongoose');

const autoSalesItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    openingQty: { type: Number, default: 0 },
    takenQty: { type: Number, default: 0 },
    totalQty: { type: Number, default: 0 }, // openingQty + takenQty
    returnQty: { type: Number, default: 0 },
    salesQty: { type: Number, default: 0 }, // totalQty - returnQty
    unitPrice: { type: Number, default: 0 },
    totalSalesValue: { type: Number, default: 0 } // salesQty * unitPrice
}, { _id: false });

const autoSalesEntrySchema = new mongoose.Schema({
    transferNo: { type: String, required: true, unique: true },
    entryDate: { type: Date, required: true, default: Date.now },
    vehicleNo: { type: String, required: true }, // e.g. "DB 01 - DB 01"
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    incharge: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Sales Owner / Driver
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    items: [autoSalesItemSchema],
    grossSalesAmount: { type: Number, default: 0 },
    expenses: {
        dieselCost: { type: Number, default: 0 },
        maintenanceCost: { type: Number, default: 0 },
        otherCost: { type: Number, default: 0 },
        totalExpenses: { type: Number, default: 0 }
    },
    netCollection: { type: Number, default: 0 }, // grossSalesAmount - totalExpenses
    collectionBreakdown: {
        cashAmount: { type: Number, default: 0 },
        paytmAmount: { type: Number, default: 0 },
        gpayAmount: { type: Number, default: 0 },
        totalCollected: { type: Number, default: 0 },
        pendingDifference: { type: Number, default: 0 }
    },
    status: { type: String, enum: ['Open', 'Completed', 'Closed'], default: 'Completed' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('AutoSalesEntry', autoSalesEntrySchema);
