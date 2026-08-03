import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Search, Filter, Pencil } from 'lucide-react';
import Modal from '../../components/Modal';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  
  // Search state per column
  const [searchFilters, setSearchFilters] = useState({
    itemCode: '',
    name: '',
    itemType: '',
    category: '',
    unitOfMeasure: '',
    wholesalePrice: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    itemCode: '', 
    name: '', 
    itemType: 'Raw Material', 
    category: '', 
    unitOfMeasure: 'Kg', 
    mrp: 0, 
    wholesalePrice: 0, 
    piecesPerBox: 12, 
    minimumStockLevel: 0
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (column, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const handleOpenAddModal = () => {
    setEditingProductId(null);
    setFormData({ 
      itemCode: '', 
      name: '', 
      itemType: 'Raw Material', 
      category: '', 
      unitOfMeasure: 'Kg', 
      mrp: 0, 
      wholesalePrice: 0, 
      piecesPerBox: 12, 
      minimumStockLevel: 0 
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProductId(product._id);
    setFormData({
      itemCode: product.itemCode || '',
      name: product.name || '',
      itemType: product.itemType || 'Raw Material',
      category: product.category || '',
      unitOfMeasure: product.unitOfMeasure || 'Kg',
      mrp: product.mrp || 0,
      wholesalePrice: product.wholesalePrice || 0,
      piecesPerBox: product.piecesPerBox || 12,
      minimumStockLevel: product.minimumStockLevel || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        mrp: parseFloat(formData.mrp) || 0,
        wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
        piecesPerBox: parseInt(formData.piecesPerBox) || 12,
        minimumStockLevel: parseFloat(formData.minimumStockLevel) || 0
      };

      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
      } else {
        await api.post('/products', payload);
      }

      setIsModalOpen(false);
      setEditingProductId(null);
      fetchProducts();
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
    
    return itemCodeMatch && nameMatch && typeMatch && categoryMatch && uomMatch && priceMatch;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Products & Materials Catalog</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage raw material ingredients, packaging items & finished ice cream products</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-xs font-bold"
        >
          <Plus size={16} /> Add New Item
        </button>
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
                  <th className="px-6 py-3.5">Item Code</th>
                  <th className="px-6 py-3.5">Item Name</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">UoM / Pack Config</th>
                  <th className="px-6 py-3.5 text-right">Price (₹)</th>
                  <th className="px-6 py-3.5 text-center">Actions</th>
                </tr>
                {/* Search Filter Inputs */}
                <tr className="bg-white/40 border-b border-[var(--color-glass-border)]">
                  <th className="px-3 py-2">
                    <input 
                      type="text" 
                      placeholder="Search code..."
                      value={searchFilters.itemCode}
                      onChange={(e) => handleFilterChange('itemCode', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                    />
                  </th>
                  <th className="px-3 py-2">
                    <input 
                      type="text" 
                      placeholder="Search name..."
                      value={searchFilters.name}
                      onChange={(e) => handleFilterChange('name', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    />
                  </th>
                  <th className="px-3 py-2">
                    <select
                      value={searchFilters.itemType}
                      onChange={(e) => handleFilterChange('itemType', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    >
                      <option value="">All Types</option>
                      <option value="Raw Material">Raw Material</option>
                      <option value="Finished Goods">Finished Goods</option>
                    </select>
                  </th>
                  <th className="px-3 py-2">
                    <input 
                      type="text" 
                      placeholder="Search category..."
                      value={searchFilters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    />
                  </th>
                  <th className="px-3 py-2">
                    <input 
                      type="text" 
                      placeholder="Search UoM..."
                      value={searchFilters.unitOfMeasure}
                      onChange={(e) => handleFilterChange('unitOfMeasure', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    />
                  </th>
                  <th className="px-3 py-2">
                    <input 
                      type="text" 
                      placeholder="Search price..."
                      value={searchFilters.wholesalePrice}
                      onChange={(e) => handleFilterChange('wholesalePrice', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono text-right"
                    />
                  </th>
                  <th className="px-3 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {filteredProducts.map((item) => (
                  <tr key={item._id} className="hover:bg-pink-50/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-gray-800">
                      <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200">
                        {item.itemCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-gray-900 text-sm">{item.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                        item.itemType === 'Raw Material' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}>
                        {item.itemType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-700">{item.category}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-bold text-gray-800 block">{item.unitOfMeasure}</span>
                      {item.itemType === 'Finished Goods' && (
                        <span className="font-mono text-[10px] text-gray-500">1 Box = {item.piecesPerBox || 12} Pcs</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-extrabold text-gray-900 text-sm">
                      ₹{item.wholesalePrice?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleOpenEditModal(item)}
                        className="px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-[var(--color-primary)] text-xs font-bold transition-all border border-pink-200 inline-flex items-center gap-1 shadow-sm"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-500 font-medium">
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
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Item Code *</label>
              <input 
                required 
                name="itemCode" 
                value={formData.itemCode} 
                onChange={handleInputChange} 
                className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                placeholder="e.g. RM-001 or FG-001" 
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
                placeholder="Milk / Vanilla Ice Cream" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Item Type *</label>
              <select 
                required 
                name="itemType" 
                value={formData.itemType} 
                onChange={handleInputChange} 
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all cursor-pointer"
              >
                <option value="Raw Material">Raw Material</option>
                <option value="Finished Goods">Finished Goods</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Category *</label>
              <input 
                required 
                name="category" 
                value={formData.category} 
                onChange={handleInputChange} 
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all" 
                placeholder="e.g. Dairy, Ice Cream, Packaging" 
              />
            </div>
          </div>

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

          <div className="space-y-4 pt-2 border-t border-pink-100">
            <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">Pricing & Box Configuration</h3>
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
    </div>
  );
};

export default ProductList;
