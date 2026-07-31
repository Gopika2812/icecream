import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, UserCheck, Phone, MapPin, Tag, Pencil } from 'lucide-react';
import Modal from '../../components/Modal';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    customerCode: '', 
    name: '', 
    customerType: 'Party Order', 
    salesOwner: '', 
    contactPerson: '', 
    phone: '', 
    email: '', 
    street: '', 
    city: '', 
    state: '', 
    stateCode: '33', 
    pinCode: '', 
    gstinNumber: '',
    ownerMarginPercentage: 0
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchUsers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customers');
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAddModal = () => {
    setEditingCustomerId(null);
    setFormData({
      customerCode: '', 
      name: '', 
      customerType: 'Party Order', 
      salesOwner: '', 
      contactPerson: '', 
      phone: '', 
      email: '', 
      street: '', 
      city: '', 
      state: '', 
      stateCode: '33', 
      pinCode: '', 
      gstinNumber: '',
      ownerMarginPercentage: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (customer) => {
    setEditingCustomerId(customer._id);
    const ownerId = customer.salesOwner ? (typeof customer.salesOwner === 'object' ? customer.salesOwner._id : customer.salesOwner) : '';
    setFormData({
      customerCode: customer.customerCode || '',
      name: customer.name || '',
      customerType: customer.customerType || 'Party Order',
      salesOwner: ownerId,
      contactPerson: customer.contactPerson || '',
      phone: customer.phone || '',
      email: customer.email || '',
      street: customer.billingAddress?.street || '',
      city: customer.billingAddress?.city || '',
      state: customer.billingAddress?.state || '',
      stateCode: customer.billingAddress?.stateCode || '33',
      pinCode: customer.billingAddress?.pinCode || '',
      gstinNumber: customer.gstinNumber || '',
      ownerMarginPercentage: customer.ownerMarginPercentage || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        ownerMarginPercentage: parseFloat(formData.ownerMarginPercentage) || 0,
        billingAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          stateCode: formData.stateCode,
          pinCode: formData.pinCode
        }
      };

      if (editingCustomerId) {
        await api.put(`/customers/${editingCustomerId}`, payload);
      } else {
        await api.post('/customers', payload);
      }

      setIsModalOpen(false);
      setEditingCustomerId(null);
      fetchCustomers();
    } catch (error) {
      console.error('Failed to save customer', error);
      alert(error.response?.data?.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'Party Order':
      case 'Party order':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Auto Sales':
      case 'Vechicle sales':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Dealer':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Coimbatore':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'Madurai':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Kerala':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Customers & Regional Outlets</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage Party Order, Auto Sales Vans, Regular Dealers & Branch Depots</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2 rounded-xl transition-all shadow-md text-xs font-bold"
        >
          <Plus size={16} /> Add New Customer
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600 font-medium">Loading customers & sales owners...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Customer Code</th>
                  <th className="px-6 py-4">Customer / Branch Name</th>
                  <th className="px-6 py-4 text-center">Category Type</th>
                  <th className="px-6 py-4 text-center">Owner Margin (%)</th>
                  <th className="px-6 py-4">Sales Owner (Employee)</th>
                  <th className="px-6 py-4">Phone / Contact</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {customers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-white/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-gray-700">
                      <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200">
                        {customer.customerCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {customer.name}
                      <span className="block text-[11px] text-gray-400 font-normal">GSTIN: {customer.gstinNumber || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${getTypeBadge(customer.customerType)}`}>
                        {customer.customerType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-extrabold border ${
                        (customer.ownerMarginPercentage || 0) > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        (customer.ownerMarginPercentage || 0) < 0 ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {(customer.ownerMarginPercentage || 0) > 0 ? `+${customer.ownerMarginPercentage}%` : `${customer.ownerMarginPercentage || 0}%`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {customer.salesOwner ? (
                        <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                          <UserCheck size={14} className="text-[var(--color-primary)] shrink-0" />
                          <div>
                            <span>{customer.salesOwner.name}</span>
                            <span className="block text-[10px] text-gray-400 font-normal">{customer.salesOwner.designation || 'Sales Incharge'}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-700">
                      {customer.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone size={12} className="text-gray-400" />
                          <span>{customer.phone}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${customer.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleOpenEditModal(customer)}
                        className="px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-[var(--color-primary)] text-xs font-bold transition-all border border-pink-200 inline-flex items-center gap-1 shadow-sm"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                      No customers found. Add one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT CUSTOMER MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCustomerId ? "Edit Customer / Regional Outlet" : "Add New Customer / Outlet"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Customer Code *</label>
              <input required name="customerCode" value={formData.customerCode} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono" placeholder="e.g. C-PARTY-003" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Customer / Outlet Name *</label>
              <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" placeholder="e.g. Sri Lakshmi Caterers" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Category Type *</label>
              <select required name="customerType" value={formData.customerType} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-pink-500">
                <option value="Party Order">Party Order (Birthday / Functions)</option>
                <option value="Auto Sales">Auto Sales (Street / Area Mobile Vans)</option>
                <option value="Dealer">Dealer (Regular Parlours & Retail)</option>
                <option value="Coimbatore">Coimbatore Branch Depot</option>
                <option value="Madurai">Madurai Branch Depot</option>
                <option value="Kerala">Kerala Branch Depot</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Sales Owner (Employee)</label>
              <select name="salesOwner" value={formData.salesOwner} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-pink-500">
                <option value="">-- Select Salesperson / Driver --</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.designation || u.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Contact Person</label>
              <input name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" placeholder="Contact Person Name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Phone Number</label>
              <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" placeholder="e.g. 9843012345" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" placeholder="customer@email.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">GSTIN Number *</label>
              <input required name="gstinNumber" value={formData.gstinNumber} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" placeholder="e.g. 33AAAAA1111A1Z1" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block flex items-center justify-between">
                <span>Owner Margin (%)</span>
              </label>
              <input type="number" step="0.1" name="ownerMarginPercentage" value={formData.ownerMarginPercentage} onChange={handleInputChange} className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500" placeholder="e.g. 2 or -2" />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-pink-100">
            <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">Billing Address</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Street / Area</label>
                <input name="street" value={formData.street} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" placeholder="Street Address" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">City</label>
                <input name="city" value={formData.city} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" placeholder="City" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">State</label>
                <input name="state" value={formData.state} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" placeholder="Tamil Nadu" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">State Code *</label>
                <input required name="stateCode" value={formData.stateCode} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" placeholder="33" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">PIN Code *</label>
                <input required name="pinCode" value={formData.pinCode} onChange={handleInputChange} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" placeholder="641001" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" disabled={submitting} className="bg-[var(--color-primary)] hover:bg-pink-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md disabled:opacity-50">
              {submitting ? 'Saving...' : (editingCustomerId ? 'Update Customer' : 'Save Customer')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerList;
