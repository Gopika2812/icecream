import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Layers, Tags, Plus, Pencil, Trash2, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';
import Modal from './Modal';

const CategoryItemTypeManagerModal = ({ isOpen, onClose, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'itemTypes'
  const [categories, setCategories] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Category Form State
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState(null);

  // Item Type Form State
  const [itemTypeForm, setItemTypeForm] = useState({ name: '', description: '', isMix: false });
  const [editingItemType, setEditingItemType] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDirectories();
    }
  }, [isOpen]);

  const DEFAULT_CATEGORIES = [
    { _id: 'c1', name: 'Dairy', description: 'Milk, Cream, Butter, Milk Powder' },
    { _id: 'c2', name: 'Ice Cream', description: 'Finished Goods Ice Cream Products' },
    { _id: 'c3', name: 'Packaging', description: 'Boxes, Tubs, Cups, Wrappers, Labels' },
    { _id: 'c4', name: 'Flavors & Colors', description: 'Essences, Food Colors, Mix Ingredients' },
    { _id: 'c5', name: 'Syrups', description: 'Toppings, Syrups, Sauces' }
  ];

  const DEFAULT_ITEM_TYPES = [
    { _id: 't1', name: 'Raw Material', description: 'Raw ingredients & supplies', isMix: false },
    { _id: 't2', name: 'Finished Goods', description: 'Manufactured final ice cream products', isMix: false },
    { _id: 't3', name: 'Packing Material', description: 'Cups, tubs, lids, cones, wrappers, boxes', isMix: false },
    { _id: 't4', name: 'Mix', description: 'Composite formula mix combining raw materials', isMix: true }
  ];

  const fetchDirectories = async () => {
    try {
      setLoading(true);
      const [catRes, typeRes] = await Promise.allSettled([
        api.get('/categories'),
        api.get('/item-types')
      ]);

      const cats = catRes.status === 'fulfilled' && catRes.value?.data?.data?.length > 0 
        ? catRes.value.data.data 
        : DEFAULT_CATEGORIES;

      const types = typeRes.status === 'fulfilled' && typeRes.value?.data?.data?.length > 0 
        ? typeRes.value.data.data 
        : DEFAULT_ITEM_TYPES;

      setCategories(cats);
      setItemTypes(types);
    } catch (error) {
      console.error('Failed to load directories', error);
      setCategories(DEFAULT_CATEGORIES);
      setItemTypes(DEFAULT_ITEM_TYPES);
    } finally {
      setLoading(false);
    }
  };

  // --- CATEGORY CRUD ---
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return alert('Category name is required.');
    try {
      setSubmitting(true);
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, categoryForm);
      } else {
        await api.post('/categories', categoryForm);
      }
      setCategoryForm({ name: '', description: '' });
      setEditingCategory(null);
      await fetchDirectories();
      if (onRefreshData) onRefreshData();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name || '', description: cat.description || '' });
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchDirectories();
      if (onRefreshData) onRefreshData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete category');
    }
  };

  // --- ITEM TYPE CRUD ---
  const handleSaveItemType = async (e) => {
    e.preventDefault();
    if (!itemTypeForm.name.trim()) return alert('Item type name is required.');
    try {
      setSubmitting(true);
      if (editingItemType) {
        await api.put(`/item-types/${editingItemType._id}`, itemTypeForm);
      } else {
        await api.post('/item-types', itemTypeForm);
      }
      setItemTypeForm({ name: '', description: '', isMix: false });
      setEditingItemType(null);
      await fetchDirectories();
      if (onRefreshData) onRefreshData();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to save item type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditItemType = (t) => {
    setEditingItemType(t);
    setItemTypeForm({ name: t.name || '', description: t.description || '', isMix: Boolean(t.isMix) });
  };

  const handleDeleteItemType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item type?')) return;
    try {
      await api.delete(`/item-types/${id}`);
      fetchDirectories();
      if (onRefreshData) onRefreshData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete item type');
    }
  };

  const inputStyle = "w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[var(--color-primary)] transition-all";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories & Item Types Directory" size="xl">
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
              activeTab === 'categories'
                ? 'bg-white text-[var(--color-primary)] border-pink-400 shadow-md ring-2 ring-pink-500/20'
                : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
            }`}
          >
            <Layers size={16} /> Categories Directory ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('itemTypes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
              activeTab === 'itemTypes'
                ? 'bg-white text-[var(--color-primary)] border-pink-400 shadow-md ring-2 ring-pink-500/20'
                : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
            }`}
          >
            <Tags size={16} /> Item Types Directory ({itemTypes.length})
          </button>
        </div>

        {/* TAB 1: CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left Form: Add / Edit Category */}
            <div className="md:col-span-2 bg-pink-50/40 p-4 rounded-2xl border border-pink-100">
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>{editingCategory ? 'Edit Category' : 'Add New Category'}</span>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }); }}
                    className="text-[10px] text-gray-500 hover:text-gray-800 underline font-normal"
                  >
                    Cancel Edit
                  </button>
                )}
              </h3>
              <form onSubmit={handleSaveCategory} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="e.g. Dairy, Flavors, Syrups"
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Description (Optional)</label>
                  <textarea
                    rows="2"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Short description..."
                    className={inputStyle}
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[var(--color-primary)] hover:bg-pink-700 text-white py-2 rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> {submitting ? 'Saving...' : (editingCategory ? 'Update Category' : 'Save Category')}
                </button>
              </form>
            </div>

            {/* Right Table: Category List */}
            <div className="md:col-span-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700 flex justify-between items-center">
                <span>Existing Categories</span>
                <span className="text-[10px] text-gray-500 font-normal">Click edit/delete to manage</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {categories.map((cat) => (
                  <div key={cat._id} className="p-3 flex items-center justify-between hover:bg-pink-50/20 transition-colors">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{cat.name}</h4>
                      {cat.description && <p className="text-[10px] text-gray-500">{cat.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditCategory(cat)}
                        className="p-1.5 rounded-lg text-pink-600 hover:bg-pink-100 transition-colors"
                        title="Edit Category"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat._id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="p-6 text-center text-xs text-gray-500">No categories found. Add your first category!</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ITEM TYPES MANAGEMENT */}
        {activeTab === 'itemTypes' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left Form: Add / Edit Item Type */}
            <div className="md:col-span-2 bg-pink-50/40 p-4 rounded-2xl border border-pink-100">
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>{editingItemType ? 'Edit Item Type' : 'Add New Item Type'}</span>
                {editingItemType && (
                  <button
                    type="button"
                    onClick={() => { setEditingItemType(null); setItemTypeForm({ name: '', description: '', isMix: false }); }}
                    className="text-[10px] text-gray-500 hover:text-gray-800 underline font-normal"
                  >
                    Cancel Edit
                  </button>
                )}
              </h3>
              <form onSubmit={handleSaveItemType} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Item Type Name *</label>
                  <input
                    type="text"
                    required
                    value={itemTypeForm.name}
                    onChange={(e) => setItemTypeForm({ ...itemTypeForm, name: e.target.value })}
                    placeholder="e.g. Raw Material, Mix, Base Syrup"
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Description (Optional)</label>
                  <textarea
                    rows="2"
                    value={itemTypeForm.description}
                    onChange={(e) => setItemTypeForm({ ...itemTypeForm, description: e.target.value })}
                    placeholder="Purpose or usage..."
                    className={inputStyle}
                  ></textarea>
                </div>
                <div className="p-3 bg-white rounded-xl border border-pink-200 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="isMixCheckbox"
                    checked={itemTypeForm.isMix}
                    onChange={(e) => setItemTypeForm({ ...itemTypeForm, isMix: e.target.checked })}
                    className="mt-0.5 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                  />
                  <label htmlFor="isMixCheckbox" className="text-xs text-gray-800 cursor-pointer select-none">
                    <strong className="block text-[11px] text-pink-900">Is Mix / Formula Item Type?</strong>
                    <span className="text-[10px] text-gray-500 block leading-tight">
                      When enabled, products created under this Item Type allow attaching raw material recipes for auto-deduction during production!
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[var(--color-primary)] hover:bg-pink-700 text-white py-2 rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> {submitting ? 'Saving...' : (editingItemType ? 'Update Item Type' : 'Save Item Type')}
                </button>
              </form>
            </div>

            {/* Right Table: Item Type List */}
            <div className="md:col-span-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700 flex justify-between items-center">
                <span>Existing Item Types</span>
                <span className="text-[10px] text-gray-500 font-normal">Click edit/delete to manage</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {itemTypes.map((t) => (
                  <div key={t._id} className="p-3 flex items-center justify-between hover:bg-pink-50/20 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-gray-900">{t.name}</h4>
                        {t.isMix && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            ✨ MIX FORMULA
                          </span>
                        )}
                      </div>
                      {t.description && <p className="text-[10px] text-gray-500">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditItemType(t)}
                        className="p-1.5 rounded-lg text-pink-600 hover:bg-pink-100 transition-colors"
                        title="Edit Item Type"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItemType(t._id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Delete Item Type"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {itemTypes.length === 0 && (
                  <div className="p-6 text-center text-xs text-gray-500">No item types found. Add your first item type!</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all"
          >
            Close Directory Manager
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CategoryItemTypeManagerModal;
