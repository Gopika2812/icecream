const mongoose = require('mongoose');

const vendorPaymentSchema = new mongoose.Schema({
    paymentNo: { type: String, required: true, unique: true },
    paymentDate: { type: Date, default: Date.now },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque'], default: 'Bank Transfer' },
    referenceNo: { type: String },
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('VendorPayment', vendorPaymentSchema);
