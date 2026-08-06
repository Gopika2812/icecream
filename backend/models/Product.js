const mongoose = require('mongoose');

const rawMaterialRecipeSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitOfMeasure: { type: String, default: 'Units' }
}, { _id: false });

const productSchema = new mongoose.Schema({
    itemCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    itemType: { type: String, required: true }, // Dynamic e.g. Raw Material, Finished Goods, Mix, or custom
    category: { type: String, required: true }, // Dynamic e.g., Dairy, Ice Cream, Bakery, Packaging
    unitOfMeasure: { type: String, required: true }, // e.g., Ltr, Kg, Pcs, Box
    hsnCode: { type: String, default: '' },
    gstPercent: { type: Number, default: 5 }, // Default 5% GST
    mrp: { type: Number, default: 0 },
    wholesalePrice: { type: Number, default: 0 },
    piecesPerBox: { type: Number, default: 12 }, // Box configuration e.g. 1 Box = 12 Pcs
    minimumStockLevel: { type: Number, default: 0 },
    rawMaterials: [rawMaterialRecipeSchema], // Composition recipe when itemType is Mix
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
