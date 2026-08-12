import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Factory, Plus, Search, Filter, Printer, Loader2, ThermometerSnowflake, 
  Package, Calendar, CheckCircle2, QrCode, ArrowRight, ShieldCheck, Trash2, X, DollarSign, Box, ShieldAlert, AlertTriangle, Tag 
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
  const [wizardStep, setWizardStep] = useState(1); // 1: Mix & Raw Materials Requisition, 2: Packaging Requisition, 3: Finished Goods & Store Room Submission
  const [submitting, setSubmitting] = useState(false);
  const [selectedMixProduct, setSelectedMixProduct] = useState('');
  const [mixCount, setMixCount] = useState(1);

  // 1st Time Mix Creation State
  const [mixMode, setMixMode] = useState('EXISTING'); // 'EXISTING' | 'NEW'
  const [newMixName, setNewMixName] = useState('');
  const [newMixCode, setNewMixCode] = useState('');
  const [newMixIngredients, setNewMixIngredients] = useState([
    { product: '', quantity: '' }
  ]);

  // Packaging Materials Requisition State
  const [packagingMaterialsUsed, setPackagingMaterialsUsed] = useState([
    { product: '', quantityRequested: '' }
  ]);

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
  const finishedGoods = products.filter(p => p.itemType === 'Finished Goods' || p.itemType?.toLowerCase().includes('good'));
  const rawMaterials = products.filter(p => p.itemType !== 'Finished Goods');
  const mixProducts = products.filter(p => p.itemType?.toLowerCase().includes('mix') || (p.rawMaterials && p.rawMaterials.length > 0));

  // Apply Mix Formula handler (Scaled by Liters)
  const handleApplyMixFormula = () => {
    if (!selectedMixProduct) return alert('Please select a Mix formula.');
    const mixItem = products.find(p => p._id === selectedMixProduct);
    if (!mixItem || !mixItem.rawMaterials || mixItem.rawMaterials.length === 0) {
      return alert('The selected Mix item does not have any raw materials configured in its recipe master. You can create/edit recipes in Products Master!');
    }
    const targetLiters = parseFloat(mixCount) || 1;
    const newRows = mixItem.rawMaterials.map(rm => {
      const pId = rm.product?._id || rm.product;
      const baseQty = parseFloat(rm.quantity) || 0;
      const scaledQty = baseQty * targetLiters;
      return {
        product: pId,
        quantityUsed: scaledQty.toString(),
        batchNumber: 'STORE-RM'
      };
    });

    setFormData(prev => ({
      ...prev,
      rawMaterialsUsed: newRows
    }));
    alert(`Applied "${mixItem.name}" formula recipe for ${targetLiters} Liters! Auto-populated ${newRows.length} raw materials for batch requisition.`);
  };

  const packagingMaterials = products.filter(p => 
    p.itemType === 'Packing Material' || p.itemType === 'Packaging' || p.category === 'Packaging'
  );

  const handleAddNewMixIngredientRow = () => {
    setNewMixIngredients(prev => [...prev, { product: '', quantity: '' }]);
  };

  const handleRemoveNewMixIngredientRow = (idx) => {
    setNewMixIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const handleNewMixIngredientChange = (idx, field, val) => {
    const updated = [...newMixIngredients];
    updated[idx][field] = val;
    setNewMixIngredients(updated);
  };

  const handleAddPackagingRow = () => {
    setPackagingMaterialsUsed(prev => [...prev, { product: '', quantityRequested: '' }]);
  };

  const handleRemovePackagingRow = (idx) => {
    setPackagingMaterialsUsed(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePackagingChange = (idx, field, val) => {
    const updated = [...packagingMaterialsUsed];
    updated[idx][field] = val;
    setPackagingMaterialsUsed(updated);
  };

  const handleCreateNewMixAndApply = async () => {
    if (!newMixName.trim()) return alert('Please enter a Mix Formula Name.');
    if (newMixIngredients.length === 0 || !newMixIngredients[0].product) {
      return alert('Please select at least 1 raw material ingredient for 1 Liter of this Mix.');
    }
    const targetLiters = parseFloat(mixCount) || 1;

    try {
      setSubmitting(true);
      const code = newMixCode || `MIX-${Date.now().toString().slice(-4)}`;
      const res = await api.post('/products', {
        name: newMixName,
        itemCode: code,
        itemType: 'Mix',
        category: 'Dairy',
        unitOfMeasure: 'Litre',
        rawMaterials: newMixIngredients.map(ing => ({
          product: ing.product,
          quantity: parseFloat(ing.quantity) || 0
        }))
      });

      const createdProduct = res.data?.data;
      alert(`New Mix Formula "${newMixName}" created and saved to Products Master!`);
      
      fetchInitialData();
      if (createdProduct) {
        setSelectedMixProduct(createdProduct._id);
        const newRows = newMixIngredients.map(rm => ({
          product: rm.product,
          quantityUsed: ((parseFloat(rm.quantity) || 0) * targetLiters).toString(),
          batchNumber: 'STORE-RM'
        }));
        setFormData(prev => ({ ...prev, rawMaterialsUsed: newRows }));
        setMixMode('EXISTING');
      }
    } catch (err) {
      console.error('Failed to create new Mix Formula', err);
      alert(err.response?.data?.message || 'Error creating new Mix formula');
    } finally {
      setSubmitting(false);
    }
  };

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
                  <th className="px-6 py-4">Finished Good Item (Click for Details)</th>
                  <th className="px-6 py-4 text-center">Batch Code</th>
                  <th className="px-6 py-4 text-right">Requested Output</th>
                  <th className="px-6 py-4 text-center">Production Lifecycle Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {filteredProductions.map((p) => {
                  const reqId = p.productionNumber || `PR-${p._id.slice(-4)}`;
                  const isExpanded = expandedRowId === p._id;
                  const isPendingStoreRoom = !p.status || p.status === 'PENDING_STORE_ROOM_DISPATCH';
                  const isDispatched = p.status === 'DISPATCHED_TO_PRODUCTION';
                  const isInProduction = p.status === 'IN_PRODUCTION';
                  const isCompleted = p.status === 'PRODUCTION_COMPLETED';
                  const isSentToQc = p.status === 'SENT_TO_QC';
                  const isQcApproved = p.status === 'QC_APPROVED' || p.qcStatus === 'PASSED';

                  return (
                    <React.Fragment key={p._id}>
                      <tr className="hover:bg-white/60 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-black text-purple-900">{reqId}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <button
                            type="button"
                            onClick={() => setExpandedRowId(isExpanded ? null : p._id)}
                            className="text-left font-extrabold text-purple-900 hover:text-purple-700 hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <Package size={16} className="text-purple-600 shrink-0" />
                            {p.finishedGoodProduct?.name || 'Finished Product'}
                            <span className="text-[10px] text-purple-600 font-normal">({isExpanded ? '▲ hide materials' : '▼ view materials'})</span>
                          </button>
                          <span className="block font-mono text-[10px] text-gray-400 font-normal ml-5">Code: {p.finishedGoodProduct?.itemCode}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-xs font-bold">
                            {p.batchNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                          <span className="text-sm font-black text-purple-900 block">{p.totalPieces || p.quantityBoxes * 12} Pcs</span>
                          <span className="text-xs text-gray-500 font-semibold block">({p.quantityBoxes} Boxes)</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isPendingStoreRoom && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                              <Clock size={12} className="text-amber-600" /> Store Room Request Sent
                            </span>
                          )}
                          {isDispatched && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-300 inline-flex items-center gap-1">
                              <Package size={12} className="text-blue-600" /> Stock Dispatched by Store Room
                            </span>
                          )}
                          {isInProduction && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-800 border border-purple-300 inline-flex items-center gap-1 animate-pulse">
                              <Factory size={12} className="text-purple-600" /> In Production Run
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-600" /> Production Completed ({p.producedPieces || p.totalPieces} Pcs)
                            </span>
                          )}
                          {isSentToQc && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-300 inline-flex items-center gap-1">
                              <ShieldCheck size={12} className="text-indigo-600" /> Sent to Finished Goods QC
                            </span>
                          )}
                          {isQcApproved && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-950 border border-emerald-400 inline-flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-700" /> QC Approved & Stock Inwarded
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isPendingStoreRoom && (
                            <span className="text-xs text-amber-700 font-semibold italic">Awaiting Store Room Dispatch</span>
                          )}
                          {isDispatched && (
                            <button
                              onClick={() => handleStartProduction(p._id, reqId)}
                              disabled={submitting}
                              className="px-3 py-1.5 text-xs font-extrabold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer"
                            >
                              <Factory size={14} /> Start Production
                            </button>
                          )}
                          {isInProduction && (
                            <button
                              onClick={() => handleOpenCompleteModal(p)}
                              disabled={submitting}
                              className="px-3 py-1.5 text-xs font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer"
                            >
                              <CheckCircle2 size={14} /> Complete Production
                            </button>
                          )}
                          {isCompleted && (
                            <button
                              onClick={() => handleSendToQc(p._id, reqId)}
                              disabled={submitting}
                              className="px-3 py-1.5 text-xs font-extrabold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer"
                            >
                              <ArrowRight size={14} /> Send to QC
                            </button>
                          )}
                          {(isSentToQc || isQcApproved) && (
                            <span className="text-xs text-emerald-800 font-bold">Processed in QC Module</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Materials Breakdown Drawer */}
                      {isExpanded && (
                        <tr className="bg-purple-50/40">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white p-3 rounded-2xl border border-purple-200 space-y-1">
                                <h5 className="text-[11px] font-black text-purple-950 uppercase tracking-wider">Allocated Raw Materials:</h5>
                                <ul className="space-y-1 text-xs">
                                  {p.rawMaterialsUsed?.map((rm, idx) => (
                                    <li key={idx} className="flex justify-between border-b border-gray-100 py-1">
                                      <span className="font-semibold text-gray-800">{rm.product?.name || 'Raw Material'}</span>
                                      <span className="font-mono font-bold text-purple-900">{rm.quantityUsed} {rm.unitOfMeasure}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="bg-white p-3 rounded-2xl border border-indigo-200 space-y-1">
                                <h5 className="text-[11px] font-black text-indigo-950 uppercase tracking-wider">Allocated Packaging Materials:</h5>
                                <ul className="space-y-1 text-xs">
                                  {p.packagingMaterialsUsed?.map((pkg, idx) => (
                                    <li key={idx} className="flex justify-between border-b border-gray-100 py-1">
                                      <span className="font-semibold text-gray-800">{pkg.product?.name || 'Packaging Item'}</span>
                                      <span className="font-mono font-bold text-indigo-900">{pkg.quantityRequested} {pkg.unitOfMeasure}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
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
              className={`flex-1 px-3 py-2 rounded-lg transition-all border cursor-pointer ${
                wizardStep === 1 
                  ? 'bg-white text-purple-900 border-purple-400 shadow-md ring-2 ring-purple-500/20' 
                  : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
              }`}
            >
              1. Mix Raw Material Requisition
            </button>
            <button
              type="button"
              onClick={() => setWizardStep(2)}
              className={`flex-1 px-3 py-2 rounded-lg transition-all border cursor-pointer ${
                wizardStep === 2 
                  ? 'bg-white text-indigo-900 border-indigo-400 shadow-md ring-2 ring-indigo-500/20' 
                  : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
              }`}
            >
              2. Packaging Material Requisition
            </button>
            <button
              type="button"
              onClick={() => setWizardStep(3)}
              className={`flex-1 px-3 py-2 rounded-lg transition-all border cursor-pointer ${
                wizardStep === 3 
                  ? 'bg-white text-[var(--color-primary)] border-pink-400 shadow-md ring-2 ring-pink-500/20' 
                  : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
              }`}
            >
              3. Finished Goods & Store Room Submission
            </button>
          </div>

          {/* STEP 1: MIX RAW MATERIAL REQUISITION (STORE ROOM REQUEST) */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              
              {/* MIX MODE TOGGLE BAR */}
              <div className="flex items-center gap-2 bg-purple-50 p-1.5 rounded-xl border border-purple-200">
                <button
                  type="button"
                  onClick={() => setMixMode('EXISTING')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mixMode === 'EXISTING'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  Select Existing Mix Formula
                </button>
                <button
                  type="button"
                  onClick={() => setMixMode('NEW')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mixMode === 'NEW'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  + Create New Mix Formula (1st Time)
                </button>
              </div>

              {/* OPTION A: EXISTING MIX FORMULA */}
              {mixMode === 'EXISTING' ? (
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-purple-950 font-extrabold text-xs uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                      <Package size={16} className="text-purple-600" />
                      Select Mix Formula to Auto-Calculate Raw Materials (Scaled by Liters)
                    </span>
                    <span className="text-[10px] text-purple-700 font-semibold lowercase">
                      Managed in Products Master
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-6 space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 block">Select Mix Formula *</label>
                      <SearchableSelect
                        placeholder="Select Mix formula from Master..."
                        value={selectedMixProduct}
                        options={mixProducts.map(m => ({
                          value: m._id,
                          label: `${m.name} (${m.itemCode})`,
                          code: m.itemCode,
                          sublabel: `Contains ${m.rawMaterials?.length || 0} raw materials (per 1L)`
                        }))}
                        onChange={(val) => setSelectedMixProduct(val)}
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 block">Target Mix Volume (Liters) *</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={mixCount}
                        onChange={(e) => setMixCount(e.target.value)}
                        placeholder="e.g. 250 L"
                        className={`${customInputStyle} font-mono font-bold text-purple-900 border-purple-300`}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <button
                        type="button"
                        onClick={handleApplyMixFormula}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-3 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Scale & Apply Recipe
                      </button>
                    </div>
                  </div>

                  {selectedMixProduct && (
                    <div className="mt-2.5 p-2.5 bg-purple-100/90 border border-purple-300 rounded-xl flex items-center justify-between text-xs font-extrabold text-purple-950 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Tag size={15} className="text-purple-700" />
                        <span>Selected Mix Item Code:</span>
                      </div>
                      <span className="font-mono text-sm font-black text-purple-900 px-2.5 py-0.5 bg-white rounded-lg border border-purple-300 shadow-xs">
                        {mixProducts.find(m => m._id === selectedMixProduct)?.itemCode || 'MIX-001'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* OPTION B: CREATE NEW MIX FORMULA (1ST TIME) */
                <div className="p-4 bg-purple-50/90 border border-purple-300 rounded-2xl space-y-4 shadow-sm">
                  <div className="flex justify-between items-center text-purple-950 font-extrabold text-xs uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                      <Plus size={16} className="text-purple-600" />
                      Create New Mix Recipe Record (Saved to Products Master for Future Use)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 block">Mix Formula Name *</label>
                      <input
                        type="text"
                        required
                        value={newMixName}
                        onChange={(e) => {
                          const nameVal = e.target.value;
                          setNewMixName(nameVal);
                          if (nameVal.trim()) {
                            const codeGen = 'MIX-' + nameVal.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 16);
                            setNewMixCode(codeGen);
                          } else {
                            setNewMixCode('');
                          }
                        }}
                        placeholder="e.g. Caramel Popcorn Ice Cream Base Mix"
                        className={`${customInputStyle} font-bold`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 block">Auto-Generated Item Code *</label>
                      <input
                        type="text"
                        required
                        value={newMixCode}
                        onChange={(e) => setNewMixCode(e.target.value)}
                        placeholder="e.g. MIX-POPCORN-001"
                        className={`${customInputStyle} font-mono font-bold text-purple-950 bg-purple-50/50 border-purple-300`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 block">Target Volume to Produce (Liters) *</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={mixCount}
                        onChange={(e) => setMixCount(e.target.value)}
                        placeholder="e.g. 500 L"
                        className={`${customInputStyle} font-mono font-bold text-purple-900 border-purple-300`}
                      />
                    </div>
                  </div>

                  {/* 1-Liter Ingredient Rows Grid */}
                  <div className="space-y-2 pt-2 border-t border-purple-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-extrabold text-purple-900 uppercase">Select Raw Material Ingredients (Proportions per 1 Liter of Mix)</span>
                      <button
                        type="button"
                        onClick={handleAddNewMixIngredientRow}
                        className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
                      >
                        + Add Ingredient
                      </button>
                    </div>

                    {newMixIngredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-purple-200">
                        <div className="flex-1">
                          <SearchableSelect
                            placeholder="Select Raw Material..."
                            value={ing.product}
                            options={rawMaterials.map(m => ({
                              value: m._id,
                              label: m.name,
                              code: m.itemCode,
                              sublabel: `UOM: ${m.unitOfMeasure}`
                            }))}
                            onChange={(val) => handleNewMixIngredientChange(idx, 'product', val)}
                          />
                        </div>
                        <div className="w-36">
                          <input
                            type="number"
                            step="0.001"
                            placeholder="Qty per 1 Ltr"
                            value={ing.quantity}
                            onChange={(e) => handleNewMixIngredientChange(idx, 'quantity', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 font-mono font-bold"
                          />
                        </div>
                        {newMixIngredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveNewMixIngredientRow(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateNewMixAndApply}
                    className="w-full bg-purple-700 hover:bg-purple-800 text-white py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Save Mix Formula to Master & Apply Requisition
                  </button>
                </div>
              )}

              {/* REQUISITION RAW MATERIALS LIST */}
              <div className="flex justify-between items-center pt-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Allocated Raw Materials Store Room Requisition List</h4>
                <button
                  type="button"
                  onClick={handleAddRawMaterialRow}
                  className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add Raw Material Row
                </button>
              </div>

              {formData.rawMaterialsUsed.map((rm, idx) => {
                const selectedMat = rawMaterials.find(m => m._id === rm.product);
                const uom = selectedMat?.unitOfMeasure || 'Units';

                return (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-purple-50/40 border border-purple-100 shadow-sm">
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
                        <span>Qty Needed *</span>
                        {selectedMat && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-mono text-[10px] font-extrabold border border-purple-200">
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
                          <span className="absolute right-3 font-mono font-bold text-xs text-purple-900 pointer-events-none">
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

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="bg-white border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  Next: Packaging Material Requisition <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PACKAGING MATERIAL REQUISITION */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <Box size={16} className="text-indigo-600" />
                    Packaging Materials Requisition (Store Room Request)
                  </h3>
                  <p className="text-[10px] text-indigo-700 mt-0.5 font-medium">Select tubs, cups, lids, sticks, outer corrugated boxes, & foils to be issued from Store Room for packing</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddPackagingRow}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Plus size={14} /> Add Packaging Material
                </button>
              </div>

              {packagingMaterialsUsed.map((pkg, idx) => {
                const selectedPkg = packagingMaterials.find(m => m._id === pkg.product);
                const uom = selectedPkg?.unitOfMeasure || 'Pcs';

                return (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 shadow-sm">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                        Packaging Material Item
                      </label>
                      <SearchableSelect
                        placeholder="Search & select packaging item (e.g. Tub 250ml, Paper Cup, Box)..."
                        value={pkg.product}
                        options={packagingMaterials.map(m => ({
                          value: m._id,
                          label: m.name,
                          code: m.itemCode,
                          sublabel: `UOM: ${m.unitOfMeasure}`
                        }))}
                        onChange={(val) => handlePackagingChange(idx, 'product', val)}
                      />
                    </div>

                    <div className="w-48">
                      <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between mb-1">
                        <span>Requested Qty *</span>
                        {selectedPkg && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-mono text-[10px] font-extrabold border border-indigo-200">
                            {uom}
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.quantityRequested}
                        onChange={(e) => handlePackagingChange(idx, 'quantityRequested', e.target.value)}
                        placeholder={`Qty in ${uom}`}
                        className={`${customInputStyle} font-mono text-indigo-950 font-bold`}
                      />
                    </div>

                    {packagingMaterialsUsed.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePackagingRow(idx)}
                        className="text-rose-500 hover:text-rose-700 p-2 mt-5 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                        title="Remove packaging row"
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
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="bg-white border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-pink-50 px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  Next: Finished Goods & Store Room Submission <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: FINISHED GOODS OUTPUT & STORE ROOM SUBMISSION */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Requisition will be sent directly to <strong>Factory Store Room</strong> for stock issue & dispatch.</span>
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold font-mono text-purple-900 uppercase tracking-wider block mb-1">Target Output Quantity (Pcs) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.totalPieces || ''}
                    onChange={(e) => {
                      const pcs = parseFloat(e.target.value) || 0;
                      const pPerBox = parseInt(formData.piecesPerBox) || 12;
                      const boxes = Number((pcs / pPerBox).toFixed(2));
                      setFormData({ ...formData, totalPieces: pcs, quantityBoxes: boxes });
                    }}
                    placeholder="e.g. 240 Pcs"
                    className={`${customInputStyle} font-mono font-black text-purple-950 border-purple-300 bg-purple-50/40 text-base`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Calculated Output (Boxes)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    value={formData.quantityBoxes || ''}
                    onChange={(e) => {
                      const boxes = parseFloat(e.target.value) || 0;
                      const pPerBox = parseInt(formData.piecesPerBox) || 12;
                      const pcs = boxes * pPerBox;
                      setFormData({ ...formData, quantityBoxes: boxes, totalPieces: pcs });
                    }}
                    placeholder="e.g. 10 Boxes"
                    className={`${customInputStyle} font-mono font-bold text-gray-800`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Packaging Config (Pcs / Box)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.piecesPerBox}
                    onChange={(e) => {
                      const pPerBox = parseInt(e.target.value) || 12;
                      const pcs = parseFloat(formData.totalPieces) || 0;
                      const boxes = Number((pcs / pPerBox).toFixed(2));
                      setFormData({ ...formData, piecesPerBox: pPerBox, quantityBoxes: boxes });
                    }}
                    className={`${customInputStyle} font-mono font-bold`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Production Requisition Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Optional material requisition notes for Store Room"
                  className={customInputStyle}
                />
              </div>

              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? 'Submitting Requisition...' : 'Submit Material Requisition to Store Room'}
                </button>
              </div>
            </div>
          )}

        </form>
      </Modal>

      {/* --- POPUP MODAL: COMPLETE PRODUCTION PHASE --- */}
      {isCompleteModalOpen && selectedProdForCompletion && (
        <Modal isOpen={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)} title="Complete Production Phase" size="md">
          <form onSubmit={handleSubmitCompletion} className="space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-base font-extrabold text-purple-950">{selectedProdForCompletion.finishedGoodProduct?.name}</span>
                <span className="font-mono text-xs font-black text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-300">
                  ID: {selectedProdForCompletion.productionNumber || `PR-${selectedProdForCompletion._id.slice(-4)}`}
                </span>
              </div>
              <p className="text-xs text-purple-800 font-semibold">
                Batch Code: <strong>{selectedProdForCompletion.batchNumber || 'BATCH-1'}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Requested Output (Non-Editable)</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedProdForCompletion.totalPieces || selectedProdForCompletion.quantityBoxes * 12} Pcs (${selectedProdForCompletion.quantityBoxes} Boxes)`}
                  className="w-full bg-gray-200/80 border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-mono font-black text-gray-700 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-900 uppercase tracking-wider block mb-1">Actual Produced Pieces Count (Pcs) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={actualProducedPieces}
                  onChange={(e) => setActualProducedPieces(e.target.value)}
                  placeholder="e.g. 480"
                  className="w-full bg-white border-2 border-purple-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-purple-950 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={16} /> Complete & Save Produced Output
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ProductionList;
