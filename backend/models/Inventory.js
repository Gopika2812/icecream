const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure unique combination of branch and rawMaterial
inventorySchema.index({ branch: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
