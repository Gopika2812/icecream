const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    vendorCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    contactPerson: { type: String },
    email: { type: String },
    phone: { type: String },
    address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        stateCode: { type: String, required: true },
        pinCode: { type: String, required: true }
    },
    gstinNumber: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Inactive', 'Blacklisted'], default: 'Active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
