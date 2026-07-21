const mongoose = require('mongoose');

const grnItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    receivedQty: { type: Number, required: true },
    acceptedQty: { type: Number, required: true },
    rejectedQty: { type: Number, required: true },
    remarks: { type: String }
}, { _id: false });

const grnSchema = new mongoose.Schema({
    grnNumber: { type: String, required: true, unique: true },
    poReference: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    receivedDate: { type: Date, default: Date.now },
    supplierInvoiceNumber: { type: String },
    items: [grnItemSchema],
    status: { type: String, enum: ['Completed', 'Cancelled'], default: 'Completed' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('GRN', grnSchema);
