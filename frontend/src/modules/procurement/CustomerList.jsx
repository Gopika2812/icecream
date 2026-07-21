import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus } from 'lucide-react';
import Modal from '../../components/Modal';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    customerCode: '', name: '', customerType: 'Dealer', contactPerson: '', phone: '', email: '', street: '', city: '', state: '', stateCode: '', pinCode: '', gstinNumber: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    } finally {
      setLoading(false);
    }
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
        billingAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          stateCode: formData.stateCode,
          pinCode: formData.pinCode
        }
      };
      await api.post('/customers', payload);
      setIsModalOpen(false);
      setFormData({ customerCode: '', name: '', customerType: 'Dealer', contactPerson: '', phone: '', email: '', street: '', city: '', state: '', stateCode: '', pinCode: '', gstinNumber: '' });
      fetchCustomers();
    } catch (error) {
      console.error('Failed to create customer', error);
      alert(error.response?.data?.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(216,27,96,0.3)]"
        >
          <Plus size={18} /> Add Customer
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading customers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Customer Code</th>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Phone</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {customers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{customer.customerCode}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-[rgba(255,255,255,0.1)] rounded-full text-xs">
                        {customer.customerType}
                      </span>
                    </td>
                    <td className="px-6 py-4">{customer.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${customer.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[var(--color-primary)] hover:text-gray-900 transition-colors text-xs font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-600">
                      No customers found. Add one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Customer">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Customer Code <span className="text-red-400">*</span></label>
              <input required name="customerCode" value={formData.customerCode} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="e.g. CUST-001" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Customer Name <span className="text-red-400">*</span></label>
              <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="Customer Name" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Customer Type <span className="text-red-400">*</span></label>
                <select required name="customerType" value={formData.customerType} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors">
                  <option value="Dealer" className="bg-[#1a1525] text-gray-900">Dealer</option>
                  <option value="Party order" className="bg-[#1a1525] text-gray-900">Party order</option>
                  <option value="Vechicle sales" className="bg-[#1a1525] text-gray-900">Vechicle sales</option>
                  <option value="Coimbatore" className="bg-[#1a1525] text-gray-900">Coimbatore</option>
                  <option value="Madurai" className="bg-[#1a1525] text-gray-900">Madurai</option>
                  <option value="Kerala" className="bg-[#1a1525] text-gray-900">Kerala</option>
                </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Contact Person</label>
              <input name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="John Doe" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="contact@email.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">GSTIN Number <span className="text-red-400">*</span></label>
              <input required name="gstinNumber" value={formData.gstinNumber} onChange={handleInputChange} className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="GSTIN..." />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--color-glass-border)] mt-2">
            <h3 className="text-sm font-semibold text-gray-900">Billing Address</h3>
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
            <button type="submit" disabled={submitting} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-6 py-2 rounded-md text-sm transition-colors shadow-[0_0_15px_rgba(216,27,96,0.2)] disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerList;
