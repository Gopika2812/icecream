const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    transactionType: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'], required: true },
    quantity: { type: Number, required: true }, // positive for IN, negative/positive for ADJUSTMENT, etc.
    referenceType: { type: String, enum: ['GRN', 'MANUAL', 'PRODUCTION'], required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId }, // e.g. GRN ID
    remarks: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
