require('dotenv').config();
const mongoose = require('mongoose');

const dropIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const db = mongoose.connection.db;
        const collection = db.collection('inventories');
        
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes);
        
        // Drop branch_1_product_1_inventoryType_1
        const hasOldInventoryTypeIndex = indexes.some(idx => idx.name === 'branch_1_product_1_inventoryType_1');
        if (hasOldInventoryTypeIndex) {
            await collection.dropIndex('branch_1_product_1_inventoryType_1');
            console.log('Successfully dropped old index: branch_1_product_1_inventoryType_1');
        } else {
            console.log('Index branch_1_product_1_inventoryType_1 not found.');
        }
        
        console.log('Cleaned up outdated indexes!');
        process.exit(0);
    } catch (err) {
        console.error('Error dropping index:', err);
        process.exit(1);
    }
};

dropIndex();
