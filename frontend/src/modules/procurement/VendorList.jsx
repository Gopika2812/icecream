import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Search, Filter, Edit, Building2 } from 'lucide-react';
import Modal from '../../components/Modal';

const VendorList = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form State
  const [formData, setFormData] = useState({
    vendorCode: '', name: '', contactPerson: '', phone: '', email: '', street: '', city: '', state: '', stateCode: '', pinCode: '', gstinNumber: '', openingBalance: 0, status: 'Active'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vendors');
      setVendors(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch vendors', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      vendorCode: '', name: '', contactPerson: '', phone: '', email: '', street: '', city: '', state: '', stateCode: '', pinCode: '', gstinNumber: '', openingBalance: 0, status: 'Active'
    });
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (vendor) => {
    setEditingId(vendor._id);
    setFormData({
      vendorCode: vendor.vendorCode || '',
      name: vendor.name || '',
      contactPerson: vendor.contactPerson || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      street: vendor.address?.street || '',
      city: vendor.address?.city || '',
      state: vendor.address?.state || '',
      stateCode: vendor.address?.stateCode || '',
      pinCode: vendor.address?.pinCode || '',
      gstinNumber: vendor.gstinNumber || '',
      openingBalance: vendor.openingBalance || 0,
      status: vendor.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        openingBalance: parseFloat(formData.openingBalance) || 0,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          stateCode: formData.stateCode,
          pinCode: formData.pinCode
        }
      };
      if (editingId) {
        await api.put(`/vendors/${editingId}`, payload);
      } else {
        await api.post('/vendors', payload);
      }
      setIsModalOpen(false);
      resetForm();
      fetchVendors(); // refresh list
    } catch (error) {
      console.error('Failed to save vendor', error);
      alert(error.response?.data?.message || 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter vendors based on search term and status filter
  const filteredVendors = vendors.filter((vendor) => {
    if (statusFilter !== 'ALL' && vendor.status !== statusFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const code = (vendor.vendorCode || '').toLowerCase();
      const name = (vendor.name || '').toLowerCase();
      const contact = (vendor.contactPerson || '').toLowerCase();
      const phone = (vendor.phone || '').toLowerCase();
      const email = (vendor.email || '').toLowerCase();
      const gstin = (vendor.gstinNumber || '').toLowerCase();
      return code.includes(q) || name.includes(q) || contact.includes(q) || phone.includes(q) || email.includes(q) || gstin.includes(q);
    }
    return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage vendor details, contacts, and opening balances</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(216,27,96,0.3)] font-medium text-sm"
        >
          <Plus size={18} /> Add Vendor
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white/40 p-4 rounded-xl border border-[var(--color-glass-border)] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code, name, phone, gstin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/80 border border-[var(--color-glass-border)] rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-600">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/80 border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          >
            <option value="ALL">All Status ({vendors.length})</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Blacklisted">Blacklisted</option>
          </select>
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap pl-2 border-l border-gray-300">
            Showing {filteredVendors.length} of {vendors.length}
          </span>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading vendors...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Vendor Code</th>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Contact Person</th>
                  <th className="px-6 py-4 font-medium">Phone</th>
                  <th className="px-6 py-4 font-medium text-right">Opening Balance</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-700">{vendor.vendorCode}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{vendor.name}</td>
                    <td className="px-6 py-4">{vendor.contactPerson || 'N/A'}</td>
                    <td className="px-6 py-4 font-mono text-xs">{vendor.phone || 'N/A'}</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-gray-800">
                      ₹{(vendor.openingBalance || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        vendor.status === 'Active' 
                          ? 'bg-green-500/10 text-green-700 border border-green-500/20' 
                          : vendor.status === 'Inactive'
                          ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-700 border border-red-500/20'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleEdit(vendor)}
                        className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:text-gray-900 transition-colors text-xs font-semibold"
                      >
                        <Edit size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredVendors.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No vendors found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Vendor" : "Add New Vendor"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Vendor Code <span className="text-red-400">*</span></label>
              <input required name="vendorCode" value={formData.vendorCode} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="e.g. VEN-001" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Company Name <span className="text-red-400">*</span></label>
              <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="Company Name" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Contact Person</label>
              <input name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="John Doe" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="+91 9876543210" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="vendor@email.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">GSTIN Number <span className="text-red-400">*</span></label>
              <input required name="gstinNumber" value={formData.gstinNumber} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="GSTIN..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Opening Balance (₹)</label>
              <input type="number" step="0.01" name="openingBalance" value={formData.openingBalance} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="0.00" />
            </div>
          </div>

          {editingId && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Blacklisted">Blacklisted</option>
              </select>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-[var(--color-glass-border)] mt-2">
            <h3 className="text-sm font-semibold text-gray-900">Address Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Street / Area</label>
                <input name="street" value={formData.street} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="Street Address" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">City</label>
                <input name="city" value={formData.city} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="City" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">State</label>
                <input name="state" value={formData.state} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="State" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">State Code <span className="text-red-400">*</span></label>
                <input required name="stateCode" value={formData.stateCode} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="e.g. 33" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">PIN Code <span className="text-red-400">*</span></label>
                <input required name="pinCode" value={formData.pinCode} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="600001" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-6 py-2 rounded-md text-sm transition-colors shadow-[0_0_15px_rgba(216,27,96,0.2)] disabled:opacity-50 font-medium">
              {submitting ? 'Saving...' : editingId ? 'Update Vendor' : 'Save Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorList;
