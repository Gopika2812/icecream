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

        const productions = await Production.find(query)
            .populate('branch', 'branchName branchCode')
            .populate('finishedGoodProduct', 'name itemCode category unitOfMeasure piecesPerBox mrp wholesalePrice')
            .populate('rawMaterialsUsed.product', 'name itemCode unitOfMeasure')
            .populate('performedBy', 'name')
            .populate('qcInspector', 'name')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: productions });
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
            branchId,
            finishedGoodProduct,
            quantityBoxes,
            piecesPerBox,
            totalPieces: reqTotalPieces,
            rawMaterialsUsed,
            packagingMaterialsUsed,
            temperature,
            sellingPrice,
            mrp,
            manufacturingDate,
            expiryDate,
            remarks
        } = req.body;

        if (!finishedGoodProduct) return res.status(400).json({ success: false, message: 'Finished Good product is required.' });

        // Resolve branch
        let targetBranch = branchId || req.user?.branch;
        if (!targetBranch) {
            const firstBranch = await Branch.findOne();
            if (firstBranch) targetBranch = firstBranch._id;
        }

        const pPerBox = parseInt(piecesPerBox) || 12;
        let totalPieces = parseInt(reqTotalPieces) || 0;
        let boxCount = parseFloat(quantityBoxes) || 0;

        if (totalPieces <= 0 && boxCount > 0) {
            totalPieces = boxCount * pPerBox;
        } else if (totalPieces > 0 && boxCount <= 0) {
            boxCount = Number((totalPieces / pPerBox).toFixed(2));
        }

        if (totalPieces <= 0) return res.status(400).json({ success: false, message: 'Valid quantity in Pcs or Boxes is required.' });

        // Auto-generate Production Number (e.g. PR-01, PR-02) & Batch Code
        const totalBatches = await Production.countDocuments();
        const productionNumber = req.body.productionNumber || `PR-${(totalBatches + 1).toString().padStart(2, '0')}`;
        const batchNumber = req.body.batchNumber || `BATCH-${totalBatches + 1}`;

        // Verify Finished Good Product
        const fgProductObj = await Product.findById(finishedGoodProduct);
        if (!fgProductObj) return res.status(404).json({ success: false, message: 'Finished Good Product not found.' });

        // Process Raw Materials Array
        const processedRawMaterials = [];
        if (Array.isArray(rawMaterialsUsed)) {
            for (const rm of rawMaterialsUsed) {
                const qtyUsed = parseFloat(rm.quantityUsed) || 0;
                if (qtyUsed > 0 && rm.product) {
                    const rmProd = await Product.findById(rm.product);
                    processedRawMaterials.push({
                        product: rm.product,
                        batchNumber: rm.batchNumber || 'STORE-RM',
                        quantityUsed: qtyUsed,
                        unitOfMeasure: rmProd ? rmProd.unitOfMeasure : 'Units'
                    });
                }
            }
        }

        // Process Packaging Materials Array
        const processedPackagingMaterials = [];
        if (Array.isArray(packagingMaterialsUsed)) {
            for (const pkg of packagingMaterialsUsed) {
                const qtyReq = parseFloat(pkg.quantityRequested) || 0;
                if (qtyReq > 0 && pkg.product) {
                    const pkgProd = await Product.findById(pkg.product);
                    processedPackagingMaterials.push({
                        product: pkg.product,
                        quantityRequested: qtyReq,
                        unitOfMeasure: pkgProd ? pkgProd.unitOfMeasure : 'Pcs'
                    });
                }
            }
        }

        const fgSellingPrice = parseFloat(sellingPrice) || fgProductObj.wholesalePrice || 0;
        const fgMrp = parseFloat(mrp) || fgProductObj.mrp || 0;
        const fgTemp = parseFloat(temperature) !== undefined ? parseFloat(temperature) : -18;
        const mfgDate = manufacturingDate ? new Date(manufacturingDate) : new Date();
        const expDate = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

        // Generate QR Code Payload String
        const qrPayload = JSON.stringify({
            brand: 'SRI SARAVANAA ERP',
            productionNumber,
            batchNumber,
            product: fgProductObj.name,
            itemCode: fgProductObj.itemCode,
            quantityBoxes: boxCount,
            totalPieces,
            status: 'PENDING_STORE_ROOM_DISPATCH'
        });

        // Save Production Requisition Record
        const productionBatch = await Production.create({
            productionNumber,
            branch: targetBranch,
            finishedGoodProduct,
            batchNumber,
            quantityBoxes: boxCount,
            piecesPerBox: pPerBox,
            totalPieces,
            rawMaterialsUsed: processedRawMaterials,
            packagingMaterialsUsed: processedPackagingMaterials,
            temperature: fgTemp,
            sellingPrice: fgSellingPrice,
            mrp: fgMrp,
            manufacturingDate: mfgDate,
            expiryDate: expDate,
            qrCodeData: qrPayload,
            status: 'PENDING_STORE_ROOM_DISPATCH',
            qcStatus: 'STORE_ROOM_PENDING_QC',
            remarks: remarks || 'Material Requisition submitted to Store Room',
            performedBy: req.user?._id
        });

        res.status(201).json({
            success: true,
            data: productionBatch,
            message: `Material Requisition ID ${productionNumber} submitted to Factory Store Room for Stock Issue!`
        });
    } catch (error) {
        console.error('Error creating production batch', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Store Room Dispatches Raw Materials & Packaging Materials to Production Team
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

        // 1. Deduct Raw Materials from Store Room Inventory
        if (Array.isArray(production.rawMaterialsUsed)) {
            for (const rm of production.rawMaterialsUsed) {
                const qtyUsed = parseFloat(rm.quantityUsed) || 0;
                if (qtyUsed > 0 && rm.product) {
                    const rmProdId = rm.product._id || rm.product;
                    let rmInv = await Inventory.findOne({
                        product: rmProdId,
                        inventoryType: 'Store Room'
                    });

                    if (rmInv) {
                        rmInv.quantity = Math.max(0, rmInv.quantity - qtyUsed);
                        rmInv.lastUpdated = Date.now();
                        await rmInv.save();
                    }

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
                    let pkgInv = await Inventory.findOne({
                        product: pkgProdId,
                        inventoryType: 'Store Room'
                    });

                    if (pkgInv) {
                        pkgInv.quantity = Math.max(0, pkgInv.quantity - qtyReq);
                        pkgInv.lastUpdated = Date.now();
                        await pkgInv.save();
                    }

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

        production.status = 'DISPATCHED_TO_PRODUCTION';
        production.dispatchedAt = new Date();
        production.dispatchedBy = req.user?._id;
        await production.save();

        res.json({
            success: true,
            message: `Store Room Stock Dispatched successfully for Requisition ID ${prodIdCode}!`,
            data: production
        });
    } catch (error) {
        console.error('Error dispatching stock from Store Room', error);
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

        prod.qcStatus = finalQcStatus;
        prod.passedBoxes = pBoxes;
        prod.passedPieces = pPcs;
        prod.damagedBoxes = dBoxes;
        prod.damagedPieces = dPcs;
        prod.damageReason = damageReason || '';
        prod.qcInspector = req.user._id;
        prod.qcInspectedAt = Date.now();
        if (remarks) prod.remarks = `${prod.remarks} | QC Notes: ${remarks}`;
        await prod.save();

        const updatedProd = await Production.findById(prod._id)
            .populate('branch', 'branchName')
            .populate('finishedGoodProduct', 'name itemCode unitOfMeasure category')
            .populate('rawMaterialsUsed.product', 'name itemCode unitOfMeasure')
            .populate('qcInspector', 'name');

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
