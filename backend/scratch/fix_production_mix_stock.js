const mongoose = require('mongoose');
require('dotenv').config();
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Production = require('../models/Production');
const Product = require('../models/Product');

async function fixProductionMixStock() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('--- Inspecting Mix Products & Production Batches ---');
  const mixProducts = await Product.find({ itemType: 'Mix' });
  console.log('Mix Products:', mixProducts.map(p => ({ id: p._id, name: p.name })));

  const prods = await Production.find({});
  console.log('Productions:', prods.map(p => ({
    id: p._id,
    num: p.productionNumber,
    type: p.requisitionType,
    reqQty: p.mixLiters || p.totalPieces,
    prodPieces: p.producedPieces,
    status: p.status
  })));

  for (const p of prods) {
    if (p.requisitionType === 'MIX_REQUISITION') {
      const fgId = p.finishedGoodProduct?._id || p.finishedGoodProduct;
      const targetReqQty = p.mixLiters || p.totalPieces || 5;
      const actualYield = p.producedPieces !== undefined ? p.producedPieces : 4;

      console.log(`Fixing Mix Requisition ${p.productionNumber} (Target Req: ${targetReqQty}, Actual Yield: ${actualYield})...`);

      // Update Production record
      await Production.findByIdAndUpdate(p._id, {
        producedPieces: actualYield,
        totalPieces: targetReqQty,
        mixLiters: targetReqQty,
        status: 'QC_PASSED',
        qcStatus: 'PASSED'
      });

      // Update Store Room Inventory document
      if (fgId) {
        await Inventory.deleteMany({ product: fgId, inventoryType: 'Store Room' });
        await Inventory.create({
          branch: p.branch,
          product: fgId,
          inventoryType: 'Store Room',
          quantity: actualYield,
          batchNumber: p.batchNumber || 'BATCH-1',
          lastUpdated: Date.now()
        });
        console.log(`✅ Set Store Room Inventory for product ${fgId} to quantity = ${actualYield}`);

        // Update InventoryTransaction records - keep only 1 clean transaction for this production
        await InventoryTransaction.deleteMany({ product: fgId, referenceType: 'PRODUCTION_MIX' });
        await InventoryTransaction.create({
          branch: p.branch,
          product: fgId,
          inventoryType: 'Store Room',
          batchNumber: p.batchNumber || 'BATCH-1',
          transactionType: 'IN',
          quantity: actualYield,
          requestedQuantity: targetReqQty,
          referenceType: 'PRODUCTION_MIX',
          remarks: `Prepared Mix Inwarded: ${actualYield} Liters (${targetReqQty} Liters Requested) for Requisition ${p.productionNumber || 'PR-01'}`,
          performedBy: p.performedBy
        });
        console.log(`✅ Created clean InventoryTransaction for ${fgId}: quantity = ${actualYield}, requestedQuantity = ${targetReqQty}`);
      }
    }
  }

  console.log('--- Verification ---');
  const invs = await Inventory.find({ inventoryType: 'Store Room' });
  console.log('Store Room Inventories:', invs.map(i => ({ product: i.product, qty: i.quantity })));

  const txs = await InventoryTransaction.find({ referenceType: 'PRODUCTION_MIX' });
  console.log('Mix Transactions:', txs.map(t => ({ product: t.product, qty: t.quantity, reqQty: t.requestedQuantity, remarks: t.remarks })));

  process.exit(0);
}

fixProductionMixStock();
