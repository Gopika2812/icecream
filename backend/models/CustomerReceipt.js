const mongoose = require('mongoose');

const customerReceiptSchema = new mongoose.Schema({
    receiptNo: { type: String, required: true, unique: true },
    receiptDate: { type: Date, default: Date.now },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'], default: 'Cash' },
    referenceNo: { type: String },
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('CustomerReceipt', customerReceiptSchema);
