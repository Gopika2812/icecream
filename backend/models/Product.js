const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    itemCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    itemType: { type: String, enum: ['Raw Material', 'Finished Goods'], required: true },
    category: { type: String, required: true }, // e.g., Dairy, Ice Cream, Bakery, Packaging
    unitOfMeasure: { type: String, required: true }, // e.g., Ltr, Kg, Pcs, Box
    mrp: { type: Number, default: 0 },
    wholesalePrice: { type: Number, default: 0 },
    piecesPerBox: { type: Number, default: 12 }, // Box configuration e.g. 1 Box = 12 Pcs
    minimumStockLevel: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
