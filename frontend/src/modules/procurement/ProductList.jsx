import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Search, Filter, Pencil, Trash2, Layers, Tags, FlaskConical, Percent, FileText } from 'lucide-react';
import Modal from '../../components/Modal';
import CategoryItemTypeManagerModal from '../../components/CategoryItemTypeManagerModal';
import SearchableSelect from '../../components/SearchableSelect';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  
  // Search state per column
  const [searchFilters, setSearchFilters] = useState({
    itemCode: '',
    name: '',
    itemType: '',
    category: '',
    unitOfMeasure: '',
    wholesalePrice: '',
    hsnCode: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    itemCode: '', 
    name: '', 
    itemType: 'Raw Material', 
    category: 'Dairy', 
    unitOfMeasure: 'Kg', 
    hsnCode: '',
    gstPercent: 5, // Auto-fill 5% GST by default!
    mrp: 0, 
    wholesalePrice: 0, 
    piecesPerBox: 12, 
    minimumStockLevel: 0,
    rawMaterials: [] // Composition recipe if itemType is Mix
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, typeRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/item-types')
      ]);

      setProducts(prodRes.data.data || []);
      setCategories(catRes.data.data || []);
      setItemTypes(typeRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch product catalog data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (column, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Check if current selected itemType is marked as Mix
  const isSelectedTypeMix = () => {
    if (!formData.itemType) return false;
    const foundType = itemTypes.find(t => t.name === formData.itemType);
    if (foundType && foundType.isMix) return true;
    return formData.itemType.toLowerCase().includes('mix');
  };

  // Raw Material ingredients options for Mix
  const rawMaterialOptions = products.filter(p => {
    const isMix = p.itemType?.toLowerCase().includes('mix');
    return !isMix;
  });

  // Mix recipe row handlers
  const handleAddMixRecipeRow = () => {
    setFormData(prev => ({
      ...prev,
      rawMaterials: [
        ...prev.rawMaterials,
        { product: '', quantity: '', unitOfMeasure: 'Kg' }
      ]
    }));
  };

  const handleRemoveMixRecipeRow = (index) => {
    setFormData(prev => {
      const updated = [...prev.rawMaterials];
      updated.splice(index, 1);
      return { ...prev, rawMaterials: updated };
    });
  };

  const handleMixRecipeChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.rawMaterials];
      updated[index][field] = value;
      // Auto-set UOM if product selected
      if (field === 'product') {
        const selectedProd = rawMaterialOptions.find(p => p._id === value);
        if (selectedProd) {
          updated[index].unitOfMeasure = selectedProd.unitOfMeasure || 'Kg';
        }
      }
      return { ...prev, rawMaterials: updated };
    });
  };

  const handleOpenAddModal = () => {
    setEditingProductId(null);
    const defaultCat = categories.length > 0 ? categories[0].name : 'Dairy';
    const defaultType = itemTypes.length > 0 ? itemTypes[0].name : 'Raw Material';

    setFormData({ 
      itemCode: '', 
      name: '', 
      itemType: defaultType, 
      category: defaultCat, 
      unitOfMeasure: 'Kg', 
      hsnCode: '',
      gstPercent: 5, // 5% GST Autofill
      mrp: 0, 
      wholesalePrice: 0, 
      piecesPerBox: 12, 
      minimumStockLevel: 0,
      rawMaterials: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProductId(product._id);
    const existingRawMaterials = (product.rawMaterials || []).map(rm => ({
      product: rm.product?._id || rm.product || '',
      quantity: rm.quantity || '',
      unitOfMeasure: rm.unitOfMeasure || rm.product?.unitOfMeasure || 'Kg'
    }));

    setFormData({
      itemCode: product.itemCode || '',
      name: product.name || '',
      itemType: product.itemType || 'Raw Material',
      category: product.category || '',
      unitOfMeasure: product.unitOfMeasure || 'Kg',
      hsnCode: product.hsnCode || '',
      gstPercent: product.gstPercent !== undefined ? product.gstPercent : 5,
      mrp: product.mrp || 0,
      wholesalePrice: product.wholesalePrice || 0,
      piecesPerBox: product.piecesPerBox || 12,
      minimumStockLevel: product.minimumStockLevel || 0,
      rawMaterials: existingRawMaterials
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchInitialData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isMix = isSelectedTypeMix();
      const cleanedRawMaterials = isMix
        ? (formData.rawMaterials || [])
            .filter(rm => rm.product && parseFloat(rm.quantity) > 0)
            .map(rm => ({
              product: rm.product,
              quantity: parseFloat(rm.quantity),
              unitOfMeasure: rm.unitOfMeasure || 'Units'
            }))
        : [];

      const payload = {
        ...formData,
        hsnCode: formData.hsnCode.trim(),
        gstPercent: parseFloat(formData.gstPercent) || 5,
        mrp: parseFloat(formData.mrp) || 0,
        wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
        piecesPerBox: parseInt(formData.piecesPerBox) || 12,
        minimumStockLevel: parseFloat(formData.minimumStockLevel) || 0,
        rawMaterials: cleanedRawMaterials
      };

      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
      } else {
        await api.post('/products', payload);
      }

      setIsModalOpen(false);
      setEditingProductId(null);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to save product', error);
      alert(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered products list
  const filteredProducts = products.filter((item) => {
    const itemCodeMatch = (item.itemCode || '').toLowerCase().includes(searchFilters.itemCode.toLowerCase());
    const nameMatch = (item.name || '').toLowerCase().includes(searchFilters.name.toLowerCase());
    const typeMatch = searchFilters.itemType === '' || item.itemType === searchFilters.itemType;
    const categoryMatch = (item.category || '').toLowerCase().includes(searchFilters.category.toLowerCase());
    const uomMatch = (item.unitOfMeasure || '').toLowerCase().includes(searchFilters.unitOfMeasure.toLowerCase());
    const priceMatch = searchFilters.wholesalePrice === '' || (item.wholesalePrice || '').toString().includes(searchFilters.wholesalePrice);
    const hsnMatch = searchFilters.hsnCode === '' || (item.hsnCode || '').toLowerCase().includes(searchFilters.hsnCode.toLowerCase());
    
    return itemCodeMatch && nameMatch && typeMatch && categoryMatch && uomMatch && priceMatch && hsnMatch;
  });

  return (
    <div>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Products & Materials Catalog</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage raw materials, composite formulas (Mixes) & finished ice cream products</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsManagerModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-pink-300 text-pink-700 hover:bg-pink-50 px-4 py-2.5 rounded-xl transition-all shadow-xs text-xs font-bold"
          >
            <Layers size={16} /> Manage Categories & Item Types
          </button>

          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-xs font-bold"
          >
            <Plus size={16} /> Add New Item
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600 font-medium">Loading product catalog...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 text-xs uppercase tracking-wider font-bold">
                {/* Column Headers */}
                <tr>
                  <th className="px-5 py-3.5">Item Code</th>
                  <th className="px-5 py-3.5">Item Name</th>
                  <th className="px-5 py-3.5">HSN Code</th>
                  <th className="px-5 py-3.5">GST %</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">UoM / Pack Config</th>
                  <th className="px-5 py-3.5 text-right">Selling Price (₹)</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
                {/* Search Filter Inputs */}
                <tr className="bg-white/40 border-b border-[var(--color-glass-border)]">
                  <th className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Code..."
                      value={searchFilters.itemCode}
                      onChange={(e) => handleFilterChange('itemCode', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Name..."
                      value={searchFilters.name}
                      onChange={(e) => handleFilterChange('name', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="HSN..."
                      value={searchFilters.hsnCode}
                      onChange={(e) => handleFilterChange('hsnCode', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                    />
                  </th>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2">
                    <select
                      value={searchFilters.itemType}
                      onChange={(e) => handleFilterChange('itemType', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    >
                      <option value="">All Types</option>
                      {itemTypes.map(t => (
                        <option key={t._id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </th>
                  <th className="px-2 py-2">
                    <select
                      value={searchFilters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    >
                      <option value="">All Categories</option>
                      {categories.map(c => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </th>
                  <th className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="UoM..."
                      value={searchFilters.unitOfMeasure}
                      onChange={(e) => handleFilterChange('unitOfMeasure', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Price..."
                      value={searchFilters.wholesalePrice}
                      onChange={(e) => handleFilterChange('wholesalePrice', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono text-right"
                    />
                  </th>
                  <th className="px-2 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {filteredProducts.map((item) => {
                  const isMix = item.itemType?.toLowerCase().includes('mix') || (item.rawMaterials && item.rawMaterials.length > 0);

                  return (
                    <tr key={item._id} className="hover:bg-pink-50/20 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs font-bold text-gray-800">
                        <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200">
                          {item.itemCode}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-gray-900 text-sm">{item.name}</div>
                        {isMix && (
                          <div className="text-[10px] text-purple-700 font-medium mt-0.5 flex items-center gap-1">
                            <FlaskConical size={12} className="text-purple-600" />
                            <span>Recipe: {item.rawMaterials?.length || 0} Raw Materials</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-600">
                        {item.hsnCode || '—'}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-emerald-700">
                        {item.gstPercent !== undefined ? `${item.gstPercent}%` : '5%'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                          isMix 
                            ? 'bg-purple-100 text-purple-800 border-purple-300' 
                            : item.itemType === 'Raw Material' 
                              ? 'bg-amber-100 text-amber-800 border-amber-300' 
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}>
                          {item.itemType}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-700">{item.category}</td>
                      <td className="px-5 py-4 text-xs">
                        <span className="font-bold text-gray-800 block">{item.unitOfMeasure}</span>
                        {item.itemType === 'Finished Goods' && (
                          <span className="font-mono text-[10px] text-gray-500">1 Box = {item.piecesPerBox || 12} Pcs</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-extrabold text-gray-900 text-sm">
                        ₹{item.wholesalePrice?.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleOpenEditModal(item)}
                            className="px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-[var(--color-primary)] text-xs font-bold transition-all border border-pink-200 inline-flex items-center gap-1 shadow-xs"
                            title="Edit Item"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(item._id)}
                            className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 transition-all border border-transparent hover:border-rose-200"
                            title="Delete Item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-6 py-10 text-center text-gray-500 font-medium">
                      No products found matching the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProductId ? "Edit Product / Material Item" : "Add New Product / Material Item"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ROW 1: ITEM TYPE & CATEGORY (TOP PRIORITY SELECTION) */}
          <div className="grid grid-cols-2 gap-4 bg-pink-50/60 p-3 rounded-2xl border border-pink-100/90">
            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-pink-950 uppercase tracking-wider block">Item Type *</label>
                <button
                  type="button"
                  onClick={() => setIsManagerModalOpen(true)}
                  className="text-[10px] font-bold text-[var(--color-primary)] hover:underline"
                >
                  + Create New Type
                </button>
              </div>
              <select 
                required 
                name="itemType" 
                value={formData.itemType} 
                onChange={handleInputChange} 
                className="w-full bg-white border border-pink-200 rounded-xl px-4 py-2 text-gray-900 text-sm font-extrabold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all cursor-pointer"
              >
                {itemTypes.length > 0 ? (
                  itemTypes.map(t => (
                    <option key={t._id} value={t.name}>
                      {t.name} {t.isMix ? '(Mix Formula)' : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Raw Material">Raw Material</option>
                    <option value="Finished Goods">Finished Goods</option>
                    <option value="Mix">Mix</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-pink-950 uppercase tracking-wider block">Category *</label>
                <button
                  type="button"
                  onClick={() => setIsManagerModalOpen(true)}
                  className="text-[10px] font-bold text-[var(--color-primary)] hover:underline"
                >
                  + Create New Category
                </button>
              </div>
              <select 
                required 
                name="category" 
                value={formData.category} 
                onChange={handleInputChange} 
                className="w-full bg-white border border-pink-200 rounded-xl px-4 py-2 text-gray-900 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all cursor-pointer"
              >
                {categories.length > 0 ? (
                  categories.map(c => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))
                ) : (
                  <>
                    <option value="Dairy">Dairy</option>
                    <option value="Ice Cream">Ice Cream</option>
                    <option value="Packaging">Packaging</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* ROW 2: ITEM CODE & ITEM NAME */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Item Code *</label>
              <input 
                required 
                name="itemCode" 
                value={formData.itemCode} 
                onChange={handleInputChange} 
                className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                placeholder="e.g. RM-001 or FG-001 or MIX-01" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Item Name *</label>
              <input 
                required 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                placeholder="Milk / Vanilla Ice Cream / Butterscotch Mix" 
              />
            </div>
          </div>

          {/* ROW 3: HSN CODE & GST % FIELDS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">HSN Code</label>
              <input 
                name="hsnCode" 
                value={formData.hsnCode} 
                onChange={handleInputChange} 
                className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-pink-500" 
                placeholder="e.g. 21050000" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">GST % (Autofilled 5%) *</label>
              <div className="relative flex items-center">
                <input 
                  type="number"
                  step="0.01"
                  required
                  name="gstPercent" 
                  value={formData.gstPercent} 
                  onChange={handleInputChange} 
                  className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pink-500 pr-8" 
                  placeholder="5" 
                />
                <span className="absolute right-3 text-xs font-bold text-gray-500 pointer-events-none">%</span>
              </div>
            </div>
          </div>

          {/* ROW 4: UNIT OF MEASURE & MINIMUM STOCK LEVEL */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Unit of Measure *</label>
              <select 
                required 
                name="unitOfMeasure" 
                value={formData.unitOfMeasure} 
                onChange={handleInputChange} 
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all cursor-pointer"
              >
                <option value="Kg">Kg</option>
                <option value="Ltr">Ltr</option>
                <option value="Pcs">Pcs</option>
                <option value="Box">Box</option>
                <option value="Gram">Gram</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Minimum Stock Level</label>
              <input 
                type="number" 
                name="minimumStockLevel" 
                value={formData.minimumStockLevel} 
                onChange={handleInputChange} 
                className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                placeholder="0" 
              />
            </div>
          </div>

          {/* DYNAMIC SECTION: ITEM TYPE SPECIFIC PRICING & CONFIGURATION */}
          {formData.itemType === 'Finished Goods' ? (
            <div className="space-y-4 pt-2 border-t border-pink-100">
              <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">Finished Goods Pricing & Packaging Configuration</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Selling Price (₹) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    name="wholesalePrice" 
                    value={formData.wholesalePrice} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-extrabold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Retail Price MRP (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="mrp" 
                    value={formData.mrp} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Pcs Per Box</label>
                  <input 
                    type="number" 
                    name="piecesPerBox" 
                    value={formData.piecesPerBox} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="12" 
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t border-pink-100">
              <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                {formData.itemType === 'Raw Material' ? 'Raw Material Costing' : `${formData.itemType} Pricing`}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                    {formData.itemType === 'Raw Material' ? 'Purchase / Unit Price (₹) *' : 'Unit Price (₹) *'}
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    name="wholesalePrice" 
                    value={formData.wholesalePrice} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-extrabold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">MRP (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="mrp" 
                    value={formData.mrp} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="bg-[var(--color-primary)] hover:bg-pink-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Saving...' : (editingProductId ? 'Update Product' : 'Save Product')}
            </button>
          </div>
        </form>
      </Modal>

      {/* CATEGORY & ITEM TYPE DIRECTORY MANAGER MODAL */}
      <CategoryItemTypeManagerModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        onRefreshData={fetchInitialData}
      />
    </div>
  );
};

export default ProductList;
