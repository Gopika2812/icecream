const ItemType = require('../models/ItemType');

// Default initial item types to seed if empty
const DEFAULT_ITEM_TYPES = [
    { name: 'Raw Material', description: 'Raw ingredients, packaging materials & consumable supplies', isMix: false },
    { name: 'Finished Goods', description: 'Manufactured final ice cream products for sale', isMix: false },
    { name: 'Mix', description: 'Composite formula mix combining raw materials for production', isMix: true }
];

exports.getItemTypes = async (req, res) => {
    try {
        let itemTypes = await ItemType.find().sort({ name: 1 });
        if (itemTypes.length === 0) {
            // Seed defaults
            await ItemType.insertMany(DEFAULT_ITEM_TYPES);
            itemTypes = await ItemType.find().sort({ name: 1 });
        }
        res.json({ success: true, data: itemTypes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createItemType = async (req, res) => {
    try {
        const { name, description, isMix } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Item Type name is required' });
        }
        const existing = await ItemType.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Item Type with this name already exists' });
        }
        const itemType = await ItemType.create({
            name: name.trim(),
            description: description || '',
            isMix: Boolean(isMix),
            createdBy: req.user ? req.user._id : undefined
        });
        res.status(201).json({ success: true, data: itemType });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateItemType = async (req, res) => {
    try {
        const { name, description, isMix, status } = req.body;
        const itemType = await ItemType.findById(req.params.id);
        if (!itemType) {
            return res.status(404).json({ success: false, message: 'Item Type not found' });
        }
        if (name && name.trim() !== itemType.name) {
            const existing = await ItemType.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                _id: { $ne: req.params.id }
            });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Another Item Type with this name already exists' });
            }
            itemType.name = name.trim();
        }
        if (description !== undefined) itemType.description = description;
        if (isMix !== undefined) itemType.isMix = Boolean(isMix);
        if (status) itemType.status = status;
        if (req.user) itemType.updatedBy = req.user._id;

        await itemType.save();
        res.json({ success: true, data: itemType });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteItemType = async (req, res) => {
    try {
        const itemType = await ItemType.findByIdAndDelete(req.params.id);
        if (!itemType) {
            return res.status(404).json({ success: false, message: 'Item Type not found' });
        }
        res.json({ success: true, message: 'Item Type deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
