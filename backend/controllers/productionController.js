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
            rawMaterialsUsed,
            temperature,
            sellingPrice,
            mrp,
            manufacturingDate,
            expiryDate,
            remarks
        } = req.body;

        if (!finishedGoodProduct) return res.status(400).json({ success: false, message: 'Finished Good product is required.' });
        if (!quantityBoxes || parseFloat(quantityBoxes) <= 0) return res.status(400).json({ success: false, message: 'Valid quantity in boxes is required.' });
        if (!expiryDate) return res.status(400).json({ success: false, message: 'Expiry date is required for finished goods.' });

        // Resolve branch
        let targetBranch = branchId || req.user.branch;
        if (!targetBranch) {
            const firstBranch = await Branch.findOne();
            if (firstBranch) targetBranch = firstBranch._id;
        }

        const boxCount = parseFloat(quantityBoxes);
        const pPerBox = parseInt(piecesPerBox) || 12;
        const totalPieces = boxCount * pPerBox;

        // Auto-generate Production Number & Batch Code
        const countToday = await Production.countDocuments();
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const productionNumber = `PRD-${dateStr}-${(countToday + 1).toString().padStart(3, '0')}`;
        const batchNumber = `BATCH-FG-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

        // Verify Finished Good Product
        const fgProductObj = await Product.findById(finishedGoodProduct);
        if (!fgProductObj) return res.status(404).json({ success: false, message: 'Finished Good Product not found.' });

        // 1. Issue & Deduct Raw Materials Used from Raw Material Stock (OUTWARD)
        const processedRawMaterials = [];
        if (Array.isArray(rawMaterialsUsed)) {
            for (const rm of rawMaterialsUsed) {
                const qtyUsed = parseFloat(rm.quantityUsed) || 0;
                if (qtyUsed > 0 && rm.product) {
                    const rmProd = await Product.findById(rm.product);
                    
                    // Deduct from Raw Material Store Room Inventory
                    let rmInv = await Inventory.findOne({
                        branch: targetBranch,
                        product: rm.product,
                        inventoryType: 'Store Room'
                    });

                    if (rmInv) {
                        rmInv.quantity = Math.max(0, rmInv.quantity - qtyUsed);
                        rmInv.lastUpdated = Date.now();
                        await rmInv.save();
                    }

                    // Create Outward Transaction for Issued Raw Material
                    await InventoryTransaction.create({
                        branch: targetBranch,
                        product: rm.product,
                        inventoryType: 'Store Room',
                        batchNumber: rm.batchNumber || 'STORE-RM',
                        transactionType: 'OUT',
                        quantity: qtyUsed,
                        referenceType: 'PRODUCTION',
                        remarks: `Issued to Factory Floor for Production ${productionNumber} (${fgProductObj.name})`,
                        performedBy: req.user._id
                    });

                    processedRawMaterials.push({
                        product: rm.product,
                        batchNumber: rm.batchNumber || 'STORE-RM',
                        quantityUsed: qtyUsed,
                        unitOfMeasure: rmProd ? rmProd.unitOfMeasure : 'Units'
                    });
                }
            }
        }

        // 2. Inward Finished Goods into Factory Store Room Inventory (Pending QC Inspection)
        const fgSellingPrice = parseFloat(sellingPrice) || fgProductObj.wholesalePrice || 0;
        const fgMrp = parseFloat(mrp) || fgProductObj.mrp || 0;
        const fgTemp = parseFloat(temperature) !== undefined ? parseFloat(temperature) : -18;
        const mfgDate = manufacturingDate ? new Date(manufacturingDate) : new Date();
        const expDate = new Date(expiryDate);

        // Stock into Factory Store Room
        await Inventory.create({
            branch: targetBranch,
            product: finishedGoodProduct,
            inventoryType: 'Store Room',
            batchNumber,
            purchasePrice: fgSellingPrice,
            mrp: fgMrp,
            manufacturingDate: mfgDate,
            expiryDate: expDate,
            temperature: fgTemp,
            quantity: totalPieces,
            lastUpdated: Date.now()
        });

        // Log Store Room Inward Transaction
        await InventoryTransaction.create({
            branch: targetBranch,
            product: finishedGoodProduct,
            inventoryType: 'Store Room',
            batchNumber,
            purchasePrice: fgSellingPrice,
            mrp: fgMrp,
            manufacturingDate: mfgDate,
            expiryDate: expDate,
            transactionType: 'IN',
            quantity: totalPieces,
            referenceType: 'PRODUCTION',
            remarks: `Factory Production Completed. ${boxCount} Boxes (${totalPieces} Pcs @ ${fgTemp}°C) in Store Room pending QC.`,
            performedBy: req.user._id
        });

        // Generate QR Code Payload String
        const qrPayload = JSON.stringify({
            brand: 'SRI SARAVANAA ERP',
            productionNumber,
            batchNumber,
            product: fgProductObj.name,
            itemCode: fgProductObj.itemCode,
            quantityBoxes: boxCount,
            totalPieces,
            temperature: `${fgTemp} °C`,
            mfgDate: mfgDate.toISOString().split('T')[0],
            expiryDate: expDate.toISOString().split('T')[0],
            qcStatus: 'STORE_ROOM_PENDING_QC'
        });

        // Save Production Record
        const productionBatch = await Production.create({
            productionNumber,
            branch: targetBranch,
            finishedGoodProduct,
            batchNumber,
            quantityBoxes: boxCount,
            piecesPerBox: pPerBox,
            totalPieces,
            rawMaterialsUsed: processedRawMaterials,
            temperature: fgTemp,
            sellingPrice: fgSellingPrice,
            mrp: fgMrp,
            manufacturingDate: mfgDate,
            expiryDate: expDate,
            qrCodeData: qrPayload,
            qcStatus: 'STORE_ROOM_PENDING_QC',
            remarks: remarks || 'Production completed & stored in Store Room awaiting QC',
            performedBy: req.user._id
        });

        const populatedProduction = await Production.findById(productionBatch._id)
            .populate('branch', 'branchName')
            .populate('finishedGoodProduct', 'name itemCode unitOfMeasure category')
            .populate('rawMaterialsUsed.product', 'name itemCode unitOfMeasure');

        res.status(201).json({
            success: true,
            data: populatedProduction,
            message: `Production Batch ${productionNumber} created in Factory Store Room! Awaiting QC Inspection.`
        });
    } catch (error) {
        console.error('Error creating production batch', error);
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
            await Inventory.create({
                branch: prod.branch,
                product: prod.finishedGoodProduct._id,
                inventoryType: 'Cold Room',
                batchNumber: prod.batchNumber,
                purchasePrice: prod.sellingPrice,
                mrp: prod.mrp,
                manufacturingDate: prod.manufacturingDate,
                expiryDate: prod.expiryDate,
                temperature: prod.temperature,
                quantity: pPcs,
                lastUpdated: Date.now()
            });

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
            await Inventory.create({
                branch: prod.branch,
                product: prod.finishedGoodProduct._id,
                inventoryType: 'Rejected Stock',
                batchNumber: prod.batchNumber,
                purchasePrice: prod.sellingPrice,
                mrp: prod.mrp,
                manufacturingDate: prod.manufacturingDate,
                expiryDate: prod.expiryDate,
                temperature: prod.temperature,
                quantity: dPcs,
                lastUpdated: Date.now()
            });

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
