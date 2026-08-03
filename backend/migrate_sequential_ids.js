const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const PurchaseOrder = require('./models/PurchaseOrder');
const GRN = require('./models/GRN');
const QualityControl = require('./models/QualityControl');
const { getFinancialYearCode } = require('./utils/sequenceGenerator');

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB for migration...');

        // 1. Migrate Purchase Orders
        const pos = await PurchaseOrder.find().sort({ createdAt: 1 });
        console.log(`Found ${pos.length} Purchase Orders to re-sequence.`);
        for (let i = 0; i < pos.length; i++) {
            const po = pos[i];
            const fy = getFinancialYearCode(po.orderDate || po.createdAt);
            const seq = (i + 1).toString().padStart(3, '0');
            po.poNumber = `PO-${seq}/${fy}`;
            await po.save();
            console.log(`PO migrated: ${po.poNumber}`);
        }

        // 2. Migrate GRNs
        const grns = await GRN.find().sort({ createdAt: 1 });
        console.log(`Found ${grns.length} GRNs to re-sequence.`);
        for (let i = 0; i < grns.length; i++) {
            const grn = grns[i];
            const fy = getFinancialYearCode(grn.receivedDate || grn.createdAt);
            const seq = (i + 1).toString().padStart(3, '0');
            grn.grnNumber = `GRN-${seq}/${fy}`;
            await grn.save();
            console.log(`GRN migrated: ${grn.grnNumber}`);
        }

        // 3. Migrate QCs
        const qcs = await QualityControl.find().sort({ createdAt: 1 });
        console.log(`Found ${qcs.length} QCs to re-sequence.`);
        for (let i = 0; i < qcs.length; i++) {
            const qc = qcs[i];
            const fy = getFinancialYearCode(qc.checkedDate || qc.createdAt);
            const seq = (i + 1).toString().padStart(3, '0');
            qc.qcNumber = `QC-${seq}/${fy}`;
            await qc.save();
            console.log(`QC migrated: ${qc.qcNumber}`);
        }

        console.log('ALL SEQUENTIAL MIGRATIONS COMPLETED SUCCESSFULLY!');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
