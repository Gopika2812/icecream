const Production = require('../models/Production');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Product = require('../models/Product');
const Branch = require('../models/Branch');

// @desc    Get all production batches
// @route   GET /api/v1/production
// @access  Private
exports.getProductionBatches = async (req, res) => {
    try {
        const { branchId } = req.query;
        let query = {};
        if (branchId) query.branch = branchId;

        const productions = await Production.find(query);
        const products = await Product.find({});
        const productMap = {};
        products.forEach(p => {
            const pId = p._id || p.id;
            if (pId) productMap[pId.toString()] = p;
        });

        const enrichedProductions = productions.map(prod => {
            const pObj = typeof prod.toObject === 'function' ? prod.toObject() : { ...prod };
            
            // Resolve finishedGoodProduct
            const fgId = pObj.finishedGoodProduct?._id || pObj.finishedGoodProduct;
            if (fgId && productMap[fgId.toString()]) {
                pObj.finishedGoodProduct = productMap[fgId.toString()];
            }
            
            // Resolve rawMaterialsUsed
            if (Array.isArray(pObj.rawMaterialsUsed)) {
                pObj.rawMaterialsUsed = pObj.rawMaterialsUsed.map(rm => {
                    const prodId = rm.product?._id || rm.product;
                    const prodDetails = prodId ? productMap[prodId.toString()] : null;
                    return {
                        ...rm,
                        product: prodDetails ? { 
                            _id: prodDetails._id, 
                            name: prodDetails.name, 
                            itemCode: prodDetails.itemCode, 
                            unitOfMeasure: prodDetails.unitOfMeasure 
                        } : (typeof rm.product === 'object' ? rm.product : { name: rm.productName || 'Raw Material' })
                    };
                });
            }

            // Resolve packagingMaterialsUsed
            if (Array.isArray(pObj.packagingMaterialsUsed)) {
                pObj.packagingMaterialsUsed = pObj.packagingMaterialsUsed.map(pkg => {
                    const prodId = pkg.product?._id || pkg.product;
                    const prodDetails = prodId ? productMap[prodId.toString()] : null;
                    return {
                        ...pkg,
                        product: prodDetails ? { 
                            _id: prodDetails._id, 
                            name: prodDetails.name, 
                            itemCode: prodDetails.itemCode, 
                            unitOfMeasure: prodDetails.unitOfMeasure 
                        } : (typeof pkg.product === 'object' ? pkg.product : { name: pkg.productName || 'Packaging Item' })
                    };
                });
            }

            return pObj;
        });

        res.json({ success: true, data: enrichedProductions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new production batch & store in Factory Store Room (Pending QC)
// @route   POST /api/v1/production
// @access  Private
exports.createProductionBatch = async (req, res) => {
    try {
        const {
            requisitionType,
            branchId,
            finishedGoodProduct,
            mixProduct,
            mixLiters,
            quantityBoxes,
            piecesPerBox,
            totalPieces: reqTotalPieces,
            rawMaterialsUsed,
            packagingMaterialsUsed,
            essenceMaterialsUsed,
            temperature,
            sellingPrice,
            mrp,
            manufacturingDate,
            expiryDate,
            remarks
        } = req.body;

        // Resolve branch
        let targetBranch = branchId || req.user?.branch;
        if (!targetBranch) {
            const firstBranch = await Branch.findOne();
            if (firstBranch) targetBranch = firstBranch._id;
        }

        const allProds = await Production.find({});
        const totalBatches = allProds.length;
        const productionNumber = `PR-${(totalBatches + 1).toString().padStart(2, '0')}`;
        const batchNumber = req.body.batchNumber || `BATCH-${totalBatches + 1}`;

        const isMixReq = requisitionType === 'MIX_REQUISITION';
        let fgProductObj = null;
        let pPerBox = parseInt(piecesPerBox) || 12;
        let totalPieces = parseInt(reqTotalPieces) || 0;
        let boxCount = parseFloat(quantityBoxes) || 0;
        let targetMixProduct = mixProduct;

        if (isMixReq) {
            // Mix Preparation Requisition
            if (typeof mixProduct === 'object' && mixProduct.name) {
                // Handle new mix creation
                let existingMix = await Product.findOne({ name: mixProduct.name });
                if (!existingMix) {
                    existingMix = await Product.create({
                        name: mixProduct.name,
                        itemCode: mixProduct.itemCode || `MIX-${Date.now().toString().slice(-4)}`,
                        itemType: 'Mix',
                        unitOfMeasure: 'Litre',
                        rawMaterials: rawMaterialsUsed || []
                    });
                }
                targetMixProduct = existingMix._id || existingMix.id;
                fgProductObj = existingMix;
            } else if (targetMixProduct) {
                fgProductObj = await Product.findById(targetMixProduct);
            }

            if (!fgProductObj) return res.status(400).json({ success: false, message: 'Mix product selection is required.' });

            totalPieces = parseFloat(mixLiters) || 1;
            boxCount = 1;
        } else {
            // Finished Goods Assembly Requisition
            if (!finishedGoodProduct) return res.status(400).json({ success: false, message: 'Finished Good product selection is required.' });
            fgProductObj = await Product.findById(finishedGoodProduct);
            if (!fgProductObj) return res.status(404).json({ success: false, message: 'Finished Good Product not found.' });

            pPerBox = parseInt(fgProductObj.piecesPerBox) || parseInt(piecesPerBox) || 12;

            if (totalPieces <= 0 && boxCount > 0) {
                totalPieces = boxCount * pPerBox;
            } else if (totalPieces > 0 && boxCount <= 0) {
                boxCount = Number((totalPieces / pPerBox).toFixed(2));
            }

            if (totalPieces <= 0) return res.status(400).json({ success: false, message: 'Valid Target Output in Pcs is required.' });
        }

        const allStoreInv = await Inventory.find({ inventoryType: 'Store Room' });
        const getStoreRoomStockSum = (prodId) => {
            const idStr = (prodId?._id || prodId?.id || prodId || '').toString();
            return allStoreInv
                .filter(i => {
                    const pId = typeof i.product === 'object' ? (i.product._id || i.product.id) : i.product;
                    return pId?.toString() === idStr;
                })
                .reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0);
        };

        // STRICT PREPARED MIX STORE ROOM STOCK VALIDATION FOR FG ASSEMBLY
        if (!isMixReq && targetMixProduct) {
            const mixId = typeof targetMixProduct === 'object' ? (targetMixProduct._id || targetMixProduct.id) : targetMixProduct;
            const mixProdObj = await Product.findById(mixId);
            const mixName = mixProdObj ? mixProdObj.name : 'Prepared Mix';
            const neededLiters = parseFloat(mixLiters) || Number((totalPieces / (pPerBox || 12)).toFixed(2)) || 1;

            const availMixQty = getStoreRoomStockSum(mixId);

            if (availMixQty < neededLiters) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot submit FG Assembly Requisition: Prepared Mix Product "${mixName}" is OUT OF STOCK / Insufficient in Store Room! (Available: ${availMixQty} Liters, Needed: ${neededLiters} Liters). Please run Mix Preparation first!`
                });
            }
        }

        // STRICT STORE ROOM STOCK VALIDATION FOR RAW MATERIALS
        const processedRawMaterials = [];
        if (Array.isArray(rawMaterialsUsed)) {
            for (const rm of rawMaterialsUsed) {
                const qtyUsed = parseFloat(rm.quantityUsed) || 0;
                if (qtyUsed > 0 && rm.product) {
                    const rmProdId = rm.product._id || rm.product;
                    const rmProd = await Product.findById(rmProdId);
                    const rmName = rmProd ? rmProd.name : 'Raw Material';

                    const availQty = getStoreRoomStockSum(rmProdId);
                    if (availQty < qtyUsed) {
                        return res.status(400).json({
                            success: false,
                            message: `Cannot submit requisition: Raw Material "${rmName}" is OUT OF STOCK / Insufficient in Store Room! (Available Stock: ${availQty} ${rmProd?.unitOfMeasure || ''}, Requested: ${qtyUsed}). Submission blocked!`
                        });
                    }

                    processedRawMaterials.push({
                        product: rmProdId,
                        productName: rmProd ? rmProd.name : '',
                        batchNumber: rm.batchNumber || 'STORE-RM',
                        quantityUsed: qtyUsed,
                        unitOfMeasure: rmProd ? rmProd.unitOfMeasure : 'Units'
                    });
                }
            }
        }

        // STRICT STORE ROOM STOCK VALIDATION FOR PACKAGING MATERIALS
        const processedPackagingMaterials = [];
        if (Array.isArray(packagingMaterialsUsed)) {
            for (const pkg of packagingMaterialsUsed) {
                const qtyReq = parseFloat(pkg.quantityRequested) || 0;
                if (qtyReq > 0 && pkg.product) {
                    const pkgProdId = pkg.product._id || pkg.product;
                    const pkgProd = await Product.findById(pkgProdId);
                    const pkgName = pkgProd ? pkgProd.name : 'Packaging Material';

                    const availQty = getStoreRoomStockSum(pkgProdId);
                    if (availQty < qtyReq) {
                        return res.status(400).json({
                            success: false,
                            message: `Cannot submit requisition: Packaging Material "${pkgName}" is OUT OF STOCK / Insufficient in Store Room! (Available Stock: ${availQty} ${pkgProd?.unitOfMeasure || ''}, Requested: ${qtyReq}). Submission blocked!`
                        });
                    }

                    processedPackagingMaterials.push({
                        product: pkgProdId,
                        productName: pkgProd ? pkgProd.name : '',
                        quantityRequested: qtyReq,
                        unitOfMeasure: pkgProd ? pkgProd.unitOfMeasure : 'Pcs'
                    });
                }
            }
        }

        // STRICT STORE ROOM STOCK VALIDATION FOR ESSENCE / INCLUSIONS
        const processedEssenceMaterials = [];
        if (Array.isArray(essenceMaterialsUsed)) {
            for (const ess of essenceMaterialsUsed) {
                const qtyReq = parseFloat(ess.quantityRequested) || 0;
                if (qtyReq > 0 && ess.product) {
                    const essProdId = (ess.product._id || ess.product).toString();

                    // Skip if already in packaging or raw materials to avoid duplicates
                    const isDuplicatePkg = processedPackagingMaterials.some(p => (p.product?._id || p.product || '').toString() === essProdId);
                    const isDuplicateRm = processedRawMaterials.some(r => (r.product?._id || r.product || '').toString() === essProdId);
                    if (isDuplicatePkg || isDuplicateRm) continue;

                    const essProd = await Product.findById(essProdId);
                    const essName = essProd ? essProd.name : 'Essence / Add-on Item';

                    const availQty = getStoreRoomStockSum(essProdId);
                    if (availQty < qtyReq) {
                        return res.status(400).json({
                            success: false,
                            message: `Cannot submit requisition: Item "${essName}" is OUT OF STOCK / Insufficient in Store Room! (Available Stock: ${availQty} ${essProd?.unitOfMeasure || ''}, Requested: ${qtyReq}). Submission blocked!`
                        });
                    }

                    processedEssenceMaterials.push({
                        product: essProdId,
                        productName: essProd ? essProd.name : '',
                        quantityRequested: qtyReq,
                        unitOfMeasure: essProd ? essProd.unitOfMeasure : 'Units'
                    });
                }
            }
        }

        const fgSellingPrice = parseFloat(sellingPrice) || fgProductObj.wholesalePrice || 0;
        const fgMrp = parseFloat(mrp) || fgProductObj.mrp || 0;
        const fgTemp = parseFloat(temperature) !== undefined ? parseFloat(temperature) : -18;
        const mfgDate = manufacturingDate ? new Date(manufacturingDate) : new Date();
        const expDate = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

        // Save Production Requisition Record
        const productionBatch = await Production.create({
            productionNumber,
            requisitionType: isMixReq ? 'MIX_REQUISITION' : 'FG_ASSEMBLY_REQUISITION',
            branch: targetBranch,
            finishedGoodProduct: fgProductObj._id || fgProductObj.id,
            mixProduct: mixProduct || null,
            mixLiters: parseFloat(mixLiters) || 0,
            batchNumber,
            quantityBoxes: boxCount,
            piecesPerBox: pPerBox,
            totalPieces,
            rawMaterialsUsed: processedRawMaterials,
            packagingMaterialsUsed: processedPackagingMaterials,
            essenceMaterialsUsed: processedEssenceMaterials,
            temperature: fgTemp,
            sellingPrice: fgSellingPrice,
            mrp: fgMrp,
            manufacturingDate: mfgDate,
            expiryDate: expDate,
            status: 'PENDING_STORE_ROOM_DISPATCH',
            qcStatus: 'STORE_ROOM_PENDING_QC',
            remarks: remarks || (isMixReq ? 'Mix Preparation Requisition' : 'Finished Goods Assembly Requisition'),
            performedBy: req.user?._id
        });

        res.status(201).json({
            success: true,
            data: productionBatch,
            message: `${isMixReq ? 'Mix Preparation' : 'Finished Goods Assembly'} Requisition ID ${productionNumber} submitted to Factory Store Room!`
        });
    } catch (error) {
        console.error('Error creating production batch', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Store Room Dispatches Stock (Auto-inwards Mix Product if MIX_REQUISITION)
// @route   POST /api/v1/production/:id/dispatch
// @access  Private
exports.dispatchStock = async (req, res) => {
    try {
        const { id } = req.params;
        const production = await Production.findById(id);
        if (!production) return res.status(404).json({ success: false, message: 'Production Requisition not found.' });

        if (production.status === 'DISPATCHED_TO_PRODUCTION' || production.status === 'QC_PASSED') {
            return res.status(400).json({ success: false, message: 'Stock for this Requisition has already been dispatched.' });
        }

        const targetBranch = production.branch || req.user?.branch;
        const prodIdCode = production.productionNumber || `PR-${id.slice(-4)}`;
        const isMixReq = production.requisitionType === 'MIX_REQUISITION';

        const allStoreInv = await Inventory.find({ inventoryType: 'Store Room' });
        const deductStoreRoomStock = async (prodId, quantityToDeduct) => {
            const idStr = (prodId?._id || prodId?.id || prodId || '').toString();
            let remainingToDeduct = parseFloat(quantityToDeduct) || 0;
            if (remainingToDeduct <= 0) return;

            const matchingInvs = allStoreInv.filter(i => {
                const pId = typeof i.product === 'object' ? (i.product._id || i.product.id) : i.product;
                return pId?.toString() === idStr;
            });

            for (const inv of matchingInvs) {
                if (remainingToDeduct <= 0) break;
                const currentQty = parseFloat(inv.quantity) || 0;
                if (currentQty <= 0) continue;

                const deductFromThis = Math.min(currentQty, remainingToDeduct);
                const newQty = currentQty - deductFromThis;
                remainingToDeduct -= deductFromThis;

                const invId = inv._id || inv.id;
                await Inventory.findByIdAndUpdate(invId, {
                    quantity: newQty,
                    lastUpdated: Date.now()
                });
                inv.quantity = newQty;
            }
        };

        // 1. Deduct Raw Materials from Store Room Inventory
        if (Array.isArray(production.rawMaterialsUsed)) {
            for (const rm of production.rawMaterialsUsed) {
                const qtyUsed = parseFloat(rm.quantityUsed) || 0;
                if (qtyUsed > 0 && rm.product) {
                    const rmProdId = rm.product._id || rm.product;
                    await deductStoreRoomStock(rmProdId, qtyUsed);

                    await InventoryTransaction.create({
                        branch: targetBranch,
                        product: rmProdId,
                        inventoryType: 'Store Room',
                        batchNumber: rm.batchNumber || 'STORE-RM',
                        transactionType: 'OUT',
                        quantity: qtyUsed,
                        referenceType: 'PRODUCTION',
                        remarks: `Issued Raw Material to Production for Requisition ${prodIdCode}`,
                        performedBy: req.user?._id
                    });
                }
            }
        }

        // 2. Deduct Packaging Materials from Store Room Inventory
        if (Array.isArray(production.packagingMaterialsUsed)) {
            for (const pkg of production.packagingMaterialsUsed) {
                const qtyReq = parseFloat(pkg.quantityRequested) || 0;
                if (qtyReq > 0 && pkg.product) {
                    const pkgProdId = pkg.product._id || pkg.product;
                    await deductStoreRoomStock(pkgProdId, qtyReq);

                    await InventoryTransaction.create({
                        branch: targetBranch,
                        product: pkgProdId,
                        inventoryType: 'Store Room',
                        transactionType: 'OUT',
                        quantity: qtyReq,
                        referenceType: 'PRODUCTION',
                        remarks: `Issued Packaging Material to Production for Requisition ${prodIdCode}`,
                        performedBy: req.user?._id
                    });
                }
            }
        }

        // 3. Deduct Essence / Fruits / Nuts / Add-ons from Store Room Inventory
        if (Array.isArray(production.essenceMaterialsUsed)) {
            for (const ess of production.essenceMaterialsUsed) {
                const qtyReq = parseFloat(ess.quantityRequested) || 0;
                if (qtyReq > 0 && ess.product) {
                    const essProdId = (ess.product._id || ess.product).toString();

                    // Skip if already deducted under packaging or raw materials
                    const isAlreadyDeductedInPkg = (production.packagingMaterialsUsed || []).some(pkg => (pkg.product?._id || pkg.product || '').toString() === essProdId);
                    const isAlreadyDeductedInRm = (production.rawMaterialsUsed || []).some(rm => (rm.product?._id || rm.product || '').toString() === essProdId);
                    if (isAlreadyDeductedInPkg || isAlreadyDeductedInRm) continue;

                    await deductStoreRoomStock(essProdId, qtyReq);

                    await InventoryTransaction.create({
                        branch: targetBranch,
                        product: essProdId,
                        inventoryType: 'Store Room',
                        transactionType: 'OUT',
                        quantity: qtyReq,
                        referenceType: 'PRODUCTION',
                        remarks: `Issued Essence/Nut Material to Production for Requisition ${prodIdCode}`,
                        performedBy: req.user?._id
                    });
                }
            }
        }

        // 4. DEDUCT PREPARED MIX FOR FG ASSEMBLY REQUISITION
        if (!isMixReq && production.mixProduct) {
            // Deduct Prepared Mix from Store Room Inventory for FG Assembly Requisition
            const mixProdId = production.mixProduct._id || production.mixProduct;
            const neededLiters = parseFloat(production.mixLiters) || Number(((production.totalPieces || 12) / (production.piecesPerBox || 12)).toFixed(2)) || 1;

            await deductStoreRoomStock(mixProdId, neededLiters);

            await InventoryTransaction.create({
                branch: targetBranch,
                product: mixProdId,
                inventoryType: 'Store Room',
                transactionType: 'OUT',
                quantity: neededLiters,
                referenceType: 'PRODUCTION',
                remarks: `Issued Prepared Mix to Production for Requisition ${prodIdCode}`,
                performedBy: req.user?._id
            });
        }

        const updatedProduction = await Production.findByIdAndUpdate(id, {
            status: 'DISPATCHED_TO_PRODUCTION',
            dispatchedAt: new Date(),
            dispatchedBy: req.user?._id
        }, { new: true });

        res.json({
            success: true,
            message: `Store Room Stock Dispatched successfully for Requisition ID ${prodIdCode}!`,
            data: updatedProduction
        });
    } catch (error) {
        console.error('Error dispatching stock from Store Room', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Start Production Execution (Store Room stock has been dispatched)
// @route   POST /api/v1/production/:id/start-production
// @access  Private
exports.startProduction = async (req, res) => {
    try {
        const { id } = req.params;
        const production = await Production.findById(id);
        if (!production) return res.status(404).json({ success: false, message: 'Production Requisition not found.' });

        const updatedProd = await Production.findByIdAndUpdate(id, {
            status: 'IN_PRODUCTION',
            startedAt: new Date(),
            startedBy: req.user?._id
        }, { new: true });

        res.json({ success: true, message: `Production started for Batch ${production.productionNumber || 'PR-01'}!`, data: updatedProd });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Complete Production Phase (Auto-inwards Finished Goods to Stock & Generates Box QRs)
// @route   POST /api/v1/production/:id/complete-production
// @access  Private
exports.completeProduction = async (req, res) => {
    try {
        const { id } = req.params;
        const { actualProducedPieces, piecesPerBox, remarks, productionUnitCost } = req.body;

        const production = await Production.findById(id);
        if (!production) return res.status(404).json({ success: false, message: 'Production batch not found.' });

        const isMixReq = production.requisitionType === 'MIX_REQUISITION';
        const reqTargetQty = isMixReq ? (production.mixLiters || production.totalPieces || 0) : (production.totalPieces || 0);
        const pPcs = parseFloat(actualProducedPieces) !== undefined && parseFloat(actualProducedPieces) >= 0 
            ? parseFloat(actualProducedPieces) 
            : reqTargetQty;

        const pPerBox = parseInt(piecesPerBox) || parseInt(production.piecesPerBox) || 12;
        const passedBoxes = Math.floor(pPcs / pPerBox);
        const loosePcs = pPcs % pPerBox;
        const prodIdCode = production.productionNumber || `PR-${id.slice(-4)}`;

        // Calculate Total Batch Cost & Unit Production Cost from Raw Materials & Packaging
        const allProducts = await Product.find({});
        const productMap = {};
        allProducts.forEach(p => { productMap[(p._id || p.id).toString()] = p; });

        let totalBatchMaterialCost = 0;
        if (Array.isArray(production.rawMaterialsUsed)) {
            production.rawMaterialsUsed.forEach(rm => {
                const pId = (rm.product?._id || rm.product || '').toString();
                const pObj = productMap[pId];
                const price = pObj?.purchasePrice || pObj?.costPrice || 0;
                totalBatchMaterialCost += (parseFloat(rm.quantityUsed || 0) * parseFloat(price));
            });
        }
        if (Array.isArray(production.packagingMaterialsUsed)) {
            production.packagingMaterialsUsed.forEach(pkg => {
                const pId = (pkg.product?._id || pkg.product || '').toString();
                const pObj = productMap[pId];
                const price = pObj?.purchasePrice || pObj?.costPrice || 0;
                totalBatchMaterialCost += (parseFloat(pkg.quantityRequested || 0) * parseFloat(price));
            });
        }

        const calculatedUnitCost = pPcs > 0 ? Number((totalBatchMaterialCost / pPcs).toFixed(2)) : 0;
        const finalUnitCost = (productionUnitCost !== undefined && parseFloat(productionUnitCost) >= 0) 
            ? parseFloat(productionUnitCost) 
            : calculatedUnitCost;

        // Automatically update Product Master Cost Price (₹)
        const targetProdId = production.finishedGoodProduct?._id || production.finishedGoodProduct || production.mixProduct?._id || production.mixProduct;
        if (targetProdId && finalUnitCost > 0) {
            await Product.findByIdAndUpdate(targetProdId, {
                costPrice: finalUnitCost
            });
        }

        // 1. Inward Stock based on Actual Produced Quantity!
        if (isMixReq && production.finishedGoodProduct) {
            // Mix Preparation Yield Inwarding
            const mixProdId = production.finishedGoodProduct._id || production.finishedGoodProduct;
            
            const existingMixInv = await Inventory.findOne({
                product: mixProdId,
                inventoryType: 'Store Room'
            });

            if (existingMixInv) {
                await Inventory.findByIdAndUpdate(existingMixInv._id || existingMixInv.id, {
                    quantity: pPcs, // Store actual produced stock!
                    lastUpdated: Date.now()
                });
            } else {
                await Inventory.create({
                    branch: production.branch,
                    product: mixProdId,
                    inventoryType: 'Store Room',
                    quantity: pPcs,
                    batchNumber: production.batchNumber || 'MIX-BATCH-1',
                    lastUpdated: Date.now()
                });
            }

            await InventoryTransaction.create({
                branch: production.branch,
                product: mixProdId,
                inventoryType: 'Store Room',
                batchNumber: production.batchNumber || 'MIX-BATCH-1',
                transactionType: 'IN',
                quantity: pPcs,
                requestedQuantity: reqTargetQty,
                referenceType: 'PRODUCTION_MIX',
                remarks: `Prepared Mix Inwarded: ${pPcs} Liters (${reqTargetQty} Liters Requested) for Requisition ${prodIdCode}`,
                performedBy: req.user?._id
            });
        } else if (!isMixReq && production.finishedGoodProduct) {
            // Finished Goods Assembly Inwarding
            const fgProductObj = await Product.findById(production.finishedGoodProduct);
            const fgSellingPrice = parseFloat(production.sellingPrice) || fgProductObj?.wholesalePrice || 0;
            const fgMrp = parseFloat(production.mrp) || fgProductObj?.mrp || 0;

            if (fgProductObj) {
                await Inventory.findOneAndUpdate(
                    {
                        product: fgProductObj._id || fgProductObj.id,
                        inventoryType: 'Finished Goods',
                        batchNumber: production.batchNumber || 'BATCH-1'
                    },
                    {
                        $set: {
                            quantity: pPcs,
                            purchasePrice: fgSellingPrice,
                            mrp: fgMrp,
                            temperature: production.temperature || -18,
                            lastUpdated: Date.now()
                        }
                    },
                    { new: true, upsert: true }
                );

                await InventoryTransaction.create({
                    branch: production.branch,
                    product: fgProductObj._id || fgProductObj.id,
                    inventoryType: 'Finished Goods',
                    batchNumber: production.batchNumber || 'BATCH-1',
                    transactionType: 'IN',
                    quantity: pPcs,
                    requestedQuantity: reqTargetQty,
                    referenceType: 'PRODUCTION',
                    remarks: `Inwarded Finished Goods (${pPcs} Pcs = ${passedBoxes} Boxes + ${loosePcs} Loose Pcs, Requested: ${reqTargetQty}). Production ID: ${prodIdCode}`,
                    performedBy: req.user?._id
                });
            }
        }

        // 2. Generate Box QR Stickers List
        const boxQrStickers = [];
        const totalBoxesToGenerate = passedBoxes + (loosePcs > 0 ? 1 : 0);
        for (let b = 1; b <= totalBoxesToGenerate; b++) {
            const isPartialBox = b === totalBoxesToGenerate && loosePcs > 0;
            const pcsInThisBox = isPartialBox ? loosePcs : pPerBox;
            boxQrStickers.push({
                boxIndex: b,
                totalBoxes: totalBoxesToGenerate,
                qrCodeText: JSON.stringify({
                    brand: 'SRI SARAVANAA ERP',
                    productionId: prodIdCode,
                    batchNumber: production.batchNumber || 'BATCH-1',
                    boxNumber: `${b} / ${totalBoxesToGenerate}`,
                    piecesInBox: pcsInThisBox,
                    mfgDate: new Date().toISOString().split('T')[0]
                })
            });
        }

        const updatedProd = await Production.findByIdAndUpdate(id, {
            producedPieces: pPcs,
            producedBoxes: Number((pPcs / (pPerBox || 1)).toFixed(2)),
            piecesPerBox: pPerBox,
            passedPieces: pPcs,
            passedBoxes: passedBoxes,
            productionUnitCost: finalUnitCost,
            status: 'QC_PASSED',
            qcStatus: 'PASSED',
            completedAt: new Date(),
            completedBy: req.user?._id,
            boxQrStickers: boxQrStickers,
            remarks: remarks || production.remarks
        }, { new: true });

        res.json({
            success: true,
            message: `Production Completed & Finished Goods Inwarded (${pPcs} Pcs)! Box QR Code stickers generated.`,
            data: updatedProd
        });
    } catch (error) {
        console.error('Error completing production batch', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Send Production Batch to QC Inspection Module
// @route   POST /api/v1/production/:id/send-to-qc
// @access  Private
exports.sendToQc = async (req, res) => {
    try {
        const { id } = req.params;
        const production = await Production.findById(id);
        if (!production) return res.status(404).json({ success: false, message: 'Production batch not found.' });

        const updatedProd = await Production.findByIdAndUpdate(id, {
            status: 'SENT_TO_QC',
            sentToQcAt: new Date()
        }, { new: true });

        res.json({ success: true, message: `Batch ${production.productionNumber} sent to Finished Goods QC!`, data: updatedProd });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Perform Finished Goods QC Inspection, Generate Per-Box QRs & Inward to Finished Goods Stock
// @route   POST /api/v1/production/:id/approve-qc
// @access  Private
exports.approveFinishedGoodsQC = async (req, res) => {
    try {
        const { id } = req.params;
        const { damagedPieces, damageReason, remarks } = req.body;

        const prod = await Production.findById(id);
        if (!prod) return res.status(404).json({ success: false, message: 'Production batch not found.' });

        const fgProductObj = await Product.findById(prod.finishedGoodProduct);
        if (!fgProductObj) return res.status(404).json({ success: false, message: 'Finished Good Product record not found.' });

        const pPerBox = parseInt(prod.piecesPerBox) || 12;
        const totalProduced = parseInt(prod.producedPieces) || parseInt(prod.totalPieces) || 0;
        const dPcs = Math.max(0, parseInt(damagedPieces) || 0);
        const passedPcs = Math.max(0, totalProduced - dPcs);
        const passedBoxes = Math.floor(passedPcs / pPerBox);
        const loosePcs = passedPcs % pPerBox;

        const qcIdCode = `QC-${Date.now().toString().slice(-6)}`;
        const prodIdCode = prod.productionNumber || `PR-${id.slice(-4)}`;

        // 1. Inward Approved Passed Stock into Finished Goods Inventory
        const fgSellingPrice = parseFloat(prod.sellingPrice) || fgProductObj.wholesalePrice || 0;
        const fgMrp = parseFloat(prod.mrp) || fgProductObj.mrp || 0;

        await Inventory.findOneAndUpdate(
            {
                product: fgProductObj._id || fgProductObj.id,
                inventoryType: 'Finished Goods',
                batchNumber: prod.batchNumber || 'BATCH-1'
            },
            {
                $inc: { quantity: passedPcs },
                $set: {
                    purchasePrice: fgSellingPrice,
                    mrp: fgMrp,
                    temperature: prod.temperature || -18,
                    lastUpdated: Date.now()
                }
            },
            { new: true, upsert: true }
        );

        // 2. Log Finished Goods Inward Inventory Transaction
        await InventoryTransaction.create({
            branch: prod.branch,
            product: fgProductObj._id || fgProductObj.id,
            inventoryType: 'Finished Goods',
            batchNumber: prod.batchNumber || 'BATCH-1',
            transactionType: 'IN',
            quantity: passedPcs,
            referenceType: 'PRODUCTION_QC',
            remarks: `QC Approved Finished Goods (${passedPcs} Pcs = ${passedBoxes} Boxes + ${loosePcs} Loose Pcs). Production ID: ${prodIdCode}, QC ID: ${qcIdCode}`,
            performedBy: req.user?._id
        });

        // 3. Generate Per-Box QR Code Payloads List
        const boxQrStickers = [];
        const totalBoxesToGenerate = passedBoxes + (loosePcs > 0 ? 1 : 0);
        for (let b = 1; b <= totalBoxesToGenerate; b++) {
            const isPartialBox = b === totalBoxesToGenerate && loosePcs > 0;
            const pcsInThisBox = isPartialBox ? loosePcs : pPerBox;
            boxQrStickers.push({
                boxIndex: b,
                totalBoxes: totalBoxesToGenerate,
                qrCodeText: JSON.stringify({
                    brand: 'SRI SARAVANAA ERP',
                    productionId: prodIdCode,
                    qcId: qcIdCode,
                    batchNumber: prod.batchNumber || 'BATCH-1',
                    product: fgProductObj.name,
                    itemCode: fgProductObj.itemCode,
                    boxNumber: `${b} / ${totalBoxesToGenerate}`,
                    piecesInBox: pcsInThisBox,
                    mfgDate: new Date().toISOString().split('T')[0]
                })
            });
        }

        const updatedProd = await Production.findByIdAndUpdate(id, {
            qcId: qcIdCode,
            damagedPieces: dPcs,
            passedPieces: passedPcs,
            passedBoxes: passedBoxes,
            damageReason: damageReason || 'None',
            qcInspectorRemarks: remarks || 'QC Inspection Approved',
            qcStatus: 'PASSED',
            status: 'QC_APPROVED',
            qcApprovedAt: new Date(),
            qcApprovedBy: req.user?._id,
            boxQrStickers: boxQrStickers
        }, { new: true });

        res.json({
            success: true,
            message: `QC Approved successfully for Production ID ${prodIdCode}! Inwarded ${passedPcs} Pcs to Finished Goods Inventory and generated ${boxQrStickers.length} Box QR stickers.`,
            data: updatedProd
        });
    } catch (error) {
        console.error('Error approving QC', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Perform Finished Goods QC Inspection (Supports Piece-level & Box-level damage precision)
// @route   POST /api/v1/production/:id/qc
// @access  Private
exports.performFinishedGoodsQC = async (req, res) => {
    try {
        const { id } = req.params;
        const { passedBoxes, damagedBoxes, passedPieces, damagedPieces, damageReason, remarks } = req.body;

        const prod = await Production.findById(id).populate('finishedGoodProduct');
        if (!prod) return res.status(404).json({ success: false, message: 'Production batch not found.' });

        const pPerBox = prod.piecesPerBox || 12;

        let dPcs = parseFloat(damagedPieces);
        let pPcs = parseFloat(passedPieces);

        // Calculate pieces if boxes were sent instead
        if (isNaN(dPcs)) {
            const dBoxes = parseFloat(damagedBoxes) || 0;
            dPcs = dBoxes * pPerBox;
        }
        if (isNaN(pPcs)) {
            const pBoxes = parseFloat(passedBoxes) || 0;
            pPcs = pBoxes * pPerBox;
        }

        // Default auto-calculation if one of them wasn't provided
        if (pPcs + dPcs !== prod.totalPieces) {
            if (dPcs >= 0 && isNaN(passedPieces)) {
                pPcs = Math.max(0, prod.totalPieces - dPcs);
            } else if (pPcs >= 0 && isNaN(damagedPieces)) {
                dPcs = Math.max(0, prod.totalPieces - pPcs);
            }
        }

        const totalInspectedPieces = pPcs + dPcs;
        if (totalInspectedPieces <= 0) {
            return res.status(400).json({ success: false, message: 'Total inspected pieces must be greater than zero.' });
        }

        if (totalInspectedPieces > prod.totalPieces) {
            return res.status(400).json({ 
                success: false, 
                message: `Inspected quantity (${totalInspectedPieces} Pcs) exceeds total production output (${prod.totalPieces} Pcs).` 
            });
        }

        const pBoxes = Number((pPcs / pPerBox).toFixed(2));
        const dBoxes = Number((dPcs / pPerBox).toFixed(2));

        // 1. Deduct from Factory Store Room Inventory
        let storeRoomInv = await Inventory.findOne({
            branch: prod.branch,
            product: prod.finishedGoodProduct._id,
            inventoryType: 'Store Room',
            batchNumber: prod.batchNumber
        });

        if (storeRoomInv) {
            storeRoomInv.quantity = Math.max(0, storeRoomInv.quantity - (pPcs + dPcs));
            storeRoomInv.lastUpdated = Date.now();
            await storeRoomInv.save();
        }

        // 2. Transfer Passed Stock -> Cold Room Inventory (INWARD Sales Inventory)
        if (pPcs > 0) {
            await Inventory.findOneAndUpdate(
                {
                    branch: prod.branch,
                    product: prod.finishedGoodProduct._id,
                    inventoryType: 'Cold Room',
                    batchNumber: prod.batchNumber
                },
                {
                    $inc: { quantity: pPcs },
                    $set: {
                        purchasePrice: prod.sellingPrice,
                        mrp: prod.mrp,
                        manufacturingDate: prod.manufacturingDate,
                        expiryDate: prod.expiryDate,
                        temperature: prod.temperature,
                        lastUpdated: Date.now()
                    }
                },
                { new: true, upsert: true }
            );

            await InventoryTransaction.create({
                branch: prod.branch,
                product: prod.finishedGoodProduct._id,
                inventoryType: 'Cold Room',
                batchNumber: prod.batchNumber,
                purchasePrice: prod.sellingPrice,
                mrp: prod.mrp,
                manufacturingDate: prod.manufacturingDate,
                expiryDate: prod.expiryDate,
                transactionType: 'IN',
                quantity: pPcs,
                referenceType: 'PRODUCTION_QC',
                remarks: `QC Passed Batch ${prod.batchNumber} (${pPcs} Pcs transferred to Cold Room)`,
                performedBy: req.user._id
            });
        }

        // 3. Transfer Damaged Stock -> Rejected Stock Inventory
        if (dPcs > 0) {
            await Inventory.findOneAndUpdate(
                {
                    branch: prod.branch,
                    product: prod.finishedGoodProduct._id,
                    inventoryType: 'Rejected Stock',
                    batchNumber: prod.batchNumber
                },
                {
                    $inc: { quantity: dPcs },
                    $set: {
                        purchasePrice: prod.sellingPrice,
                        mrp: prod.mrp,
                        manufacturingDate: prod.manufacturingDate,
                        expiryDate: prod.expiryDate,
                        temperature: prod.temperature,
                        lastUpdated: Date.now()
                    }
                },
                { new: true, upsert: true }
            );

            await InventoryTransaction.create({
                branch: prod.branch,
                product: prod.finishedGoodProduct._id,
                inventoryType: 'Rejected Stock',
                batchNumber: prod.batchNumber,
                purchasePrice: prod.sellingPrice,
                mrp: prod.mrp,
                manufacturingDate: prod.manufacturingDate,
                expiryDate: prod.expiryDate,
                transactionType: 'OUT',
                quantity: dPcs,
                referenceType: 'DAMAGE',
                remarks: `QC Inspection Rejection: ${dPcs} Pcs (${dBoxes} Boxes). Reason: ${damageReason || 'Melting / Packaging Defect'}`,
                performedBy: req.user._id
            });
        }

        // 4. Update Production Record QC Status
        const finalQcStatus = dPcs > 0 
            ? (pPcs > 0 ? 'QC_PARTIAL_DAMAGE' : 'QC_REJECTED')
            : 'QC_PASSED';

        const updatedProd = await Production.findByIdAndUpdate(id, {
            qcStatus: finalQcStatus,
            passedBoxes: pBoxes,
            passedPieces: pPcs,
            damagedBoxes: dBoxes,
            damagedPieces: dPcs,
            damageReason: damageReason || '',
            qcInspector: req.user?._id,
            qcInspectedAt: Date.now(),
            remarks: remarks ? `${prod.remarks || ''} | QC Notes: ${remarks}` : prod.remarks
        }, { new: true });

        res.json({
            success: true,
            data: updatedProd,
            message: `Finished Goods QC Inspection Completed! ${pPcs} Passed Pcs moved to Cold Room. ${dPcs} Damaged Pcs logged to Rejected Stock.`
        });
    } catch (error) {
        console.error('Error performing finished goods QC', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
