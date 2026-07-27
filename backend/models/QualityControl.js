const mongoose = require('mongoose');

const qcItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    passedQty: { type: Number, required: true },
    damagedQty: { type: Number, required: true },
    batchNumber: { type: String }, // Auto-generated
    mrp: { type: Number },
    manufacturingDate: { type: Date },
    expiryDate: { type: Date },
    temperature: { type: Number }, // Moved to per-product
    remarks: { type: String }
}, { _id: false });

const qualityControlSchema = new mongoose.Schema({
    qcNumber: { type: String, required: true, unique: true },
    grnReference: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    checkedDate: { type: Date, default: Date.now },
    temperature: { type: Number }, // Keep optional overall temperature fallback
    items: [qcItemSchema],
    status: { type: String, enum: ['Passed', 'Failed', 'Partial'], default: 'Passed' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('QualityControl', qualityControlSchema);
