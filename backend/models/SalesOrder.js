const mongoose = require('mongoose');

const salesOrderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    batchNumber: { type: String, required: true },
    quantityBoxes: { type: Number, default: 0 },
    quantityPcs: { type: Number, required: true },
    returnedPcs: { type: Number, default: 0 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
}, { _id: false });

const salesOrderSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceType: { 
        type: String, 
        enum: ['Party Order', 'Auto Sales', 'Dealer', 'Coimbatore', 'Madurai', 'Kerala', 'Sample Products', 'Guest'], 
        required: true 
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    guestName: { type: String },
    salesOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    items: [salesOrderItemSchema],
    subTotal: { type: Number, required: true },
    taxRate: { type: Number, default: 18 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Credit'], default: 'Paid' },
    status: { type: String, enum: ['Dispatched', 'Returned', 'Completed', 'Cancelled'], default: 'Dispatched' },
    autoSalesReturnLogged: { type: Boolean, default: false },
    returnedPcs: { type: Number, default: 0 },
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
