const mongoose = require('mongoose');
require('dotenv').config();
const PurchaseOrder = require('../models/PurchaseOrder');
const QualityControl = require('../models/QualityControl');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const pos = await PurchaseOrder.find({});
  console.log('All POs count:', pos.length);
  console.log('POs summary:', pos.map(p => ({
    id: p._id || p.id,
    poNumber: p.poNumber,
    status: p.status,
    isReq: p.isRequisition,
    date: p.orderDate || p.createdAt
  })));

  const pending = await PurchaseOrder.find({ status: { $in: ['Issued', 'Partially Received'] } });
  console.log('Pending POs returned by query:', pending.length);

  const qcs = await QualityControl.find({});
  console.log('All QC records count:', qcs.length);
  console.log('QCs summary:', qcs.map(q => ({
    id: q._id || q.id,
    qcReportNumber: q.qcReportNumber,
    poRef: q.poReference,
    status: q.status
  })));

  process.exit(0);
}
test();
