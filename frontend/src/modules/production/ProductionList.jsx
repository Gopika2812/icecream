import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { 
  Factory, Plus, Search, Filter, Printer, Loader2, ThermometerSnowflake, 
  Package, Calendar, CheckCircle2, QrCode, ArrowRight, ShieldCheck, Trash2, X, DollarSign, Box, ShieldAlert, AlertTriangle, Tag, Clock, ShoppingCart
} from 'lucide-react';
import Modal from '../../components/Modal';
import SearchableSelect from '../../components/SearchableSelect';
import { QRCodeSVG } from 'qrcode.react';

const ProductionList = () => {
  const [productions, setProductions] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterialStock, setRawMaterialStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingReqId, setSendingReqId] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [selectedProductionForQc, setSelectedProductionForQc] = useState(null);

  // QR Code Color Settings
  const [qrFgColor, setQrFgColor] = useState('#000000');
  const [qrBgColor, setQrBgColor] = useState('#FFFFFF');

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

  // Production Execution & Completion Modal State
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedProdForCompletion, setSelectedProdForCompletion] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    piecesPerBox: 12,
    actualProducedBoxes: '',
    actualProducedPieces: ''
  });

  // Box QR Generation Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [currentQrStickers, setCurrentQrStickers] = useState([]);

  const handleOpenQrModal = (prod) => {
    const pPerBox = parseInt(prod.piecesPerBox) || 12;
    const totalPcs = parseInt(prod.totalPieces) || (parseInt(prod.quantityBoxes) * pPerBox) || 0;
    const totalBoxes = Math.ceil(totalPcs / pPerBox) || 1;
    const reqId = prod.productionNumber || `PR-${prod._id.slice(-4)}`;
    const fgName = prod.finishedGoodProduct?.name || 'Finished Product';
    const fgCode = prod.finishedGoodProduct?.itemCode || 'FG-ITEM';

    const stickers = [];
    for (let b = 1; b <= totalBoxes; b++) {
      const isLastBox = b === totalBoxes;
      const loosePcs = totalPcs % pPerBox;
      const pcsInThisBox = (isLastBox && loosePcs > 0) ? loosePcs : pPerBox;

      stickers.push({
        boxIndex: b,
        totalBoxes,
        qrCodeText: JSON.stringify({
          brand: 'SRI SARAVANAA ERP',
          productionId: reqId,
          batchNumber: prod.batchNumber || 'BATCH-1',
          product: fgName,
          itemCode: fgCode,
          boxNumber: `${b} / ${totalBoxes}`,
          piecesInBox: pcsInThisBox,
          mfgDate: new Date().toISOString().split('T')[0]
        })
      });
    }

    setCurrentQrStickers(stickers);
    setIsQrModalOpen(true);
  };

  const handleStartProduction = async (id, code) => {
    try {
      setSubmitting(true);
      const res = await api.post(`/production/${id}/start-production`);
      alert(res.data?.message || `Production started for ${code}!`);
      fetchInitialData();
    } catch (err) {
      console.error('Failed to start production', err);
      alert(err.response?.data?.message || 'Error starting production');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCompleteModal = (prod) => {
    const ppb = prod.piecesPerBox || 12;
    const boxes = prod.quantityBoxes || (prod.totalPieces ? Number((prod.totalPieces / ppb).toFixed(2)) : '');
    const pcs = prod.totalPieces || (prod.quantityBoxes ? (prod.quantityBoxes * ppb) : '');

    setSelectedProdForCompletion(prod);
    setCompletionForm({
      piecesPerBox: ppb,
      actualProducedBoxes: boxes,
      actualProducedPieces: pcs
    });
    setIsCompleteModalOpen(true);
  };

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();
    if (!selectedProdForCompletion) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/production/${selectedProdForCompletion._id}/complete-production`, {
        actualProducedPieces: parseInt(completionForm.actualProducedPieces) || selectedProdForCompletion.totalPieces,
        piecesPerBox: parseInt(completionForm.piecesPerBox) || selectedProdForCompletion.piecesPerBox || 12
      });
      alert(res.data?.message || 'Production completed & stock inwarded!');
      setIsCompleteModalOpen(false);
      fetchInitialData();
    } catch (err) {
      console.error('Failed to complete production', err);
      alert(err.response?.data?.message || 'Error completing production');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendToQc = async (id, code) => {
    try {
      setSubmitting(true);
      const res = await api.post(`/production/${id}/send-to-qc`);
      alert(res.data?.message || `Batch ${code} sent to Finished Goods QC!`);
      fetchInitialData();
    } catch (err) {
      console.error('Failed to send to QC', err);
      alert(err.response?.data?.message || 'Error sending to QC');
    } finally {
      setSubmitting(false);
    }
  };

  const getProductName = (prodRef, defaultFallback = 'Item') => {
    const prodId = typeof prodRef === 'object' ? (prodRef._id || prodRef.id) : prodRef;
    const found = products.find(p => (p._id || p.id) === prodId);
    return found ? found.name : defaultFallback;
  };

  const getStoreRoomAvailableStock = (productId) => {
    if (!productId) return 0;
    if (!Array.isArray(rawMaterialStock)) return 0;
    const prodIdStr = typeof productId === 'object' ? (productId._id || productId.id) : productId.toString();
    return rawMaterialStock
      .filter(i => {
        if (!i) return false;
        const pId = typeof i.product === 'object' ? (i.product?._id || i.product?.id) : i.product;
        return pId?.toString() === prodIdStr && (i.inventoryType === 'Store Room' || i.inventoryType === 'Factory');
      })
      .reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0);
  };

  const handleSendPurchaseRequisition = async (prodRef, quantityNeeded) => {
    if (!prodRef) return alert('Please select a valid item.');
    const prodId = typeof prodRef === 'object' ? (prodRef._id || prodRef.id) : prodRef;
    const prodObj = products.find(p => (p._id || p.id) === prodId) || (typeof prodRef === 'object' ? prodRef : null);
    const prodName = prodObj ? prodObj.name : 'Out of Stock Item';
    const uom = prodObj ? prodObj.unitOfMeasure : 'Units';

    try {
      setSendingReqId(prodId);
      const payload = {
        items: [{
          product: prodId,
          requestedQuantity: parseFloat(quantityNeeded) || 10,
          currentStock: getStoreRoomAvailableStock(prodId),
          unitOfMeasure: uom
        }],
        priority: 'HIGH',
        remarks: `Out-of-stock production floor indent for ${prodName}`
      };

      const res = await api.post('/product-requisitions', payload);
      alert(`✅ Purchase Requisition successfully sent to Purchase Team & Super Admin for "${prodName}"! (Appears on Product Purchase Requisitions page).`);
    } catch (err) {
      console.error('Failed to send purchase requisition', err);
      alert(err.response?.data?.message || 'Error sending purchase requisition to Purchase Team.');
    } finally {
      setSendingReqId(null);
    }
  };

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

  // Requisition Type State
  const [activeReqType, setActiveReqType] = useState('MIX_REQUISITION'); // 'MIX_REQUISITION' | 'FG_ASSEMBLY_REQUISITION'

  // Open New Batch Modal with auto-incremented batch code
  const handleOpenNewBatchModal = (type = 'MIX_REQUISITION') => {
    const nextBatchNum = `BATCH-${productions.length + 1}`;
    setActiveReqType(type);
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

    const isMix = activeReqType === 'MIX_REQUISITION';

    if (isMix) {
      if (mixMode === 'EXISTING' && !selectedMixProduct) {
        return alert('Please select a mix formula from master.');
      }
      if (mixMode === 'NEW' && (!newMixName.trim() || !newMixCode.trim())) {
        return alert('Please enter new mix formula name and item code.');
      }
      if (!mixCount || parseFloat(mixCount) <= 0) {
        return alert('Please enter target mix volume in Liters.');
      }
    } else {
      if (!formData.finishedGoodProduct) return alert('Please select a finished good product.');
      if (!formData.quantityBoxes || parseFloat(formData.quantityBoxes) <= 0) return alert('Please enter target output in Pcs/Boxes.');
    }

    // STRICT STORE ROOM STOCK VALIDATION BEFORE SUBMISSION
    // 1. Prepared Mix Stock Check (for FG Assembly)
    if (!isMix && selectedMixProduct) {
      const availMix = getStoreRoomAvailableStock(selectedMixProduct);
      const neededLiters = parseFloat(mixCount) || 1;
      if (availMix < neededLiters) {
        const mixObj = products.find(p => (p._id || p.id) === selectedMixProduct);
        return alert(`🔴 SUBMISSION BLOCKED: Prepared Mix Product "${mixObj?.name || 'Selected Mix'}" is OUT OF STOCK / Insufficient in Store Room Inventory! (Available: ${availMix} Liters, Needed: ${neededLiters} Liters). Please request Mix Preparation first!`);
      }
    }

    // 2. Extra Raw Materials / Add-ons Stock Check
    if (Array.isArray(formData.rawMaterialsUsed)) {
      for (const rm of formData.rawMaterialsUsed) {
        const qtyNeeded = parseFloat(rm.quantityUsed) || 0;
        if (qtyNeeded > 0 && rm.product) {
          const avail = getStoreRoomAvailableStock(rm.product);
          if (avail < qtyNeeded) {
            const matObj = rawMaterials.find(m => m._id === rm.product);
            const matName = matObj ? matObj.name : 'Extra Raw Material';
            return alert(`🔴 SUBMISSION BLOCKED: Extra Raw Material / Add-on "${matName}" is OUT OF STOCK / Insufficient in Store Room! (Available Stock: ${avail} ${matObj?.unitOfMeasure || ''}, Requested: ${qtyNeeded}). Please send restock reminder to Purchase Team!`);
          }
        }
      }
    }

    // 3. Packaging Materials Stock Check
    if (Array.isArray(packagingMaterialsUsed)) {
      for (const pkg of packagingMaterialsUsed) {
        const qtyReq = parseFloat(pkg.quantityRequested) || 0;
        if (qtyReq > 0 && pkg.product) {
          const avail = getStoreRoomAvailableStock(pkg.product);
          if (avail < qtyReq) {
            const pkgObj = packagingMaterials.find(m => m._id === pkg.product);
            const pkgName = pkgObj ? pkgObj.name : 'Packaging Material';
            return alert(`🔴 SUBMISSION BLOCKED: Packaging Material "${pkgName}" is OUT OF STOCK / Insufficient in Store Room! (Available Stock: ${avail} ${pkgObj?.unitOfMeasure || 'Pcs'}, Requested: ${qtyReq}). Please send restock reminder to Purchase Team!`);
          }
        }
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        requisitionType: activeReqType,
        batchNumber: formData.batchNumber || `BATCH-${productions.length + 1}`,
        mixProduct: isMix ? (mixMode === 'NEW' ? { name: newMixName, itemCode: newMixCode } : selectedMixProduct) : selectedMixProduct,
        mixLiters: parseFloat(mixCount) || 0,
        quantityBoxes: parseFloat(formData.quantityBoxes) || 1,
        piecesPerBox: parseInt(formData.piecesPerBox) || 12,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        mrp: parseFloat(formData.mrp) || 0,
        temperature: parseFloat(formData.temperature) || -18,
        packagingMaterialsUsed,
        essenceMaterialsUsed: []
      };

      const response = await api.post('/production', payload);

      alert(response.data.message || `${isMix ? 'Mix Preparation' : 'Finished Goods Assembly'} Requisition Submitted to Factory Store Room!`);
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
    <div className="p-6 space-y-6">
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenNewBatchModal('MIX_REQUISITION')}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer"
          >
            <Plus size={16} /> 🥣 Request Mix Preparation
          </button>
          <button
            onClick={() => handleOpenNewBatchModal('FG_ASSEMBLY_REQUISITION')}
            className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer"
          >
            <Plus size={16} /> 🍦 Request FG Assembly
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-rose-500">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
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
                        <td className="px-6 py-4 font-mono text-xs font-black text-rose-900">{reqId}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <button
                            type="button"
                            onClick={() => setExpandedRowId(isExpanded ? null : p._id)}
                            className="text-left font-extrabold text-rose-900 hover:text-rose-700 hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <Package size={16} className="text-rose-600 shrink-0" />
                            {p.finishedGoodProduct?.name || 'Finished Product'}
                            <span className="text-[10px] text-rose-600 font-normal">({isExpanded ? '▲ hide materials' : '▼ view materials'})</span>
                          </button>
                          <span className="block font-mono text-[10px] text-gray-400 font-normal ml-5">Code: {p.finishedGoodProduct?.itemCode}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-xs font-bold">
                            {p.batchNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                          <span className="text-sm font-black text-rose-900 block">{p.totalPieces || p.quantityBoxes * 12} Pcs</span>
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
                            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-800 border border-rose-300 inline-flex items-center gap-1 animate-pulse">
                              <Factory size={12} className="text-rose-600" /> In Production Run
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
                            <div className="flex flex-col items-center gap-1.5">
                              {p.requisitionType !== 'MIX_REQUISITION' && (
                                <button
                                  onClick={() => handleOpenQrModal(p)}
                                  className="px-3 py-1.5 text-xs font-extrabold rounded-xl bg-rose-50 text-rose-900 border border-rose-300 hover:bg-rose-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <QrCode size={14} /> Print Box QRs
                                </button>
                              )}

                              <button
                                onClick={() => handleStartProduction(p._id, reqId)}
                                disabled={submitting}
                                className="px-3 py-1.5 text-xs font-extrabold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                              >
                                <Factory size={14} /> Start Production
                              </button>
                            </div>
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
                          {(isCompleted || isSentToQc || isQcApproved) && (
                            <div className="flex flex-col items-center gap-1.5">
                              {p.requisitionType !== 'MIX_REQUISITION' && (
                                <button
                                  onClick={() => handleOpenQrModal(p)}
                                  className="px-3 py-1.5 text-xs font-extrabold rounded-xl bg-rose-50 text-rose-900 border border-rose-300 hover:bg-rose-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <QrCode size={14} /> Print Box QRs
                                </button>
                              )}
                              <span className="text-xs text-emerald-800 font-extrabold flex items-center gap-1">
                                <CheckCircle2 size={14} /> Inwarded & Completed
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Materials Breakdown Drawer */}
                      {isExpanded && (
                        <tr className="bg-rose-50/40">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white p-3 rounded-2xl border border-rose-200 space-y-1">
                                <h5 className="text-[11px] font-black text-rose-950 uppercase tracking-wider">Allocated Raw Materials:</h5>
                                <ul className="space-y-1 text-xs">
                                  {p.rawMaterialsUsed?.map((rm, idx) => (
                                    <li key={idx} className="flex justify-between border-b border-gray-100 py-1">
                                      <span className="font-extrabold text-rose-950">{getProductName(rm.product, rm.productName || 'Raw Material')}</span>
                                      <span className="font-mono font-bold text-rose-900">{rm.quantityUsed} {rm.unitOfMeasure}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="bg-white p-3 rounded-2xl border border-indigo-200 space-y-1">
                                <h5 className="text-[11px] font-black text-indigo-950 uppercase tracking-wider">Allocated Packaging Materials:</h5>
                                <ul className="space-y-1 text-xs">
                                  {p.packagingMaterialsUsed?.map((pkg, idx) => (
                                    <li key={idx} className="flex justify-between border-b border-gray-100 py-1">
                                      <span className="font-extrabold text-indigo-950">{getProductName(pkg.product, pkg.productName || 'Packaging Item')}</span>
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

      {/* --- POPUP MODAL: PRODUCTION & MIX REQUISITION WIZARD --- */}
      <Modal
        isOpen={isNewBatchModalOpen}
        onClose={() => setIsNewBatchModalOpen(false)}
        title={activeReqType === 'MIX_REQUISITION' ? "🥣 Mix Preparation Requisition (Store Room Request)" : "🍦 Finished Goods Assembly Requisition"}
        size="2xl"
      >
        <form onSubmit={handleSubmitBatch} className="space-y-6">

          {/* Wizard Header Progress Bar for FG Assembly */}
          {activeReqType === 'FG_ASSEMBLY_REQUISITION' && (
            <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs font-extrabold gap-2">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className={`flex-1 px-3 py-2 rounded-lg transition-all border cursor-pointer ${
                  wizardStep === 1 
                    ? 'bg-white text-rose-900 border-rose-400 shadow-md ring-2 ring-rose-500/20' 
                    : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
                }`}
              >
                1. Finished Good & Mix Output
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
          )}

          {/* STEP 1: MIX PREPARATION REQUISITION vs FG ASSEMBLY STEP 1 */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              {activeReqType === 'MIX_REQUISITION' ? (
                <>
                  {/* MIX PREPARATION: RECIPE SCALE & BASE RAW MATERIALS */}
                  <div className="flex items-center gap-2 bg-rose-50 p-1.5 rounded-xl border border-rose-200">
                    <button
                      type="button"
                      onClick={() => setMixMode('EXISTING')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        mixMode === 'EXISTING'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-800 hover:bg-rose-100'
                      }`}
                    >
                      Select Existing Mix Formula
                    </button>
                    <button
                      type="button"
                      onClick={() => setMixMode('NEW')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        mixMode === 'NEW'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-800 hover:bg-rose-100'
                      }`}
                    >
                      + Create New Mix Formula (1st Time)
                    </button>
                  </div>

                  {/* OPTION A: EXISTING MIX FORMULA */}
                  {mixMode === 'EXISTING' ? (
                    <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center text-rose-950 font-extrabold text-xs uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                          <Package size={16} className="text-rose-600" />
                          Select Mix Formula to Auto-Calculate Raw Materials (Scaled by Liters)
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
                          <label className="text-[11px] font-bold text-gray-700 block">Target Volume (Liters) *</label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={mixCount}
                            onChange={(e) => setMixCount(e.target.value)}
                            placeholder="e.g. 250 L"
                            className={`${customInputStyle} font-mono font-bold text-rose-900 border-rose-300`}
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <button
                            type="button"
                            onClick={handleApplyMixFormula}
                            className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-3 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Scale & Apply Recipe
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* OPTION B: CREATE NEW MIX FORMULA */
                    <div className="p-4 bg-rose-50/90 border border-rose-300 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex justify-between items-center text-rose-950 font-extrabold text-xs uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                          <Plus size={16} className="text-rose-600" />
                          Create New Mix Recipe Record (Saved to Master)
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
                          <label className="text-[11px] font-bold text-gray-700 block">Item Code *</label>
                          <input
                            type="text"
                            required
                            value={newMixCode}
                            onChange={(e) => setNewMixCode(e.target.value)}
                            placeholder="e.g. MIX-POPCORN-001"
                            className={`${customInputStyle} font-mono font-bold text-rose-950 bg-rose-50/50 border-rose-300`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-gray-700 block">Target Volume (Liters) *</label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={mixCount}
                            onChange={(e) => setMixCount(e.target.value)}
                            placeholder="e.g. 500 L"
                            className={`${customInputStyle} font-mono font-bold text-rose-900 border-rose-300`}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-rose-200">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-extrabold text-rose-900 uppercase">Ingredients (per 1 Liter)</span>
                          <button
                            type="button"
                            onClick={handleAddNewMixIngredientRow}
                            className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1"
                          >
                            + Add Ingredient
                          </button>
                        </div>
                        {newMixIngredients.map((ing, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-rose-200">
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
                        className="w-full bg-rose-700 hover:bg-rose-800 text-white py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Save Mix Formula to Master & Apply Requisition
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* FINISHED GOODS ASSEMBLY: SELECT FINISHED GOOD & PREPARED MIX FROM STORE ROOM STOCK */
                <div className="p-5 bg-indigo-50/60 border border-indigo-200 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                    <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                      <Package size={16} className="text-indigo-600" />
                      1. Select Finished Good Product & Prepared Store Room Mix
                    </h3>
                    <span className="text-[10px] bg-indigo-100 text-indigo-900 font-black px-2.5 py-0.5 rounded-lg border border-indigo-200">
                      FG Assembly Stage
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block">Select Finished Good Ice Cream Product to Produce *</label>
                    <SearchableSelect
                      required
                      placeholder="Search & select finished good (e.g. Caramel Popcorn Cone, Cup, Tub)..."
                      value={formData.finishedGoodProduct}
                      options={finishedGoods.map(fg => ({
                        value: fg._id,
                        label: fg.name,
                        code: fg.itemCode,
                        sublabel: `MRP: ₹${fg.mrp || fg.wholesalePrice || 0}`
                      }))}
                      onChange={handleFgSelect}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-rose-900 block">Target Output (Pcs) *</label>
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
                        placeholder="e.g. 120 Pcs"
                        className={`${customInputStyle} font-mono font-black text-rose-950 bg-white border-rose-300 text-base`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 block">Calculated Output (Boxes)</label>
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
                        className={`${customInputStyle} font-mono font-bold text-gray-800 bg-white`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 block">Pcs per Box Config</label>
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
                        className={`${customInputStyle} font-mono font-bold bg-white`}
                      />
                    </div>
                  </div>

                  {/* SELECT PREPARED MIX FROM STORE ROOM STOCK */}
                  <div className="p-4 bg-white rounded-2xl border border-rose-200 space-y-3 shadow-xs">
                    <label className="text-xs font-extrabold text-rose-950 uppercase tracking-wider block">
                      Select Prepared Mix Product (Issued from Store Room Stock) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-8 space-y-1">
                        <SearchableSelect
                          placeholder="Select prepared mix item from Store Room Inventory..."
                          value={selectedMixProduct}
                          options={mixProducts.map(m => ({
                            value: m._id,
                            label: `${m.name} (${m.itemCode})`,
                            code: m.itemCode,
                            sublabel: `Item Code: ${m.itemCode}`
                          }))}
                          onChange={(val) => setSelectedMixProduct(val)}
                        />
                      </div>
                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 block">Mix Liters Needed *</label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={mixCount}
                          onChange={(e) => setMixCount(e.target.value)}
                          placeholder="e.g. 10 L"
                          className={`${customInputStyle} font-mono font-black text-rose-950 border-rose-300`}
                        />
                      </div>
                    </div>

                    {selectedMixProduct && (() => {
                      const availMix = getStoreRoomAvailableStock(selectedMixProduct);
                      const neededLiters = parseFloat(mixCount) || 1;
                      const isShortage = availMix < neededLiters;

                      return (
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs font-bold">
                            <span className="text-rose-950">Store Room Prepared Mix Balance:</span>
                            {availMix <= 0 ? (
                              <span className="px-3 py-1 rounded-lg bg-rose-100 text-rose-900 font-black border border-rose-300 animate-pulse">
                                🔴 OUT OF STOCK (0 Liters) — Requisition Will Be Blocked!
                              </span>
                            ) : isShortage ? (
                              <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 font-black border border-amber-300">
                                ⚠️ INSUFFICIENT (Avail: {availMix} L, Needed: {neededLiters} L)
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-black border border-emerald-300">
                                🟢 Available in Store Room ({availMix} Liters)
                              </span>
                            )}
                          </div>

                          {isShortage && (
                            <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="flex items-center gap-2 text-rose-950 text-xs font-black">
                                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                                <span>🔴 Prepared Mix is OUT OF STOCK / Insufficient in Store Room ({availMix} L / Needed {neededLiters} L)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSendPurchaseRequisition(selectedMixProduct, neededLiters)}
                                disabled={sendingReqId === selectedMixProduct}
                                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                              >
                                {sendingReqId === selectedMixProduct ? (
                                  <><Loader2 size={13} className="animate-spin" /> Sending Indent...</>
                                ) : (
                                  <><ShoppingCart size={14} /> 🛒 Send Purchase Request to Purchase Team</>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* REQUISITION RAW MATERIALS LIST (ONLY FOR MIX PREPARATION) */}
              {activeReqType === 'MIX_REQUISITION' && (
                <>
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
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-rose-50/40 border border-rose-100 shadow-sm">
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
                          {selectedMat && (() => {
                            const availStock = getStoreRoomAvailableStock(rm.product);
                            const isShortage = availStock < (parseFloat(rm.quantityUsed) || 0);

                            return (
                              <div className="mt-1 flex items-center justify-between text-[10px] font-bold">
                                <span className="text-gray-500">Store Room Balance:</span>
                                {availStock <= 0 ? (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-black border border-rose-300 flex items-center gap-1 animate-pulse">
                                    🔴 OUT OF STOCK (0 {uom})
                                  </span>
                                ) : isShortage ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black border border-amber-300 flex items-center gap-1">
                                    ⚠️ INSUFFICIENT (Avail: {availStock} {uom})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black border border-emerald-300">
                                    🟢 Available ({availStock} {uom})
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="w-48">
                          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between mb-1">
                            <span>Qty Needed *</span>
                            {selectedMat && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-mono text-[10px] font-extrabold border border-rose-200">
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
                              <span className="absolute right-3 font-mono font-bold text-xs text-rose-900 pointer-events-none">
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
                </>
              )}

              {(() => {
                const availMix = selectedMixProduct ? getStoreRoomAvailableStock(selectedMixProduct) : 0;
                const neededLiters = parseFloat(mixCount) || 1;
                const isStep1MixShortage = activeReqType === 'FG_ASSEMBLY_REQUISITION' && (!selectedMixProduct || !formData.finishedGoodProduct || !formData.totalPieces || availMix < neededLiters);

                return (
                  <div className="flex justify-end pt-4 border-t border-rose-100">
                    {activeReqType === 'MIX_REQUISITION' ? (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {submitting ? 'Submitting Requisition...' : 'Submit Mix Preparation Requisition to Store Room'}
                      </button>
                    ) : isStep1MixShortage ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                          ⚠️ Selected Mix is OUT OF STOCK. Send Purchase Request above to unlock next step.
                        </span>
                        <button
                          type="button"
                          disabled
                          className="bg-gray-200 text-gray-400 px-5 py-2.5 rounded-xl text-xs font-extrabold border border-gray-300 cursor-not-allowed"
                        >
                          Next: Packaging Material Requisition →
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="bg-white border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        Next: Packaging Material Requisition <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                );
              })()}
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
                      {selectedPkg && (() => {
                        const availStock = getStoreRoomAvailableStock(pkg.product);
                        const reqQty = parseFloat(pkg.quantityRequested) || 0;
                        const isZeroStock = availStock <= 0;
                        const isShortage = isZeroStock || (reqQty > 0 && reqQty > availStock);

                        return (
                          <div className="mt-1.5 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-gray-500">Store Room Balance:</span>
                              {isZeroStock ? (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-black border border-rose-300 flex items-center gap-1 animate-pulse">
                                  🔴 OUT OF STOCK (0 {uom})
                                </span>
                              ) : isShortage ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black border border-amber-300 flex items-center gap-1">
                                  ⚠️ INSUFFICIENT (Avail: {availStock} {uom}, Requested: {reqQty} {uom})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black border border-emerald-300">
                                  🟢 Available ({availStock} {uom})
                                </span>
                              )}
                            </div>

                            {isShortage && (
                              <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between gap-2">
                                <div className="text-[11px] font-black text-rose-950 flex items-center gap-1.5">
                                  <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                                  <span>{isZeroStock ? 'Out of Stock in Store Room' : `Stock Shortage (Need ${reqQty} ${uom}, Have ${availStock} ${uom})`}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSendPurchaseRequisition(pkg.product, reqQty || 10)}
                                  disabled={sendingReqId === pkg.product}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                                >
                                  {sendingReqId === pkg.product ? (
                                    <><Loader2 size={12} className="animate-spin" /> Sending...</>
                                  ) : (
                                    <><ShoppingCart size={13} /> 🛒 Send Purchase Request to Purchase Team</>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
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

              {(() => {
                const isStep2PackagingShortage = packagingMaterialsUsed.some(pkg => {
                  if (!pkg.product) return true;
                  const avail = getStoreRoomAvailableStock(pkg.product);
                  const req = parseFloat(pkg.quantityRequested) || 0;
                  return avail <= 0 || (req > 0 && req > avail) || !pkg.quantityRequested;
                });

                return (
                  <div className="flex justify-between items-center pt-4 border-t border-indigo-100">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                    >
                      Back
                    </button>
                    {isStep2PackagingShortage ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                          ⚠️ Fill quantity for all items. Send Purchase Request above if stock is insufficient.
                        </span>
                        <button
                          type="button"
                          disabled
                          className="bg-gray-200 text-gray-400 px-5 py-2.5 rounded-xl text-xs font-extrabold border border-gray-300 cursor-not-allowed"
                        >
                          Next: Finished Goods & Store Room Submission →
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="bg-white border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-pink-50 px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        Next: Finished Goods & Store Room Submission <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                );
              })()}
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
                  <label className="text-xs font-bold font-mono text-rose-900 uppercase tracking-wider block mb-1">Target Output Quantity (Pcs) *</label>
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
                    className={`${customInputStyle} font-mono font-black text-rose-950 border-rose-300 bg-rose-50/40 text-base`}
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
        <Modal isOpen={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)} title="Complete Production Output Entry" size="md">
          <form onSubmit={handleSubmitCompletion} className="space-y-4">
            {/* Product Summary Header */}
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-base font-extrabold text-rose-950">
                  {selectedProdForCompletion.finishedGoodProduct?.name || selectedProdForCompletion.mixProduct?.name || 'Production Item'}
                </span>
                <span className="font-mono text-xs font-black text-rose-900 bg-white px-2.5 py-1 rounded-xl border border-rose-300 shadow-2xs">
                  ID: {selectedProdForCompletion.productionNumber || `PR-${selectedProdForCompletion._id.slice(-4)}`}
                </span>
              </div>
              <p className="text-xs text-rose-800 font-semibold flex items-center justify-between pt-1">
                <span>Batch Code: <strong>{selectedProdForCompletion.batchNumber || 'BATCH-1'}</strong></span>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg">
                  {selectedProdForCompletion.requisitionType === 'MIX_REQUISITION' ? 'Mix Preparation' : 'Finished Goods Assembly'}
                </span>
              </p>
            </div>

            <div className="space-y-3.5">
              {/* 1. REQUESTED QUANTITY (TO STORE ROOM) - NON-EDITABLE DISPLAY */}
              <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  📋 Requested Output (to Store Room)
                </label>
                <div className="text-sm font-mono font-black text-slate-900 flex items-center justify-between">
                  <span>
                    {selectedProdForCompletion.requisitionType === 'MIX_REQUISITION' 
                      ? `${selectedProdForCompletion.mixLiters || selectedProdForCompletion.totalPieces} Liters` 
                      : `${selectedProdForCompletion.totalPieces || selectedProdForCompletion.quantityBoxes * 12} Pcs`}
                  </span>
                  {selectedProdForCompletion.requisitionType !== 'MIX_REQUISITION' && (
                    <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-lg">
                      {selectedProdForCompletion.quantityBoxes} Boxes Requested
                    </span>
                  )}
                </div>
              </div>

              {selectedProdForCompletion.requisitionType !== 'MIX_REQUISITION' && (
                <>
                  {/* 2. PACKAGING CONFIG / PER PIECE PRODUCTION COUNT (PCS PER BOX) */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-rose-950 uppercase tracking-wider block">
                      📦 Packaging Config (Per Piece Production Count / Box) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={completionForm.piecesPerBox}
                      onChange={(e) => {
                        const ppb = parseInt(e.target.value) || 1;
                        const boxes = parseFloat(completionForm.actualProducedBoxes) || 0;
                        setCompletionForm({
                          ...completionForm,
                          piecesPerBox: ppb,
                          actualProducedPieces: Math.round(boxes * ppb)
                        });
                      }}
                      placeholder="e.g. 12 or 24"
                      className="w-full bg-white border-2 border-rose-200 rounded-xl px-3.5 py-2 text-xs font-mono font-black text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    />
                    <span className="text-[10px] text-gray-500 font-bold block">Pcs count packaged in 1 master box</span>
                  </div>

                  {/* 3. ACTUAL ORIGINAL PRODUCED QUANTITY (BOXES & TOTAL PIECES) */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider block">
                        🏭 Actual Produced Boxes *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={completionForm.actualProducedBoxes}
                        onChange={(e) => {
                          const boxes = parseFloat(e.target.value) || 0;
                          const ppb = parseInt(completionForm.piecesPerBox) || 12;
                          setCompletionForm({
                            ...completionForm,
                            actualProducedBoxes: e.target.value,
                            actualProducedPieces: Math.round(boxes * ppb)
                          });
                        }}
                        placeholder="e.g. 20"
                        className="w-full bg-white border-2 border-emerald-300 rounded-xl px-3.5 py-2 text-xs font-mono font-black text-emerald-950 focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider block">
                        ✨ Original Produced Pcs *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={completionForm.actualProducedPieces}
                        onChange={(e) => {
                          const pcs = parseInt(e.target.value) || 0;
                          const ppb = parseInt(completionForm.piecesPerBox) || 12;
                          setCompletionForm({
                            ...completionForm,
                            actualProducedPieces: e.target.value,
                            actualProducedBoxes: Number((pcs / ppb).toFixed(2))
                          });
                        }}
                        placeholder="e.g. 240"
                        className="w-full bg-white border-2 border-emerald-300 rounded-xl px-3.5 py-2 text-xs font-mono font-black text-emerald-950 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {selectedProdForCompletion.requisitionType === 'MIX_REQUISITION' && (
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider block">
                    🧪 Actual Prepared Mix Output (Liters) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={completionForm.actualProducedPieces}
                    onChange={(e) => setCompletionForm({ ...completionForm, actualProducedPieces: e.target.value })}
                    placeholder="e.g. 10.5"
                    className="w-full bg-white border-2 border-emerald-300 rounded-xl px-3.5 py-2 text-xs font-mono font-black text-emerald-950 focus:border-emerald-500"
                  />
                </div>
              )}
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
                <CheckCircle2 size={16} /> Complete & Inward Stock
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- POPUP MODAL: PRINT PER-BOX QR STICKERS --- */}
      {isQrModalOpen && currentQrStickers.length > 0 && (
        <>
          <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Printable Box QR Code Stickers" size="xl">
            <div className="space-y-4">
              <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center bg-rose-50 p-3 rounded-2xl border border-rose-200 text-rose-950 text-xs font-bold gap-2">
                <span>Generated <strong>{currentQrStickers.length} Box QR Stickers</strong> (1 Sticker per Box based on Packaging Config)</span>
                <button
                  onClick={() => window.print()}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Printer size={14} /> Print Sticker Sheet
                </button>
              </div>

              {/* QR CODE COLOR SETTINGS BAR */}
              <div className="no-print p-3 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-extrabold">
                  <Tag size={15} className="text-rose-400" />
                  <span>QR Code Color Settings</span>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Preset Swatches */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
                    {[
                      { name: 'Classic Black', fg: '#000000', bg: '#FFFFFF' },
                      { name: 'Brand Rose', fg: '#9F1239', bg: '#FFFFFF' },
                      { name: 'Navy Blue', fg: '#1E3A8A', bg: '#FFFFFF' },
                      { name: 'Forest Green', fg: '#065F46', bg: '#FFFFFF' },
                      { name: 'Dark Charcoal', fg: '#111827', bg: '#FEF3C7' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { setQrFgColor(preset.fg); setQrBgColor(preset.bg); }}
                        title={preset.name}
                        className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${qrFgColor === preset.fg ? 'ring-2 ring-rose-400 scale-110 border-white' : 'border-slate-700'}`}
                        style={{ backgroundColor: preset.fg }}
                      />
                    ))}
                  </div>

                  {/* Custom Pickers */}
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <span className="text-slate-300">QR:</span>
                      <input
                        type="color"
                        value={qrFgColor}
                        onChange={(e) => setQrFgColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <span className="text-slate-300">BG:</span>
                      <input
                        type="color"
                        value={qrBgColor}
                        onChange={(e) => setQrBgColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-2">
                {currentQrStickers.map((sticker, idx) => {
                  const parsed = typeof sticker.qrCodeText === 'string' && sticker.qrCodeText.startsWith('{') 
                    ? JSON.parse(sticker.qrCodeText) 
                    : {};

                  const trackingData = {
                    system: 'SRI SARAVANAA ERP',
                    product: parsed.product || sticker.productName || 'Ice Cream Product',
                    productCode: parsed.productCode || sticker.productCode || 'N/A',
                    productionId: parsed.productionId || sticker.productionId || 'PR-01',
                    batchNumber: parsed.batchNumber || sticker.batchNumber || 'BATCH-1',
                    boxNumber: sticker.boxIndex,
                    totalBoxes: sticker.totalBoxes,
                    piecesInBox: sticker.piecesInBox,
                    manufacturingDate: parsed.mfgDate || new Date().toISOString().split('T')[0],
                    expiryDate: parsed.expDate || ''
                  };

                  const qrString = JSON.stringify(trackingData, null, 2);

                  return (
                    <div key={idx} className="bg-white p-3.5 rounded-2xl border-2 border-dashed border-rose-200 hover:border-rose-400 space-y-2 text-center text-[10px] shadow-xs transition-all flex flex-col items-center justify-between">
                      <div className="font-black text-rose-950 border-b border-rose-100 pb-1 text-xs w-full uppercase tracking-wider">
                        {trackingData.system}
                      </div>

                      <div className="p-2 rounded-xl border border-gray-200 shadow-2xs my-1 flex justify-center items-center" style={{ backgroundColor: qrBgColor }}>
                        <QRCodeSVG
                          value={qrString}
                          size={110}
                          fgColor={qrFgColor}
                          bgColor={qrBgColor}
                          level="M"
                          includeMargin={true}
                        />
                      </div>

                      <div className="p-2 bg-rose-50/80 rounded-xl font-mono text-[9.5px] text-gray-800 font-bold space-y-0.5 w-full border border-rose-100">
                        <div className="text-xs font-black text-rose-950">BOX {sticker.boxIndex} / {sticker.totalBoxes}</div>
                        <div className="text-rose-900">PROD ID: {trackingData.productionId}</div>
                        <div>BATCH: {trackingData.batchNumber}</div>
                        <div className="text-emerald-700 font-black">QTY: {trackingData.piecesInBox} Pcs</div>
                      </div>
                      <div className="text-[10px] font-extrabold text-gray-700 truncate w-full">{trackingData.product}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Modal>

          {/* DEDICATED PRINT AREA OUTSIDE MODAL FOR MULTI-PAGE STICKER SHEETS */}
          {createPortal(
            <div id="printable-sticker-area" className="hidden print:block">
              <div className="printable-sticker-grid">
                {currentQrStickers.map((sticker, idx) => {
                  const parsed = typeof sticker.qrCodeText === 'string' && sticker.qrCodeText.startsWith('{') 
                    ? JSON.parse(sticker.qrCodeText) 
                    : {};

                  const trackingData = {
                    system: 'SRI SARAVANAA ERP',
                    product: parsed.product || sticker.productName || 'Ice Cream Product',
                    productCode: parsed.productCode || sticker.productCode || 'N/A',
                    productionId: parsed.productionId || sticker.productionId || 'PR-01',
                    batchNumber: parsed.batchNumber || sticker.batchNumber || 'BATCH-1',
                    boxNumber: sticker.boxIndex,
                    totalBoxes: sticker.totalBoxes,
                    piecesInBox: sticker.piecesInBox,
                    manufacturingDate: parsed.mfgDate || new Date().toISOString().split('T')[0],
                    expiryDate: parsed.expDate || ''
                  };

                  const qrString = JSON.stringify(trackingData, null, 2);

                  return (
                    <div key={idx} className="qr-sticker-card bg-white p-3.5 rounded-2xl border-2 border-dashed border-gray-400 text-center text-[10px] flex flex-col items-center justify-between">
                      <div className="font-black text-black border-b border-gray-300 pb-1 text-xs w-full uppercase tracking-wider">
                        {trackingData.system}
                      </div>

                      <div className="p-2 rounded-xl border border-gray-300 my-1 flex justify-center items-center" style={{ backgroundColor: qrBgColor }}>
                        <QRCodeSVG
                          value={qrString}
                          size={110}
                          fgColor={qrFgColor}
                          bgColor={qrBgColor}
                          level="M"
                          includeMargin={true}
                        />
                      </div>

                      <div className="p-2 bg-gray-50 rounded-xl font-mono text-[9.5px] text-black font-bold space-y-0.5 w-full border border-gray-300">
                        <div className="text-xs font-black text-black">BOX {sticker.boxIndex} / {sticker.totalBoxes}</div>
                        <div>PROD ID: {trackingData.productionId}</div>
                        <div>BATCH: {trackingData.batchNumber}</div>
                        <div className="font-black">QTY: {trackingData.piecesInBox} Pcs</div>
                      </div>
                      <div className="text-[10px] font-extrabold text-black truncate w-full">{trackingData.product}</div>
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
};

export default ProductionList;
