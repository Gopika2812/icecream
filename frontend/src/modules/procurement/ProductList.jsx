import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Search, Filter } from 'lucide-react';
import Modal from '../../components/Modal';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
    itemCode: '', name: '', itemType: 'Raw Material', category: '', unitOfMeasure: 'Kg', mrp: 0, wholesalePrice: 0, piecesPerBox: 12, minimumStockLevel: 0
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/products', {
        ...formData,
        mrp: parseFloat(formData.mrp) || 0,
        wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
        piecesPerBox: parseInt(formData.piecesPerBox) || 12,
        minimumStockLevel: parseFloat(formData.minimumStockLevel) || 0
      });
      setIsModalOpen(false);
      setFormData({ itemCode: '', name: '', itemType: 'Raw Material', category: '', unitOfMeasure: 'Kg', mrp: 0, wholesalePrice: 0, piecesPerBox: 12, minimumStockLevel: 0 });
      fetchProducts();
    } catch (error) {
      console.error('Failed to create product', error);
      alert(error.response?.data?.message || 'Failed to create product');
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
        <h1 className="text-2xl font-semibold text-gray-900 font-display">Products & Materials</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(216,27,96,0.3)] font-medium"
        >
          <Plus size={18} /> Add Item
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading items...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600 font-semibold">
                {/* Column Headers */}
                <tr>
                  <th className="px-6 py-3 font-medium">Item Code</th>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">UoM / Config</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
                {/* Search Filter Inputs */}
                <tr className="bg-[rgba(255,255,255,0.01)] border-b border-[var(--color-glass-border)]">
                  <th className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Search code..."
                      value={searchFilters.itemCode}
                      onChange={(e) => handleFilterChange('itemCode', e.target.value)}
                      className="w-full bg-white/20 border border-[var(--color-glass-border)] rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-[var(--color-primary)] font-normal"
                    />
                  </th>
                  <th className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Search name..."
                      value={searchFilters.name}
                      onChange={(e) => handleFilterChange('name', e.target.value)}
                      className="w-full bg-white/20 border border-[var(--color-glass-border)] rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-[var(--color-primary)] font-normal"
                    />
                  </th>
                  <th className="px-4 py-2">
                    <select
                      value={searchFilters.itemType}
                      onChange={(e) => handleFilterChange('itemType', e.target.value)}
                      className="w-full bg-white/20 border border-[var(--color-glass-border)] rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-[var(--color-primary)] font-normal"
                    >
                      <option value="">All Types</option>
                      <option value="Raw Material">Raw Material</option>
                      <option value="Finished Goods">Finished Goods</option>
                    </select>
                  </th>
                  <th className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Search category..."
                      value={searchFilters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full bg-white/20 border border-[var(--color-glass-border)] rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-[var(--color-primary)] font-normal"
                    />
                  </th>
                  <th className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Search UoM..."
                      value={searchFilters.unitOfMeasure}
                      onChange={(e) => handleFilterChange('unitOfMeasure', e.target.value)}
                      className="w-full bg-white/20 border border-[var(--color-glass-border)] rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-[var(--color-primary)] font-normal"
                    />
                  </th>
                  <th className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Search price..."
                      value={searchFilters.wholesalePrice}
                      onChange={(e) => handleFilterChange('wholesalePrice', e.target.value)}
                      className="w-full bg-white/20 border border-[var(--color-glass-border)] rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-[var(--color-primary)] font-normal text-right"
                    />
                  </th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {filteredProducts.map((item) => (
                  <tr key={item._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold">{item.itemCode}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.itemType === 'Raw Material' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {item.itemType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{item.category}</td>
                    <td className="px-6 py-4">
                      {item.unitOfMeasure}
                      {item.itemType === 'Finished Goods' && (
                        <span className="block font-mono text-[10px] text-gray-500">1 Box = {item.piecesPerBox || 12} Pcs</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">₹{item.wholesalePrice}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[var(--color-primary)] hover:text-gray-900 transition-colors text-xs font-semibold">Edit</button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-600">
                      No items matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Item">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Item Code <span className="text-red-400">*</span></label>
              <input required name="itemCode" value={formData.itemCode} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="e.g. RM-001 or FG-001" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Item Name <span className="text-red-400">*</span></label>
              <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="Milk / Vanilla Ice Cream" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Item Type <span className="text-red-400">*</span></label>
              <select required name="itemType" value={formData.itemType} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors">
                <option value="Raw Material">Raw Material</option>
                <option value="Finished Goods">Finished Goods</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Category <span className="text-red-400">*</span></label>
              <input required name="category" value={formData.category} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="e.g. Dairy, Ice Cream" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Unit of Measure <span className="text-red-400">*</span></label>
              <select required name="unitOfMeasure" value={formData.unitOfMeasure} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors">
                <option value="Kg">Kg</option>
                <option value="Ltr">Ltr</option>
                <option value="Pcs">Pcs</option>
                <option value="Box">Box</option>
                <option value="Gram">Gram</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Minimum Stock Level</label>
              <input type="number" name="minimumStockLevel" value={formData.minimumStockLevel} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="0" />
            </div>
          </div>

          {formData.itemType === 'Finished Goods' && (
            <div className="space-y-4 pt-2 border-t border-[rgba(0,0,0,0.05)]">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Retail Price (MRP)</label>
                  <input type="number" name="mrp" value={formData.mrp} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Wholesale Price</label>
                  <input type="number" name="wholesalePrice" value={formData.wholesalePrice} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Pieces Per Box Config</label>
                  <input type="number" name="piecesPerBox" value={formData.piecesPerBox} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="12" />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-6 py-2 rounded-md text-sm transition-colors shadow-[0_0_15px_rgba(216,27,96,0.2)] disabled:opacity-50 font-medium">
              {submitting ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductList;
