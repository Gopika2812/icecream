const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    inventoryType: { 
        type: String, 
        enum: ['Store Room', 'Cold Room', 'Rejected Stock'], 
        default: 'Store Room',
        required: true 
    },
    batchNumber: { type: String, required: true },
    purchasePrice: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    manufacturingDate: { type: Date },
    expiryDate: { type: Date },
    transactionType: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'], required: true },
    quantity: { type: Number, required: true },
    referenceType: { type: String, enum: ['GRN', 'QC', 'MANUAL', 'PRODUCTION'], required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    remarks: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
