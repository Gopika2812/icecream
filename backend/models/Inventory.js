const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    inventoryType: { 
        type: String, 
        enum: ['Store Room', 'Cold Room', 'Rejected Stock'], 
        default: 'Store Room',
        required: true 
    },
    batchNumber: { type: String, required: true }, // e.g., B-1, B-2
    purchasePrice: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    manufacturingDate: { type: Date },
    expiryDate: { type: Date },
    temperature: { type: Number }, // Logged temperature for the batch
    quantity: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure unique combination of branch, product, inventory type, and batch number
inventorySchema.index({ branch: 1, product: 1, inventoryType: 1, batchNumber: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
