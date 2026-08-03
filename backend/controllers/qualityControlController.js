const QualityControl = require('../models/QualityControl');
const GRN = require('../models/GRN');
const PurchaseOrder = require('../models/PurchaseOrder');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Product = require('../models/Product');
const { getNextSequenceNumber } = require('../utils/sequenceGenerator');

exports.getQualityControls = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.checkedDate = {};
            if (startDate) dateFilter.checkedDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.checkedDate.$lte = end;
            }
        }

        const qcs = await QualityControl.find(dateFilter)
            .populate({
                path: 'grnReference',
                populate: {
                    path: 'poReference',
                    populate: {
                        path: 'vendor'
                    }
                }
            })
            .populate('branch', 'branchName branchCode')
            .populate('items.product', 'name itemCode unitOfMeasure itemType')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: qcs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getQualityControl = async (req, res) => {
    try {
        const qc = await QualityControl.findById(req.params.id)
            .populate({
                path: 'grnReference',
                populate: {
                    path: 'poReference',
                    populate: {
                        path: 'vendor'
                    }
                }
            })
            .populate('branch', 'branchName branchCode')
            .populate('items.product', 'name itemCode unitOfMeasure itemType');
        if (!qc) return res.status(404).json({ success: false, message: 'QC report not found' });
        res.json({ success: true, data: qc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get list of Purchase Orders pending QC check (status is Issued or Partially Received)
exports.getPendingPurchaseOrders = async (req, res) => {
    try {
        const pendingPOs = await PurchaseOrder.find({ 
            status: { $in: ['Issued', 'Partially Received'] } 
        })
        .populate('vendor', 'name vendorCode')
        .populate('branch', 'branchName')
        .populate('items.product', 'name itemCode unitOfMeasure itemType');
        
        res.json({ success: true, data: pendingPOs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createQualityControl = async (req, res) => {
    try {
        const { poReference, branch, supplierInvoiceNumber, items, status } = req.body;
        const userId = req.user?._id || '6a5ec376b44299bf18d9e800';

        // 1. Verify PO exists
        const po = await PurchaseOrder.findById(poReference);
        if (!po) return res.status(404).json({ success: false, message: 'Purchase Order reference not found' });

        // 2. Automatically Create GRN under the hood with sequential GRN number
        const grnNumber = await getNextSequenceNumber(GRN, 'grnNumber', 'GRN', new Date());
        const grnItems = items.map(item => ({
            product: item.product,
            receivedQty: (item.passedQty || 0) + (item.damagedQty || 0),
            acceptedQty: item.passedQty || 0,
            rejectedQty: item.damagedQty || 0,
            remarks: item.remarks
        }));

        const grn = await GRN.create({
            grnNumber,
            poReference,
            branch,
            supplierInvoiceNumber,
            items: grnItems,
            createdBy: userId
        });

        const processedItems = [];

        // 3. Process each item: generate batch number and update inventory
        for (const item of items) {
            const productInfo = await Product.findById(item.product);
            if (!productInfo) continue;

            const passedInventoryType = productInfo.itemType === 'Finished Goods' ? 'Cold Room' : 'Store Room';
            
            // Resolve Purchase Price from request payload, fallback to PO
            let purchasePrice = item.purchasePrice !== undefined ? parseFloat(item.purchasePrice) : 0;
            if (purchasePrice === 0 && po) {
                const poItem = po.items.find(pi => pi.product.toString() === item.product.toString());
                if (poItem) {
                    purchasePrice = poItem.unitPrice;
                }
            }

            // Auto-generate Batch Number
            const existingBatches = await Inventory.find({ product: item.product }).distinct('batchNumber');
            const nextBatchNum = existingBatches.length + 1;
            const batchNumber = `B-${nextBatchNum}`;

            const itemTemp = item.temperature !== undefined && item.temperature !== '' ? parseFloat(item.temperature) : undefined;

            processedItems.push({
                product: item.product,
                passedQty: item.passedQty,
                damagedQty: item.damagedQty,
                batchNumber,
                mrp: item.mrp || 0,
                manufacturingDate: item.manufacturingDate,
                expiryDate: item.expiryDate,
                temperature: itemTemp,
                remarks: item.remarks
            });

            // A. Update Passed Stock
            if (item.passedQty > 0) {
                await Inventory.findOneAndUpdate(
                    { branch, product: item.product, inventoryType: passedInventoryType, batchNumber },
                    { 
                        $inc: { quantity: item.passedQty }, 
                        $set: { 
                            purchasePrice, 
                            mrp: item.mrp || 0, 
                            manufacturingDate: item.manufacturingDate, 
                            expiryDate: item.expiryDate, 
                            temperature: itemTemp,
                            lastUpdated: Date.now() 
                        } 
                    },
                    { new: true, upsert: true }
                );

                await InventoryTransaction.create({
                    branch,
                    product: item.product,
                    inventoryType: passedInventoryType,
                    batchNumber,
                    purchasePrice,
                    mrp: item.mrp || 0,
                    manufacturingDate: item.manufacturingDate,
                    expiryDate: item.expiryDate,
                    transactionType: 'IN',
                    quantity: item.passedQty,
                    referenceType: 'QC',
                    referenceId: null,
                    remarks: `QC Passed. Temp: ${itemTemp !== undefined ? itemTemp : 'N/A'}°C`,
                    performedBy: userId
                });
            }

            // B. Update Rejected Stock
            if (item.damagedQty > 0) {
                await Inventory.findOneAndUpdate(
                    { branch, product: item.product, inventoryType: 'Rejected Stock', batchNumber },
                    { 
                        $inc: { quantity: item.damagedQty }, 
                        $set: { 
                            purchasePrice, 
                            mrp: item.mrp || 0, 
                            manufacturingDate: item.manufacturingDate, 
                            expiryDate: item.expiryDate, 
                            temperature: itemTemp,
                            lastUpdated: Date.now() 
                        } 
                    },
                    { new: true, upsert: true }
                );

                await InventoryTransaction.create({
                    branch,
                    product: item.product,
                    inventoryType: 'Rejected Stock',
                    batchNumber,
                    purchasePrice,
                    mrp: item.mrp || 0,
                    manufacturingDate: item.manufacturingDate,
                    expiryDate: item.expiryDate,
                    transactionType: 'OUT',
                    quantity: item.damagedQty,
                    referenceType: 'QC',
                    referenceId: null,
                    remarks: `QC Damaged/Rejected. Temp: ${itemTemp !== undefined ? itemTemp : 'N/A'}°C. Reason: ${item.remarks || 'No reason specified'}`,
                    performedBy: userId
                });
            }
        }

        // 4. Generate unique QC Number sequentially (e.g., QC-001/26-27)
        const qcNumber = await getNextSequenceNumber(QualityControl, 'qcNumber', 'QC', new Date());
        const qc = await QualityControl.create({
            qcNumber,
            grnReference: grn._id,
            branch,
            items: processedItems,
            status,
            createdBy: userId
        });

        // 5. Update transaction references with the QC ID
        await InventoryTransaction.updateMany(
            { referenceType: 'QC', referenceId: null },
            { $set: { referenceId: qc._id } }
        );

        // 6. Complete the Purchase Order status
        po.status = 'Completed';
        await po.save();

        res.status(201).json({ success: true, data: qc });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
