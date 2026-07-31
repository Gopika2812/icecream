import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Factory, Plus, Search, Filter, Printer, Loader2, ThermometerSnowflake, 
  Package, Calendar, CheckCircle2, QrCode, ArrowRight, ShieldCheck, Trash2, X, DollarSign, Box, ShieldAlert, AlertTriangle 
} from 'lucide-react';
import Modal from '../../components/Modal';
import SearchableSelect from '../../components/SearchableSelect';

const ProductionList = () => {
  const [productions, setProductions] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterialStock, setRawMaterialStock] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [selectedProductionForQc, setSelectedProductionForQc] = useState(null);

  // New Production Wizard Form State
  const [wizardStep, setWizardStep] = useState(1); // 1: Product & Qty, 2: Raw Materials, 3: Store Room Entry
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    finishedGoodProduct: '',
    quantityBoxes: '',
    piecesPerBox: 12,
    rawMaterialsUsed: [
      { product: '', quantityUsed: '', batchNumber: 'STORE-RM' }
    ],
    temperature: -18,
    sellingPrice: '',
    mrp: '',
    manufacturingDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    remarks: ''
  });

  // Finished Goods QC Form State (Piece & Box precision)
  const [qcForm, setQcForm] = useState({
    passedPieces: 0,
    damagedPieces: 0,
    passedBoxes: 0,
    damagedBoxes: 0,
    damageReason: 'Melted / Temperature Fluctuated',
    remarks: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, productsRes, invRes] = await Promise.all([
        api.get('/production'),
        api.get('/products'),
        api.get('/inventory')
      ]);

      setProductions(prodRes.data.data || []);
      setProducts(productsRes.data.data || []);
      setRawMaterialStock(invRes.data.data || []);
    } catch (error) {
      console.error('Failed to load production data', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by type
  const finishedGoods = products.filter(p => p.itemType === 'Finished Goods');
  const rawMaterials = products.filter(p => p.itemType === 'Raw Material');

  // Handle Finished Good selection
  const handleFgSelect = (pId) => {
    const fg = finishedGoods.find(p => p._id === pId);
    setFormData({
      ...formData,
      finishedGoodProduct: pId,
      piecesPerBox: fg?.piecesPerBox || 12,
      sellingPrice: fg?.wholesalePrice || '',
      mrp: fg?.mrp || ''
    });
  };

  // Raw Material row management
  const handleAddRawMaterialRow = () => {
    setFormData({
      ...formData,
      rawMaterialsUsed: [
        ...formData.rawMaterialsUsed,
        { product: '', quantityUsed: '', batchNumber: 'STORE-RM' }
      ]
    });
  };

  const handleRemoveRawMaterialRow = (index) => {
    const updated = [...formData.rawMaterialsUsed];
    updated.splice(index, 1);
    setFormData({ ...formData, rawMaterialsUsed: updated });
  };

  const handleRawMaterialChange = (index, field, value) => {
    const updated = [...formData.rawMaterialsUsed];
    updated[index][field] = value;
    setFormData({ ...formData, rawMaterialsUsed: updated });
  };

  // Open New Batch Modal with auto-incremented batch code
  const handleOpenNewBatchModal = () => {
    const nextBatchNum = `BATCH-${productions.length + 1}`;
    setWizardStep(1);
    setFormData({
      batchNumber: nextBatchNum,
      finishedGoodProduct: '',
      quantityBoxes: '',
      piecesPerBox: 12,
      rawMaterialsUsed: [{ product: '', quantityUsed: '', batchNumber: 'STORE-RM' }],
      temperature: -18,
      sellingPrice: '',
      mrp: '',
      manufacturingDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      remarks: ''
    });
    setIsNewBatchModalOpen(true);
  };

  // Submit Production Batch to Factory Store Room
  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    if (!formData.finishedGoodProduct) return alert('Please select a finished good product.');
    if (!formData.quantityBoxes || parseFloat(formData.quantityBoxes) <= 0) return alert('Please enter target box quantity.');
    if (!formData.expiryDate) return alert('Please select expiry date.');

    try {
      setSubmitting(true);
      const response = await api.post('/production', {
        ...formData,
        batchNumber: formData.batchNumber || `BATCH-${productions.length + 1}`,
        quantityBoxes: parseFloat(formData.quantityBoxes),
        piecesPerBox: parseInt(formData.piecesPerBox) || 12,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        mrp: parseFloat(formData.mrp) || 0,
        temperature: parseFloat(formData.temperature) || -18
      });

      alert(response.data.message || 'Production Batch Created & Stored in Factory Store Room!');
      setIsNewBatchModalOpen(false);
      setWizardStep(1);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create production batch', error);
      alert(error.response?.data?.message || 'Error creating production batch');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Finished Goods QC Modal
  const handleOpenQcModal = (prod) => {
    setSelectedProductionForQc(prod);
    setQcForm({
      passedPieces: prod.totalPieces,
      damagedPieces: 0,
      passedBoxes: prod.quantityBoxes,
      damagedBoxes: 0,
      damageReason: 'Melted / Temperature Fluctuated',
      remarks: ''
    });
    setIsQcModalOpen(true);
  };

  // Submit Finished Goods QC Inspection
  const handleSubmitQc = async (e) => {
    e.preventDefault();
    if (!selectedProductionForQc) return;

    try {
      setSubmitting(true);
      const response = await api.post(`/production/${selectedProductionForQc._id}/qc`, {
        passedPieces: parseFloat(qcForm.passedPieces) || 0,
        damagedPieces: parseFloat(qcForm.damagedPieces) || 0,
        passedBoxes: parseFloat(qcForm.passedBoxes) || 0,
        damagedBoxes: parseFloat(qcForm.damagedBoxes) || 0,
        damageReason: qcForm.damageReason,
        remarks: qcForm.remarks
      });

      alert(response.data.message || 'Finished Goods QC Inspection Completed!');
      setIsQcModalOpen(false);
      setSelectedProductionForQc(null);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to complete QC inspection', error);
      alert(error.response?.data?.message || 'Error completing QC inspection');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Production List
  const filteredProductions = productions.filter(p => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchNo = (p.productionNumber || '').toLowerCase().includes(q);
    const matchBatch = (p.batchNumber || '').toLowerCase().includes(q);
    const matchProd = (p.finishedGoodProduct?.name || '').toLowerCase().includes(q);
    const matchCode = (p.finishedGoodProduct?.itemCode || '').toLowerCase().includes(q);
    return matchNo || matchBatch || matchProd || matchCode;
  });

  // Top Summary Totals
  const totalBatches = productions.length;
  const pendingQcBatches = productions.filter(p => p.qcStatus === 'STORE_ROOM_PENDING_QC').length;
  const totalBoxesProduced = productions.reduce((sum, p) => sum + (p.quantityBoxes || 0), 0);

  const customInputStyle = "w-full bg-white border border-pink-200/80 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[var(--color-primary)] hover:border-pink-300 transition-all";

  // Print Batch & Individual Box Stickers Window
  const handlePrintBatchSticker = (prod) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Please allow popups to print batch labels.');

    const passedPcs = prod.passedPieces !== undefined ? prod.passedPieces : (prod.totalPieces || 0);
    const pPerBox = prod.piecesPerBox || 12;

    const fullBoxesCount = Math.floor(passedPcs / pPerBox);
    const loosePcsCount = passedPcs % pPerBox;
    const totalBoxesCount = fullBoxesCount + (loosePcsCount > 0 ? 1 : 0);

    const boxCards = [];
    for (let i = 1; i <= fullBoxesCount; i++) {
      boxCards.push({
        boxIndex: i,
        boxLabel: `Box ${i} of ${totalBoxesCount}`,
        pcsText: `${pPerBox} Pcs (Full Box)`,
        isPartial: false
      });
    }
    if (loosePcsCount > 0) {
      boxCards.push({
        boxIndex: totalBoxesCount,
        boxLabel: `Box ${totalBoxesCount} of ${totalBoxesCount}`,
        pcsText: `${loosePcsCount} Loose Pcs (Partial Box)`,
        isPartial: true
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Batch & Box Stickers - ${prod.batchNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; background: #f8fafc; color: #111; }
            .header-banner {
              text-align: center;
              margin-bottom: 20px;
              padding: 10px;
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
            }
            .header-banner h2 { margin: 0; color: #d81b60; font-size: 18px; }
            .header-banner p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
            
            .sticker-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 16px;
            }
            
            .sticker-card {
              border: 2px solid #d81b60;
              border-radius: 12px;
              padding: 14px;
              background: #fff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.06);
              page-break-inside: avoid;
            }
            .sticker-card.partial-card {
              border-color: #d97706;
            }
            
            .brand-header {
              background: #d81b60;
              color: white;
              padding: 6px 10px;
              border-radius: 6px;
              text-align: center;
              font-weight: 800;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .brand-header.partial-header {
              background: #d97706;
            }
            
            .prod-title { font-size: 15px; font-weight: 800; color: #111; margin-top: 8px; }
            .meta-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 4px; color: #444; }
            
            .qr-box { text-align: center; margin: 10px 0; padding: 8px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; }
            .qr-box svg { width: 100px; height: 100px; }
            
            .batch-badge { background: #1e1b4b; color: white; padding: 3px 6px; border-radius: 4px; font-family: monospace; font-weight: 700; font-size: 11px; }
            .box-badge { background: #d81b60; color: white; padding: 3px 6px; border-radius: 4px; font-family: monospace; font-weight: 700; font-size: 11px; }
            .box-badge.partial { background: #d97706; }
            
            .footer-note { text-align: center; font-size: 9px; color: #64748b; margin-top: 6px; }
            
            @media print {
              body { padding: 0; background: #fff; }
              .header-banner { display: none; }
              .sticker-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
              .sticker-card { border-color: #000; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h2>SRI SARAVANAA ERP — BATCH & BOX STICKERS</h2>
            <p>Batch: <strong>${prod.batchNumber}</strong> | Item: <strong>${prod.finishedGoodProduct?.name}</strong> | Total Stickers: <strong>${totalBoxesCount} Box Labels (${passedPcs} Passed Pcs)</strong></p>
          </div>

          <div class="sticker-grid">
            ${boxCards.map(box => {
              const qrText = `SRI SARAVANAA ERP\nItem: ${prod.finishedGoodProduct?.name || ''} (${prod.finishedGoodProduct?.itemCode || ''})\nBatch: ${prod.batchNumber}\nBox: ${box.boxLabel} (${box.pcsText})\nStorage Temp: ${prod.temperature} °C\nMfg Date: ${new Date(prod.manufacturingDate).toLocaleDateString()}\nExp Date: ${new Date(prod.expiryDate).toLocaleDateString()}\nSelling Price: ₹${prod.sellingPrice?.toFixed(2)}`;
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}`;

              return `
              <div class="sticker-card ${box.isPartial ? 'partial-card' : ''}">
                <div class="brand-header ${box.isPartial ? 'partial-header' : ''}">
                  SRI SARAVANAA ERP • ${box.isPartial ? 'PARTIAL BOX STICKER' : 'BOX STICKER'}
                </div>
                <div class="prod-title">${prod.finishedGoodProduct?.name}</div>
                
                <div class="meta-row">
                  <span>Item Code: <strong>${prod.finishedGoodProduct?.itemCode}</strong></span>
                  <span class="batch-badge">${prod.batchNumber}</span>
                </div>

                <div class="meta-row" style="margin-top: 6px;">
                  <span class="box-badge ${box.isPartial ? 'partial' : ''}">${box.boxLabel}</span>
                  <strong style="color: ${box.isPartial ? '#b45309' : '#047857'}; font-size: 12px;">${box.pcsText}</strong>
                </div>

                <div class="qr-box">
                  <div style="font-family: monospace; font-size: 9px; color: #334155; margin-bottom: 4px;">[ SCANNABLE BOX QR ]</div>
                  <img src="${qrUrl}" alt="Box QR Code" style="width: 110px; height: 110px; margin: 0 auto; display: block; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; background: #fff;" />
                  <div style="font-size: 9px; font-weight: bold; color: #047857; margin-top: 4px;">TEMP: ${prod.temperature} °C</div>
                </div>

                <div class="meta-row">
                  <span>Price: <strong>₹${prod.sellingPrice?.toFixed(2)}</strong></span>
                  <span>Mfg: <strong>${new Date(prod.manufacturingDate).toLocaleDateString()}</strong></span>
                </div>
                <div class="meta-row" style="margin-top: 4px;">
                  <span>Exp: <strong style="color: #be123c;">${new Date(prod.expiryDate).toLocaleDateString()}</strong></span>
                  <span style="font-size: 10px; color: #64748b;">QC Certified</span>
                </div>

                <div class="footer-note">
                  Sri Saravanaa Ice Cream & Dairy Products
                </div>
              </div>
            `;
            }).join('')}
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Factory className="text-[var(--color-primary)]" size={26} />
            Production & Assembly Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Issue raw materials, manufacture finished ice cream goods in Factory Store Room, log cold parameters & perform Finished Goods QC
          </p>
        </div>

        <button
          onClick={handleOpenNewBatchModal}
          className="flex items-center gap-2 bg-white border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-pink-50 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md"
        >
          <Plus size={18} /> Start New Production Batch
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-purple-500">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Factory size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Production Runs</span>
            <h3 className="text-xl font-bold text-gray-900 font-mono mt-0.5">{totalBatches} Batches</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldAlert size={24} />
          </div>
          <div>
            <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">Store Room Pending QC</span>
            <h3 className="text-xl font-bold text-amber-700 font-mono mt-0.5">{pendingQcBatches} Batches</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Box size={24} />
          </div>
          <div>
            <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Factory Output</span>
            <h3 className="text-xl font-bold text-emerald-700 font-mono mt-0.5">
              {totalBoxesProduced.toLocaleString()} Boxes
            </h3>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex justify-between items-center gap-4 mb-6 bg-white/40 p-4 rounded-2xl border border-[var(--color-glass-border)]">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search production no, batch, product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-[var(--color-glass-border)] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <span className="text-xs font-semibold text-gray-500">
          Showing {filteredProductions.length} of {productions.length} production runs
        </span>
      </div>

      {/* Production Runs History Table */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-600 flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
            Loading Production Records...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Production Ref</th>
                  <th className="px-6 py-4">Finished Good Item</th>
                  <th className="px-6 py-4 text-center">Batch Code</th>
                  <th className="px-6 py-4 text-right">Factory Output</th>
                  <th className="px-6 py-4 text-center">Store Temp</th>
                  <th className="px-6 py-4">Issued Raw Materials</th>
                  <th className="px-6 py-4 text-center">QC Lifecycle Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {filteredProductions.map((p) => (
                  <tr key={p._id} className="hover:bg-white/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-gray-700">{p.productionNumber}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {p.finishedGoodProduct?.name}
                      <span className="block font-mono text-[10px] text-gray-400 font-normal">Code: {p.finishedGoodProduct?.itemCode}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-xs font-bold">
                        {p.batchNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">
                      {p.quantityBoxes} Boxes <span className="text-xs text-gray-500 font-normal">({p.totalPieces} Pcs)</span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-blue-700">
                      {p.temperature} °C
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {p.rawMaterialsUsed?.map((rm, idx) => (
                        <div key={idx} className="text-gray-700 font-medium">
                          • {rm.product?.name || 'Material'}: <span className="font-mono font-bold text-rose-600">{rm.quantityUsed} {rm.unitOfMeasure}</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {p.qcStatus === 'STORE_ROOM_PENDING_QC' && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                          <AlertTriangle size={12} /> AWAITING FG QC
                        </span>
                      )}
                      {p.qcStatus === 'QC_PASSED' && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                          <CheckCircle2 size={12} /> QC PASSED • COLD ROOM
                        </span>
                      )}
                      {p.qcStatus === 'QC_PARTIAL_DAMAGE' && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-orange-50 text-orange-800 border border-orange-300 inline-flex items-center gap-1">
                          <ShieldAlert size={12} /> {p.passedPieces || p.passedBoxes * (p.piecesPerBox || 12)} PCS PASSED / {p.damagedPieces || p.damagedBoxes * (p.piecesPerBox || 12)} PCS DAMAGED
                        </span>
                      )}
                      {p.qcStatus === 'QC_REJECTED' && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                          <X size={12} /> QC REJECTED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {p.qcStatus === 'STORE_ROOM_PENDING_QC' ? (
                        <button
                          onClick={() => handleOpenQcModal(p)}
                          className="px-3 py-1.5 text-xs font-extrabold rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition-all shadow-sm inline-flex items-center gap-1.5"
                        >
                          <ShieldCheck size={14} /> Perform QC
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePrintBatchSticker(p)}
                          className="px-3 py-1.5 text-xs font-extrabold rounded-lg bg-white border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-pink-50 transition-all shadow-sm inline-flex items-center gap-1"
                        >
                          <QrCode size={14} /> Batch Sticker
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredProductions.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                      No production batches logged. Click "Start New Production Batch" to manufacture finished goods.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- POPUP MODAL: START NEW PRODUCTION BATCH WIZARD --- */}
      <Modal isOpen={isNewBatchModalOpen} onClose={() => setIsNewBatchModalOpen(false)} title="Assembly & Production Wizard" size="2xl">
        <form onSubmit={handleSubmitBatch} className="space-y-6">

          {/* Wizard Header Progress Bar */}
          <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs font-extrabold gap-2">
            <button
              type="button"
              onClick={() => setWizardStep(1)}
              className={`flex-1 px-3 py-2 rounded-lg transition-all border ${
                wizardStep === 1 
                  ? 'bg-white text-[var(--color-primary)] border-pink-400 shadow-md ring-2 ring-pink-500/20' 
                  : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
              }`}
            >
              1. Finished Product & Target Output
            </button>
            <button
              type="button"
              onClick={() => formData.finishedGoodProduct && formData.quantityBoxes && setWizardStep(2)}
              className={`flex-1 px-3 py-2 rounded-lg transition-all border ${
                wizardStep === 2 
                  ? 'bg-white text-[var(--color-primary)] border-pink-400 shadow-md ring-2 ring-pink-500/20' 
                  : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
              }`}
            >
              2. Raw Material Requisition
            </button>
            <button
              type="button"
              onClick={() => formData.finishedGoodProduct && formData.quantityBoxes && setWizardStep(3)}
              className={`flex-1 px-3 py-2 rounded-lg transition-all border ${
                wizardStep === 3 
                  ? 'bg-white text-[var(--color-primary)] border-pink-400 shadow-md ring-2 ring-pink-500/20' 
                  : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
              }`}
            >
              3. Store Room Entry & Batch Config
            </button>
          </div>

          {/* STEP 1: Finished Product Selection & Box Configuration */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Select Finished Good Product to Produce *</label>
                <SearchableSelect
                  required
                  placeholder="Search & select finished ice cream item..."
                  value={formData.finishedGoodProduct}
                  options={finishedGoods.map(fg => ({
                    value: fg._id,
                    label: fg.name,
                    code: fg.itemCode,
                    sublabel: `Price: ₹${fg.wholesalePrice}`
                  }))}
                  onChange={handleFgSelect}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Batch Code / Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="e.g. BATCH-1"
                    className={`${customInputStyle} font-mono font-bold text-indigo-700`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Target Output Quantity (Boxes) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantityBoxes}
                    onChange={(e) => setFormData({ ...formData, quantityBoxes: e.target.value })}
                    placeholder="e.g. 10 Boxes"
                    className={`${customInputStyle} font-mono`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Packaging Config (Pcs / Box)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.piecesPerBox}
                    onChange={(e) => setFormData({ ...formData, piecesPerBox: e.target.value })}
                    className={`${customInputStyle} font-mono`}
                  />
                </div>
              </div>

              {formData.quantityBoxes > 0 && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-semibold flex justify-between items-center">
                  <span>Calculated Finished Goods Output:</span>
                  <span className="text-base font-extrabold font-mono">
                    {formData.quantityBoxes} Boxes × {formData.piecesPerBox} Pcs = {formData.quantityBoxes * formData.piecesPerBox} Total Pieces
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={!formData.finishedGoodProduct || !formData.quantityBoxes}
                  onClick={() => setWizardStep(2)}
                  className="bg-white border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-pink-50 px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  Next: Raw Material Requisition <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Raw Material Allocation */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Allocate Raw Materials for Issue</h4>
                <button
                  type="button"
                  onClick={handleAddRawMaterialRow}
                  className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add Material Row
                </button>
              </div>

              {formData.rawMaterialsUsed.map((rm, idx) => {
                const selectedMat = rawMaterials.find(m => m._id === rm.product);
                const uom = selectedMat?.unitOfMeasure || 'Units';

                return (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-pink-50/40 border border-pink-100/80 shadow-sm">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                        Raw Material Item
                      </label>
                      <SearchableSelect
                        required
                        placeholder="Search & select raw material..."
                        value={rm.product}
                        options={rawMaterials.map(m => ({
                          value: m._id,
                          label: m.name,
                          code: m.itemCode,
                          sublabel: `UOM: ${m.unitOfMeasure}`
                        }))}
                        onChange={(val) => handleRawMaterialChange(idx, 'product', val)}
                      />
                    </div>

                    <div className="w-48">
                      <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between mb-1">
                        <span>Qty Used *</span>
                        {selectedMat && (
                          <span className="px-2 py-0.5 rounded-md bg-pink-100/90 text-[var(--color-primary)] font-mono text-[10px] font-extrabold border border-pink-200">
                            {uom}
                          </span>
                        )}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={rm.quantityUsed}
                          onChange={(e) => handleRawMaterialChange(idx, 'quantityUsed', e.target.value)}
                          placeholder={`Qty in ${uom}`}
                          className={`${customInputStyle} font-mono ${selectedMat ? 'pr-12' : ''}`}
                        />
                        {selectedMat && (
                          <span className="absolute right-3 font-mono font-bold text-xs text-[var(--color-primary)] pointer-events-none">
                            {uom}
                          </span>
                        )}
                      </div>
                    </div>

                    {formData.rawMaterialsUsed.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRawMaterialRow(idx)}
                        className="text-rose-500 hover:text-rose-700 p-2 mt-5 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                        title="Remove material row"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="bg-white border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-pink-50 px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all shadow-md flex items-center gap-2"
                >
                  Next: Store Room Entry & Pricing <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Store Room Entry & Batch Parameters */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>Batch will be logged in <strong>Factory Store Room</strong> awaiting Finished Goods Quality Control (QC Inspection).</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <ThermometerSnowflake size={14} className="text-blue-500" />
                    Storage Temp (°C) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    className={`${customInputStyle} font-mono`}
                    placeholder="e.g. -18"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Selling Price per Box (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className={`${customInputStyle} font-mono`}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">MRP per Box (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    className={`${customInputStyle} font-mono`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Manufacturing Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.manufacturingDate}
                    onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                    className={customInputStyle}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className={customInputStyle}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Production Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Optional production notes"
                  className={customInputStyle}
                />
              </div>

              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-white border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-pink-50 px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Manufacturing Batch...' : 'Submit Batch & Store in Factory Store Room'}
                </button>
              </div>
            </div>
          )}

        </form>
      </Modal>

      {/* --- POPUP MODAL: FINISHED GOODS QC INSPECTION --- */}
      {isQcModalOpen && selectedProductionForQc && (
        <Modal isOpen={isQcModalOpen} onClose={() => setIsQcModalOpen(false)} title="Finished Goods Quality Control (QC Inspection)" size="xl">
          <form onSubmit={handleSubmitQc} className="space-y-5">
            <div className="p-4 bg-pink-50/60 border border-pink-200 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-extrabold text-gray-900">{selectedProductionForQc.finishedGoodProduct?.name}</span>
                <span className="px-2.5 py-1 rounded bg-indigo-100 text-indigo-800 font-mono text-xs font-extrabold">
                  {selectedProductionForQc.batchNumber}
                </span>
              </div>
              <div className="text-xs text-gray-600 flex flex-wrap gap-4 font-semibold">
                <span>Total Output: <strong>{selectedProductionForQc.quantityBoxes} Boxes ({selectedProductionForQc.totalPieces} Pcs)</strong></span>
                <span>Config: <strong>1 Box = {selectedProductionForQc.piecesPerBox || 12} Pcs</strong></span>
                <span>Storage Temp: <strong>{selectedProductionForQc.temperature} °C</strong></span>
              </div>
            </div>

            {/* Support Piece-Level & Box-Level Precision */}
            <div className="space-y-3 p-4 bg-gray-50/80 rounded-2xl border border-gray-200">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">QC Rejection & Damage Entry:</span>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">Damaged Pieces (Pcs) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      max={selectedProductionForQc.totalPieces}
                      required
                      value={qcForm.damagedPieces}
                      onChange={(e) => {
                        const dPcs = parseFloat(e.target.value) || 0;
                        const pPcs = Math.max(0, selectedProductionForQc.totalPieces - dPcs);
                        const pPerBox = selectedProductionForQc.piecesPerBox || 12;
                        setQcForm({ 
                          ...qcForm, 
                          damagedPieces: dPcs, 
                          passedPieces: pPcs,
                          damagedBoxes: Number((dPcs / pPerBox).toFixed(2)),
                          passedBoxes: Number((pPcs / pPerBox).toFixed(2))
                        });
                      }}
                      className={`${customInputStyle} font-mono font-bold text-rose-700 pr-12`}
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-rose-700">Pcs</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Or Damaged Full Boxes</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      max={selectedProductionForQc.quantityBoxes}
                      value={qcForm.damagedBoxes}
                      onChange={(e) => {
                        const dBoxes = parseFloat(e.target.value) || 0;
                        const pPerBox = selectedProductionForQc.piecesPerBox || 12;
                        const dPcs = dBoxes * pPerBox;
                        const pPcs = Math.max(0, selectedProductionForQc.totalPieces - dPcs);
                        setQcForm({ 
                          ...qcForm, 
                          damagedBoxes: dBoxes, 
                          damagedPieces: dPcs,
                          passedPieces: pPcs,
                          passedBoxes: Number((pPcs / pPerBox).toFixed(2))
                        });
                      }}
                      className={`${customInputStyle} font-mono font-bold text-gray-700 pr-14`}
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-gray-500">Boxes</span>
                  </div>
                </div>
              </div>

              {qcForm.damagedPieces > 0 && (
                <div className="space-y-1 pt-2">
                  <label className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">Rejection / Damage Reason *</label>
                  <select
                    value={qcForm.damageReason}
                    onChange={(e) => setQcForm({ ...qcForm, damageReason: e.target.value })}
                    className="w-full bg-white border border-rose-300 rounded-xl px-4 py-2.5 text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="Melted / Temperature Fluctuated">Melted / Temperature Fluctuated</option>
                    <option value="Defective Packaging / Tear">Defective Packaging / Tear</option>
                    <option value="Flavor / Texture Discrepancy">Flavor / Texture Discrepancy</option>
                    <option value="Weight Under-specification">Weight Under-specification</option>
                    <option value="Damaged during Handling">Damaged during Handling</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">QC Inspector Remarks</label>
              <input
                type="text"
                value={qcForm.remarks}
                onChange={(e) => setQcForm({ ...qcForm, remarks: e.target.value })}
                placeholder="QC checklist notes & findings"
                className={customInputStyle}
              />
            </div>

            {/* Calculation Breakdown Panel */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold">
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-emerald-900 space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">🟢 Passed to Cold Room Sales:</span>
                <span className="text-sm font-extrabold font-mono text-emerald-700 block">
                  {qcForm.passedPieces} Pcs ({Math.floor(qcForm.passedPieces / (selectedProductionForQc.piecesPerBox || 12))} Boxes + {qcForm.passedPieces % (selectedProductionForQc.piecesPerBox || 12)} Loose Pcs)
                </span>
              </div>

              <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-rose-900 space-y-0.5">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">🔴 Damaged to Rejected Stock:</span>
                <span className="text-sm font-extrabold font-mono text-rose-700 block">
                  {qcForm.damagedPieces} Pcs ({Math.floor(qcForm.damagedPieces / (selectedProductionForQc.piecesPerBox || 12))} Boxes + {qcForm.damagedPieces % (selectedProductionForQc.piecesPerBox || 12)} Loose Pcs)
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsQcModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                <ShieldCheck size={16} /> Complete QC & Inward to Cold Room
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ProductionList;
