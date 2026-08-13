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

    // 1. Recalculate Recipe Cost for all Mix Products (Raw materials cost per 1 Liter Mix)
    for (const prod of products) {
      if (Array.isArray(prod.rawMaterials) && prod.rawMaterials.length > 0) {
        let recipeCostPerLiter = 0;
        prod.rawMaterials.forEach(rm => {
          const rmId = (rm.product?._id || rm.product || '').toString();
          const rmObj = prodMap[rmId];
          const price = getPrice(rmObj);
          recipeCostPerLiter += (parseFloat(rm.quantity || 0) * price);
        });

        if (recipeCostPerLiter > 0) {
          const formatted = Number(recipeCostPerLiter.toFixed(2));
          await Product.findByIdAndUpdate(prod._id, { costPrice: formatted });
          console.log(`Updated Mix Product [${prod.name}] costPrice -> ₹${formatted} / Ltr`);
          prod.costPrice = formatted;
          prodMap[(prod._id || prod.id).toString()].costPrice = formatted;
        }
      }
    }

    // 2. Recalculate Unit Cost for Completed Production Runs (Mix Raw Materials Cost + Packaging Material Cost / Produced Yield)
    const completedRuns = await Production.find({ status: { $in: ['QC_PASSED', 'COMPLETED'] } });
    console.log(`Found ${completedRuns.length} completed production runs.`);

    for (const run of completedRuns) {
      let totalMixRawMaterialCost = 0;
      let totalPackagingMaterialCost = 0;

      // Raw materials used directly in run
      if (Array.isArray(run.rawMaterialsUsed)) {
        run.rawMaterialsUsed.forEach(rm => {
          const rmId = (rm.product?._id || rm.product || '').toString();
          const rmObj = prodMap[rmId];
          const price = getPrice(rmObj);
          totalMixRawMaterialCost += (parseFloat(rm.quantityUsed || 0) * price);
        });
      }

      // Prepared mix allocated to run
      if (run.mixProduct) {
        const mixId = (run.mixProduct._id || run.mixProduct).toString();
        const mixObj = prodMap[mixId];
        const mixPricePerLiter = getPrice(mixObj);
        const mixLiters = parseFloat(run.mixLiters || 4);
        totalMixRawMaterialCost += (mixLiters * mixPricePerLiter);
      }

      // Packaging materials used in run
      if (Array.isArray(run.packagingMaterialsUsed)) {
        run.packagingMaterialsUsed.forEach(pkg => {
          const pkgId = (pkg.product?._id || pkg.product || '').toString();
          const pkgObj = prodMap[pkgId];
          const price = getPrice(pkgObj);
          totalPackagingMaterialCost += (parseFloat(pkg.quantityRequested || 0) * price);
        });
      }

      const totalBatchCost = totalMixRawMaterialCost + totalPackagingMaterialCost;
      const yieldVal = parseFloat(run.producedPieces || run.passedPieces || run.totalPieces || 1);
      const unitCostPerPiece = yieldVal > 0 ? Number((totalBatchCost / yieldVal).toFixed(2)) : 0;

      await Production.findByIdAndUpdate(run._id, { productionUnitCost: unitCostPerPiece });
      console.log(`Updated Production Run [${run.productionNumber || run._id}] -> Mix Raw Material Cost: ₹${totalMixRawMaterialCost.toFixed(2)}, Packaging Cost: ₹${totalPackagingMaterialCost.toFixed(2)} | Unit Cost: ₹${unitCostPerPiece} / Pcs`);

      const targetProdId = run.finishedGoodProduct?._id || run.finishedGoodProduct || run.mixProduct?._id || run.mixProduct;
      if (targetProdId) {
        await Product.findByIdAndUpdate(targetProdId, { costPrice: unitCostPerPiece });
        console.log(`Updated Target Product [${targetProdId}] costPrice -> ₹${unitCostPerPiece} / Pcs`);
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
