const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Production = require('./models/Production');
const Product = require('./models/Product');

async function recalculate() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/icecream-erp';
    console.log('Connecting to MongoDB...', mongoUri);
    await mongoose.connect(mongoUri);

    const products = await Product.find({});
    console.log(`Found ${products.length} products in DB.`);

    const prodMap = {};
    products.forEach(p => {
      prodMap[(p._id || p.id).toString()] = p;
    });

    const getPrice = (pObj) => {
      if (!pObj) return 0;
      return parseFloat(pObj.purchasePrice || pObj.costPrice || pObj.wholesalePrice || 0);
    };

    // 1. Recalculate Recipe Cost for all Mix Products
    for (const prod of products) {
      if (Array.isArray(prod.rawMaterials) && prod.rawMaterials.length > 0) {
        let recipeCost = 0;
        prod.rawMaterials.forEach(rm => {
          const rmId = (rm.product?._id || rm.product || '').toString();
          const rmObj = prodMap[rmId];
          const price = getPrice(rmObj);
          recipeCost += (parseFloat(rm.quantity || 0) * price);
        });

        if (recipeCost > 0) {
          await Product.findByIdAndUpdate(prod._id, { costPrice: Number(recipeCost.toFixed(2)) });
          console.log(`Updated Mix Product [${prod.name}] costPrice -> ₹${recipeCost.toFixed(2)}`);
          prod.costPrice = Number(recipeCost.toFixed(2));
          prodMap[(prod._id || prod.id).toString()].costPrice = Number(recipeCost.toFixed(2));
        }
      }
    }

    // 2. Recalculate Production Unit Cost for all Completed Production Runs
    const completedRuns = await Production.find({ status: { $in: ['QC_PASSED', 'COMPLETED'] } });
    console.log(`Found ${completedRuns.length} completed production runs.`);

    for (const run of completedRuns) {
      let totalMaterialCost = 0;

      if (Array.isArray(run.rawMaterialsUsed)) {
        run.rawMaterialsUsed.forEach(rm => {
          const rmId = (rm.product?._id || rm.product || '').toString();
          const rmObj = prodMap[rmId];
          const price = getPrice(rmObj);
          totalMaterialCost += (parseFloat(rm.quantityUsed || 0) * price);
        });
      }

      if (Array.isArray(run.packagingMaterialsUsed)) {
        run.packagingMaterialsUsed.forEach(pkg => {
          const pkgId = (pkg.product?._id || pkg.product || '').toString();
          const pkgObj = prodMap[pkgId];
          const price = getPrice(pkgObj);
          totalMaterialCost += (parseFloat(pkg.quantityRequested || 0) * price);
        });
      }

      // If finished goods uses mix product:
      if (run.mixProduct) {
        const mixId = (run.mixProduct._id || run.mixProduct).toString();
        const mixObj = prodMap[mixId];
        const mixPrice = getPrice(mixObj);
        const mixLiters = parseFloat(run.mixLiters || 4);
        totalMaterialCost += (mixLiters * mixPrice);
      }

      const yieldVal = parseFloat(run.producedPieces || run.passedPieces || run.totalPieces || 1);
      const unitCost = yieldVal > 0 ? Number((totalMaterialCost / yieldVal).toFixed(2)) : 0;

      await Production.findByIdAndUpdate(run._id, { productionUnitCost: unitCost });
      console.log(`Updated Production Run [${run.productionNumber || run._id}] -> Unit Cost: ₹${unitCost}`);

      const targetProdId = run.finishedGoodProduct?._id || run.finishedGoodProduct || run.mixProduct?._id || run.mixProduct;
      if (targetProdId) {
        await Product.findByIdAndUpdate(targetProdId, { costPrice: unitCost });
        console.log(`Updated Target Product [${targetProdId}] costPrice -> ₹${unitCost}`);
      }
    }

    console.log('Recalculation complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error during recalculation:', err);
    process.exit(1);
  }
}

recalculate();
