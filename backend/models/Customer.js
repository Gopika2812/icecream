const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    customerCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    customerType: { type: String, enum: ['Wholesale', 'Retail', 'Distributor'], default: 'Wholesale' },
    contactPerson: { type: String },
    email: { type: String },
    phone: { type: String },
    billingAddress: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        stateCode: { type: String, required: true },
        pinCode: { type: String, required: true }
    },
    shippingAddress: { type: String },
    gstinNumber: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Inactive', 'Blacklisted'], default: 'Active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
