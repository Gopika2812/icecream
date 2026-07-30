const mongoose = require('mongoose');

const rawMaterialUsageSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    batchNumber: { type: String, default: 'MANUAL' },
    quantityUsed: { type: Number, required: true },
    unitOfMeasure: { type: String, default: 'Units' }
}, { _id: false });

const productionSchema = new mongoose.Schema({
    productionNumber: { type: String, required: true, unique: true }, // e.g. PRD-20260730-001
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    finishedGoodProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    batchNumber: { type: String, required: true, unique: true }, // e.g. BATCH-FG-8972
    quantityBoxes: { type: Number, required: true }, // Target Box count manufactured
    piecesPerBox: { type: Number, default: 12 },
    totalPieces: { type: Number, required: true }, // quantityBoxes * piecesPerBox
    rawMaterialsUsed: [rawMaterialUsageSchema],
    
    // Store Room Batch Parameters
    temperature: { type: Number, default: -18 }, // Storage Temp (°C, e.g. -18)
    sellingPrice: { type: Number, default: 0 }, // Selling price per box
    mrp: { type: Number, default: 0 },
    manufacturingDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    qrCodeData: { type: String }, // QR payload string
    remarks: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Quality Control (QC Inspection Phase)
    qcStatus: { 
        type: String, 
        enum: ['STORE_ROOM_PENDING_QC', 'QC_PASSED', 'QC_PARTIAL_DAMAGE', 'QC_REJECTED'], 
        default: 'STORE_ROOM_PENDING_QC' 
    },
    passedBoxes: { type: Number, default: 0 },
    passedPieces: { type: Number, default: 0 },
    damagedBoxes: { type: Number, default: 0 },
    damagedPieces: { type: Number, default: 0 },
    damageReason: { type: String },
    qcInspector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    qcInspectedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Production', productionSchema);
