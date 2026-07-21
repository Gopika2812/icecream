import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Store, Receipt, MapPin, Edit, Trash2 } from 'lucide-react';
import Modal from '../../components/Modal';

const BranchesList = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    branchCode: '', branchName: '', legalBusinessName: '', 
    gstinNumber: '', fssaiNumber: '', phone: '', email: '', 
    street: '', city: '', state: '', stateCode: '', pinCode: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches');
      setBranches(response.data.data);
    } catch (error) {
      console.error('Failed to fetch branches', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (branch) => {
    setEditingId(branch._id);
    setFormData({
      branchCode: branch.branchCode,
      branchName: branch.branchName,
      legalBusinessName: branch.legalBusinessName || '',
      gstinNumber: branch.gstinNumber || '',
      fssaiNumber: branch.fssaiNumber || '',
      phone: branch.phoneNumber || '',
      email: branch.email || '',
      street: branch.address?.street || '',
      city: branch.address?.city || '',
      state: branch.address?.state || '',
      stateCode: branch.address?.stateCode || '',
      pinCode: branch.address?.pinCode || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this branch?')) return;
    try {
      await api.delete(`/branches/${id}`);
      fetchBranches();
    } catch (error) {
      console.error('Failed to delete branch', error);
      alert('Failed to delete branch');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        branchCode: formData.branchCode,
        branchName: formData.branchName,
        legalBusinessName: formData.legalBusinessName,
        gstinNumber: formData.gstinNumber,
        fssaiNumber: formData.fssaiNumber,
        phoneNumber: formData.phone,
        email: formData.email,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          stateCode: formData.stateCode,
          pinCode: formData.pinCode
        }
      };
      
      if (editingId) {
        await api.put(`/branches/${editingId}`, payload);
      } else {
        await api.post('/branches', payload);
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ 
        branchCode: '', branchName: '', legalBusinessName: '', 
        gstinNumber: '', fssaiNumber: '', phone: '', email: '', 
        street: '', city: '', state: '', stateCode: '', pinCode: ''
      });
      fetchBranches();
    } catch (error) {
      console.error('Failed to create branch', error);
      alert(error.response?.data?.message || 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Store className="text-[var(--color-primary)]" />
            Branches
          </h1>
          <p className="text-sm text-gray-600 mt-1">Manage company branches and their official billing details.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ 
              branchCode: '', branchName: '', legalBusinessName: '', 
              gstinNumber: '', fssaiNumber: '', phone: '', email: '', 
              street: '', city: '', state: '', stateCode: '', pinCode: ''
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(216,27,96,0.3)]"
        >
          <Plus size={18} /> Add Branch
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading branches...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Branch Code</th>
                  <th className="px-6 py-4 font-medium">Branch Name</th>
                  <th className="px-6 py-4 font-medium">Legal Name (Billing)</th>
                  <th className="px-6 py-4 font-medium">GSTIN</th>
                  <th className="px-6 py-4 font-medium">City</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {branches.map((branch) => (
                  <tr key={branch._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{branch.branchCode}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{branch.branchName}</td>
                    <td className="px-6 py-4">{branch.legalBusinessName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-[var(--color-primary)]">{branch.gstinNumber}</td>
                    <td className="px-6 py-4">{branch.address?.city || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${branch.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {branch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(branch)} className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-[rgba(255,255,255,0.1)] rounded transition-colors" title="Edit Branch">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(branch._id)} className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Deactivate Branch">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {branches.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-600">
                      No branches found. Click "Add Branch" to create your first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingId(null); }} title={editingId ? "Edit Branch (Billing Profile)" : "Add New Branch (Billing Profile)"}>
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* General Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-1 border-b border-[var(--color-glass-border)]">
              <Store size={16} className="text-[var(--color-primary)]" /> General Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Branch Code <span className="text-red-400">*</span></label>
                <input required name="branchCode" value={formData.branchCode} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="e.g. BR-HQ" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Display Branch Name <span className="text-red-400">*</span></label>
                <input required name="branchName" value={formData.branchName} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="e.g. Main Factory" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Phone Number <span className="text-red-400">*</span></label>
                <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="+91 9876543210" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="branch@company.com" />
              </div>
            </div>
          </div>

          {/* Legal / Tax Information */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-1 border-b border-[var(--color-glass-border)]">
              <Receipt size={16} className="text-[var(--color-primary)]" /> Invoice & Tax Details
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Legal Business Name (For Invoices) <span className="text-red-400">*</span></label>
              <input required name="legalBusinessName" value={formData.legalBusinessName} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="SRI SARAVANASS ENTERPRISES PVT LTD" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">GSTIN Number <span className="text-red-400">*</span></label>
                <input required name="gstinNumber" value={formData.gstinNumber} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="33AABCU9603R1ZJ" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">FSSAI License Number</label>
                <input name="fssaiNumber" value={formData.fssaiNumber} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="10012022000000" />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-1 border-b border-[var(--color-glass-border)]">
              <MapPin size={16} className="text-[var(--color-primary)]" /> Branch Address
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Street / Area <span className="text-red-400">*</span></label>
                <input required name="street" value={formData.street} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="Plot No, Street" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">City <span className="text-red-400">*</span></label>
                <input required name="city" value={formData.city} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="City" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">State <span className="text-red-400">*</span></label>
                <input required name="state" value={formData.state} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="Tamil Nadu" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">State Code <span className="text-red-400">*</span></label>
                <input required name="stateCode" value={formData.stateCode} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="33" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">PIN Code <span className="text-red-400">*</span></label>
                <input required name="pinCode" value={formData.pinCode} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="600001" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-[rgba(255,255,255,0.05)] pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-6 py-2 rounded-md text-sm transition-colors shadow-[0_0_15px_rgba(216,27,96,0.2)] disabled:opacity-50">
              {submitting ? 'Saving...' : (editingId ? 'Update Branch' : 'Save Branch')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BranchesList;
