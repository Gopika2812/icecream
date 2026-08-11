const Product = require('./models/Product');
const Inventory = require('./models/Inventory');

async function seedPopcorn() {
    console.log("=== SEEDING POPCORN SAMPLE DATA ===");

    // 1. RAW MATERIALS
    const milk = await Product.create({
        itemCode: 'RM-MILK-001',
        name: 'Fresh Whole Dairy Milk 3.5% FAT',
        itemType: 'Raw Material',
        category: 'Dairy',
        unitOfMeasure: 'Litre',
        wholesalePrice: 48,
        mrp: 52,
        gstPercent: 5
    });

    const cream = await Product.create({
        itemCode: 'RM-CREAM-001',
        name: 'Heavy Fresh Cream 35% FAT',
        itemType: 'Raw Material',
        category: 'Dairy',
        unitOfMeasure: 'Litre',
        wholesalePrice: 180,
        mrp: 200,
        gstPercent: 5
    });

    const sugar = await Product.create({
        itemCode: 'RM-SUGAR-001',
        name: 'Refined Sugar Granules',
        itemType: 'Raw Material',
        category: 'Dairy',
        unitOfMeasure: 'Kg',
        wholesalePrice: 42,
        mrp: 46,
        gstPercent: 5
    });

    const popcornSyrup = await Product.create({
        itemCode: 'RM-FLV-POPCORN',
        name: 'Buttered Popcorn Flavor Syrup',
        itemType: 'Raw Material',
        category: 'Flavors & Extracts',
        unitOfMeasure: 'Litre',
        wholesalePrice: 650,
        mrp: 750,
        gstPercent: 12
    });

    const popcornCrunch = await Product.create({
        itemCode: 'RM-CRUNCH-POPCORN',
        name: 'Caramelized Popcorn Crunch Inclusions',
        itemType: 'Raw Material',
        category: 'Inclusions',
        unitOfMeasure: 'Kg',
        wholesalePrice: 320,
        mrp: 380,
        gstPercent: 12
    });

    const stabilizer = await Product.create({
        itemCode: 'RM-STAB-001',
        name: 'Ice Cream Stabilizer & Emulsifier Blend',
        itemType: 'Raw Material',
        category: 'Additives',
        unitOfMeasure: 'Kg',
        wholesalePrice: 450,
        mrp: 500,
        gstPercent: 12
    });

    console.log("Raw materials seeded successfully!");

    // 2. MIX FORMULA MASTER (Per 1 Liter)
    const popcornMix = await Product.create({
        itemCode: 'MIX-POPCORN-001',
        name: 'Caramel Popcorn Ice Cream Base Mix',
        itemType: 'Mix',
        category: 'Ice Cream Mixes',
        unitOfMeasure: 'Litre',
        wholesalePrice: 0,
        mrp: 0,
        rawMaterials: [
            { product: milk._id || milk.id, quantity: 0.55, unitOfMeasure: 'Litre' },
            { product: cream._id || cream.id, quantity: 0.25, unitOfMeasure: 'Litre' },
            { product: sugar._id || sugar.id, quantity: 0.15, unitOfMeasure: 'Kg' },
            { product: popcornSyrup._id || popcornSyrup.id, quantity: 0.03, unitOfMeasure: 'Litre' },
            { product: popcornCrunch._id || popcornCrunch.id, quantity: 0.02, unitOfMeasure: 'Kg' },
            { product: stabilizer._id || stabilizer.id, quantity: 0.005, unitOfMeasure: 'Kg' }
        ]
    });

    console.log("Popcorn Mix Formula Master seeded!");

    // 3. PACKAGING MATERIALS
    const tub = await Product.create({
        itemCode: 'PKG-TUB-POPCORN-250',
        name: 'Popcorn Printed Paper Tub 250ml',
        itemType: 'Packing Material',
        category: 'Packaging',
        unitOfMeasure: 'Pcs',
        wholesalePrice: 3.5,
        mrp: 4.0,
        gstPercent: 18
    });

    const lid = await Product.create({
        itemCode: 'PKG-LID-POPCORN-250',
        name: 'Paper Tub Lid 250ml (Popcorn)',
        itemType: 'Packing Material',
        category: 'Packaging',
        unitOfMeasure: 'Pcs',
        wholesalePrice: 1.2,
        mrp: 1.5,
        gstPercent: 18
    });

    const spoon = await Product.create({
        itemCode: 'PKG-SPOON-001',
        name: 'Biodegradable Wooden Ice Cream Spoon',
        itemType: 'Packing Material',
        category: 'Packaging',
        unitOfMeasure: 'Pcs',
        wholesalePrice: 0.35,
        mrp: 0.5,
        gstPercent: 18
    });

    const box = await Product.create({
        itemCode: 'PKG-BOX-24',
        name: 'Corrugated Outer Master Box (24 Tubs Capacity)',
        itemType: 'Packing Material',
        category: 'Packaging',
        unitOfMeasure: 'Pcs',
        wholesalePrice: 18.0,
        mrp: 22.0,
        gstPercent: 18
    });

    console.log("Packaging materials seeded!");

    // 4. FINISHED GOODS PRODUCT
    const finishedGood = await Product.create({
        itemCode: 'FG-POPCORN-250',
        name: 'Caramel Popcorn Crunch Ice Cream Tub 250ml',
        itemType: 'Finished Goods',
        category: 'Tubs & Cups',
        unitOfMeasure: 'Box',
        wholesalePrice: 1080, // 24 Pcs * ₹45
        mrp: 1440,           // 24 Pcs * ₹60
        piecesPerBox: 24,
        gstPercent: 18
    });

    console.log("Popcorn Finished Good Product seeded!");

    // 5. INITIAL STORE ROOM STOCK INVENTORY
    const rawItems = [
        { id: milk._id || milk.id, qty: 1000 },
        { id: cream._id || cream.id, qty: 500 },
        { id: sugar._id || sugar.id, qty: 500 },
        { id: popcornSyrup._id || popcornSyrup.id, qty: 100 },
        { id: popcornCrunch._id || popcornCrunch.id, qty: 100 },
        { id: stabilizer._id || stabilizer.id, qty: 50 },
        { id: tub._id || tub.id, qty: 5000 },
        { id: lid._id || lid.id, qty: 5000 },
        { id: spoon._id || spoon.id, qty: 5000 },
        { id: box._id || box.id, qty: 250 }
    ];

    for (const item of rawItems) {
        await Inventory.create({
            product: item.id,
            currentStock: item.qty,
            reorderLevel: 50,
            unitOfMeasure: 'Units'
        });
    }

    console.log("=== POPCORN SAMPLE DATA SEEDED SUCCESSFULLY ===");
}

seedPopcorn().catch(console.error);
