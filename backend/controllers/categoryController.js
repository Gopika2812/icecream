const Category = require('../models/Category');

// Default initial categories to seed if empty
const DEFAULT_CATEGORIES = [
    { name: 'Dairy', description: 'Milk, Cream, Butter, Milk Powder' },
    { name: 'Ice Cream', description: 'Finished Goods Ice Cream Products' },
    { name: 'Bakery', description: 'Cones, Wafers, Bakery items' },
    { name: 'Packaging', description: 'Boxes, Tubs, Cups, Wrappers, Labels' },
    { name: 'Flavors & Colors', description: 'Essences, Food Colors, Mix Ingredients' },
    { name: 'Syrups', description: 'Toppings, Syrups, Sauces' }
];

exports.getCategories = async (req, res) => {
    try {
        let categories = await Category.find().sort({ name: 1 });
        if (categories.length === 0) {
            // Seed defaults
            for (const c of DEFAULT_CATEGORIES) {
                await Category.create(c);
            }
            categories = await Category.find().sort({ name: 1 });
        }
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }
        const allCategories = await Category.find();
        const existing = allCategories.find(c => c.name && c.name.toLowerCase() === name.trim().toLowerCase());
        if (existing) {
            return res.status(400).json({ success: false, message: 'Category with this name already exists' });
        }
        const category = await Category.create({
            name: name.trim(),
            description: description || '',
            createdBy: req.user ? req.user._id : undefined
        });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { name, description, status } = req.body;
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        if (name && name.trim() !== category.name) {
            const allCategories = await Category.find();
            const existing = allCategories.find(c => c.name && c.name.toLowerCase() === name.trim().toLowerCase() && (c._id || c.id) !== req.params.id);
            if (existing) {
                return res.status(400).json({ success: false, message: 'Another category with this name already exists' });
            }
            category.name = name.trim();
        }
        if (description !== undefined) category.description = description;
        if (status) category.status = status;
        if (req.user) category.updatedBy = req.user._id;

        await category.save();
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
