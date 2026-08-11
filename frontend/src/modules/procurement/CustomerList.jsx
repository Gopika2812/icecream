import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, UserCheck, Phone, MapPin, Tag, Pencil, FileText, Download, Percent, Search } from 'lucide-react';
import Modal from '../../components/Modal';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);

  // Margin Modal State
  const [isMarginModalOpen, setIsMarginModalOpen] = useState(false);
  const [marginCustomer, setMarginCustomer] = useState(null);
  const [marginProducts, setMarginProducts] = useState([]);
  const [inventoryStock, setInventoryStock] = useState([]);
  const [customerMarginMap, setCustomerMarginMap] = useState({});
  const [marginSearchQuery, setMarginSearchQuery] = useState('');
  const [loadingMarginData, setLoadingMarginData] = useState(false);
  const [savingMargins, setSavingMargins] = useState(false);
  
  // Search state per column
  const [searchFilters, setSearchFilters] = useState({
    customerCode: '',
    name: '',
    customerType: '',
    salesOwner: '',
    phone: '',
    status: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    customerCode: '', 
    name: '', 
    customerType: 'Party Order', 
    salesOwner: '', 
    phone: '', 
    email: '', 
    street: '', 
    city: '', 
    state: 'Tamil Nadu', 
    stateCode: '33', 
    pinCode: '', 
    gstinNumber: '',
    autoId: '',
    handlerName: '',
    area: '',
    vehicleDetails: ''
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

  const handleFilterChange = (column, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      return alert('No customers available to export.');
    }

    const headers = ['Customer Code / Auto ID', 'Customer / Outlet Name', 'Category Type', 'Sales Owner (Employee)', 'Phone / Contact', 'Email', 'GSTIN', 'Route / Address', 'Status'];
    
    const rows = filteredCustomers.map(c => [
      `"${c.customerCode || c.autoId || ''}"`,
      `"${c.name || c.handlerName || ''}"`,
      `"${c.customerType || ''}"`,
      `"${c.salesOwner ? (typeof c.salesOwner === 'object' ? c.salesOwner.name : c.salesOwner) : 'Unassigned'}"`,
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${c.gstinNumber || ''}"`,
      `"${c.area || c.billingAddress?.street || ''}"`,
      `"${c.status || 'Active'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Customer_Directory_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- MARGIN MODAL HANDLERS ---
  const handleOpenMarginModal = async (customer) => {
    setMarginCustomer(customer);
    setIsMarginModalOpen(true);
    setLoadingMarginData(true);

    try {
      const [prodRes, invRes] = await Promise.allSettled([
        api.get('/products'),
        api.get('/inventory')
      ]);

      const allProds = prodRes.status === 'fulfilled' ? (prodRes.value.data?.data || []) : [];
      const fgProds = allProds.filter(p => p.itemType === 'Finished Goods');
      setMarginProducts(fgProds);

      const invData = invRes.status === 'fulfilled' ? (invRes.value.data?.data || []) : [];
      setInventoryStock(invData);

      // Initialize customer margin map
      const initialMap = {};
      const savedMargins = customer.productMargins || customer.customPrices || [];

      fgProds.forEach(p => {
        const pId = p._id || p.id;
        const saved = savedMargins.find(m => m.product === pId || m.product?._id === pId || m.productId === pId);
        const baseMrp = parseFloat(p.mrp || p.wholesalePrice || 0);

        if (saved) {
          initialMap[pId] = {
            marginPercent: saved.marginPercent !== undefined ? saved.marginPercent : 0,
            customPrice: saved.customPrice !== undefined ? saved.customPrice.toFixed(2) : baseMrp.toFixed(2)
          };
        } else {
          initialMap[pId] = {
            marginPercent: 0,
            customPrice: baseMrp.toFixed(2)
          };
        }
      });

      setCustomerMarginMap(initialMap);
    } catch (error) {
      console.error('Failed to load margin modal data', error);
    } finally {
      setLoadingMarginData(false);
    }
  };

  const getProductClosingQty = (prodId) => {
    const stockRecords = inventoryStock.filter(i => {
      const pId = i.product?._id || i.product || i.productId;
      return pId === prodId;
    });
    return stockRecords.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  };

  const handleMarginPercentChange = (prodId, mrp, newPercent) => {
    const percentVal = parseFloat(newPercent);
    const validPercent = isNaN(percentVal) ? 0 : percentVal;
    const computedPrice = mrp > 0 ? (mrp + (mrp * (validPercent / 100))) : 0;

    setCustomerMarginMap(prev => ({
      ...prev,
      [prodId]: {
        marginPercent: newPercent,
        customPrice: computedPrice.toFixed(2)
      }
    }));
  };

  const handleCustomPriceChange = (prodId, mrp, newPrice) => {
    const priceVal = parseFloat(newPrice);
    const validPrice = isNaN(priceVal) ? 0 : priceVal;
    const computedPercent = mrp > 0 ? (((validPrice - mrp) / mrp) * 100) : 0;

    setCustomerMarginMap(prev => ({
      ...prev,
      [prodId]: {
        marginPercent: computedPercent.toFixed(1),
        customPrice: newPrice
      }
    }));
  };

  const handleApplyBatchMargin = (percent) => {
    setCustomerMarginMap(prev => {
      const updated = { ...prev };
      marginProducts.forEach(p => {
        const pId = p._id || p.id;
        const mrp = parseFloat(p.mrp || p.wholesalePrice || 0);
        const computedPrice = mrp > 0 ? (mrp + (mrp * (percent / 100))) : 0;
        updated[pId] = {
          marginPercent: percent,
          customPrice: computedPrice.toFixed(2)
        };
      });
      return updated;
    });
  };

  const handleSaveProductMargins = async () => {
    if (!marginCustomer) return;
    setSavingMargins(true);
    try {
      const marginArray = Object.entries(customerMarginMap).map(([pId, val]) => ({
        product: pId,
        marginPercent: parseFloat(val.marginPercent) || 0,
        customPrice: parseFloat(val.customPrice) || 0
      }));

      const payload = {
        ...marginCustomer,
        productMargins: marginArray
      };

      const cId = marginCustomer._id || marginCustomer.id;
      await api.put(`/customers/${cId}`, payload);

      setIsMarginModalOpen(false);
      fetchCustomers();
      alert(`Product margins successfully saved for ${marginCustomer.name || marginCustomer.handlerName}!`);
    } catch (error) {
      console.error('Failed to save product margins', error);
      alert(error.response?.data?.message || 'Failed to save product margins');
    } finally {
      setSavingMargins(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCustomerId(null);
    setFormData({
      customerCode: '', 
      name: '', 
      customerType: 'Party Order', 
      salesOwner: '', 
      phone: '', 
      email: '', 
      street: '', 
      city: '', 
      state: 'Tamil Nadu', 
      stateCode: '33', 
      pinCode: '', 
      gstinNumber: '',
      autoId: '',
      handlerName: '',
      area: '',
      vehicleDetails: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (customer) => {
    setEditingCustomerId(customer._id);
    const ownerId = customer.salesOwner ? (typeof customer.salesOwner === 'object' ? customer.salesOwner._id : customer.salesOwner) : '';
    setFormData({
      customerCode: customer.customerCode || customer.autoId || '',
      name: customer.name || customer.handlerName || '',
      customerType: customer.customerType || 'Party Order',
      salesOwner: ownerId,
      phone: customer.phone || '',
      email: customer.email || '',
      street: customer.billingAddress?.street || customer.area || '',
      city: customer.billingAddress?.city || '',
      state: customer.billingAddress?.state || 'Tamil Nadu',
      stateCode: customer.billingAddress?.stateCode || '33',
      pinCode: customer.billingAddress?.pinCode || '',
      gstinNumber: customer.gstinNumber || '',
      autoId: customer.autoId || customer.customerCode || '',
      handlerName: customer.handlerName || customer.name || '',
      area: customer.area || customer.billingAddress?.street || '',
      vehicleDetails: customer.vehicleDetails || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isAutoSales = formData.customerType === 'Auto Sales';

      const payload = {
        ...formData,
        customerCode: isAutoSales ? (formData.autoId || formData.customerCode) : formData.customerCode,
        name: isAutoSales ? (formData.handlerName || formData.name) : formData.name,
        autoId: isAutoSales ? (formData.autoId || formData.customerCode) : undefined,
        handlerName: isAutoSales ? (formData.handlerName || formData.name) : undefined,
        area: isAutoSales ? formData.area : undefined,
        vehicleDetails: isAutoSales ? formData.vehicleDetails : undefined,
        billingAddress: {
          street: isAutoSales ? formData.area : formData.street,
          city: formData.city,
          state: formData.state || 'Tamil Nadu',
          stateCode: formData.stateCode || '33',
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

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    const codeStr = (c.customerCode || c.autoId || '').toLowerCase();
    const nameStr = (c.name || c.handlerName || '').toLowerCase();
    const areaStr = (c.area || '').toLowerCase();
    const ownerName = c.salesOwner ? (typeof c.salesOwner === 'object' ? c.salesOwner.name : c.salesOwner) : '';
    const ownerStr = (ownerName || '').toLowerCase();
    const phoneStr = (c.phone || '').toLowerCase();
    const typeStr = (c.customerType || '').toLowerCase();
    const statusStr = (c.status || 'Active').toLowerCase();

    const codeMatch = codeStr.includes(searchFilters.customerCode.toLowerCase().trim());
    const nameMatch = nameStr.includes(searchFilters.name.toLowerCase().trim()) || areaStr.includes(searchFilters.name.toLowerCase().trim());
    const typeMatch = searchFilters.customerType === '' || typeStr.includes(searchFilters.customerType.toLowerCase().trim());
    const ownerMatch = searchFilters.salesOwner === '' || ownerStr.includes(searchFilters.salesOwner.toLowerCase().trim());
    const phoneMatch = phoneStr.includes(searchFilters.phone.toLowerCase().trim());
    const statusMatch = searchFilters.status === '' || statusStr === searchFilters.status.toLowerCase().trim();

    return codeMatch && nameMatch && typeMatch && ownerMatch && phoneMatch && statusMatch;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Customers & Outlets Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage Party Orders, Regular Dealers, Auto Sales Vans & Regional Depots</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white border border-pink-300 text-pink-700 hover:bg-pink-50 px-4 py-2.5 rounded-xl transition-all shadow-xs text-xs font-bold"
          >
            <FileText size={16} /> Export CSV
          </button>

          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-xs font-bold"
          >
            <Plus size={16} /> Add New Customer
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600 font-medium">Loading customers & sales directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Customer Code</th>
                  <th className="px-5 py-3.5">Customer / Outlet Name</th>
                  <th className="px-5 py-3.5 text-center">Category Type</th>
                  <th className="px-5 py-3.5">Sales Owner (Employee)</th>
                  <th className="px-5 py-3.5">Phone / Contact</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
                {/* Search Filter Inputs */}
                <tr className="bg-white/40 border-b border-[var(--color-glass-border)]">
                  <th className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Code..."
                      value={searchFilters.customerCode}
                      onChange={(e) => handleFilterChange('customerCode', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Name / Route..."
                      value={searchFilters.name}
                      onChange={(e) => handleFilterChange('name', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <select
                      value={searchFilters.customerType}
                      onChange={(e) => handleFilterChange('customerType', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    >
                      <option value="">All Types</option>
                      <option value="Party Order">Party Order</option>
                      <option value="Dealer">Dealer</option>
                      <option value="Auto Sales">Auto Sales</option>
                      <option value="Coimbatore">Coimbatore Depot</option>
                      <option value="Madurai">Madurai Depot</option>
                      <option value="Kerala">Kerala Depot</option>
                    </select>
                  </th>
                  <th className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Owner..."
                      value={searchFilters.salesOwner}
                      onChange={(e) => handleFilterChange('salesOwner', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Phone..."
                      value={searchFilters.phone}
                      onChange={(e) => handleFilterChange('phone', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <select
                      value={searchFilters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </th>
                  <th className="px-2 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {filteredCustomers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-white/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs font-bold text-gray-700">
                      <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200">
                        {customer.customerCode || customer.autoId}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-gray-900">
                      {customer.name || customer.handlerName}
                      {customer.area && <span className="block text-[11px] text-pink-700 font-normal">Route: {customer.area}</span>}
                      {customer.gstinNumber && <span className="block text-[10px] text-gray-400 font-normal">GSTIN: {customer.gstinNumber}</span>}
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${getTypeBadge(customer.customerType)}`}>
                        {customer.customerType}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {customer.salesOwner ? (
                        <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                          <UserCheck size={14} className="text-[var(--color-primary)] shrink-0" />
                          <div>
                            <span>{customer.salesOwner.name || customer.salesOwner}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-700">
                      {customer.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone size={12} className="text-gray-400" />
                          <span>{customer.phone}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${customer.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {customer.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenMarginModal(customer)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all border border-purple-200 inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Set Product Margins & Custom Pricing"
                        >
                          <Percent size={12} /> Set Margin
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(customer)}
                          className="px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-[var(--color-primary)] text-xs font-bold transition-all border border-pink-200 inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-500 font-medium">
                      No customers found matching the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SET CUSTOMER PRODUCT MARGINS MODAL */}
      <Modal 
        isOpen={isMarginModalOpen} 
        onClose={() => setIsMarginModalOpen(false)} 
        title={`Set Product Margins & Pricing — ${marginCustomer?.name || marginCustomer?.handlerName || ''}`}
        maxWidth="max-w-[95vw]"
      >
        <div className="space-y-4">
          {/* Top Banner, Search Filter & Quick Presets */}
          <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-white p-4 rounded-2xl border border-purple-100/90 shadow-2xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="shrink-0">
              <h3 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                <Percent size={15} className="text-purple-600" /> Customer Custom Pricing Rules
              </h3>
              <p className="text-[11px] text-purple-700 mt-0.5">
                Configure special item margins (%) or custom selling prices for <strong>{marginCustomer?.name || marginCustomer?.handlerName}</strong> ({marginCustomer?.customerType})
              </p>
            </div>

            {/* Search Filter for Item Code & Name */}
            <div className="relative w-full lg:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500" />
              <input
                type="text"
                value={marginSearchQuery}
                onChange={(e) => setMarginSearchQuery(e.target.value)}
                placeholder="Search by Item Code or Item Name (e.g. FG-VANILLA, Mango)..."
                className="w-full bg-white border border-purple-300 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 shadow-2xs"
              />
            </div>

            {/* Quick Batch Buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Quick Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyBatchMargin(5)}
                className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-[11px] font-bold transition-all border border-purple-200 cursor-pointer"
              >
                Apply 5% Margin
              </button>
              <button
                type="button"
                onClick={() => handleApplyBatchMargin(10)}
                className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-[11px] font-bold transition-all border border-purple-200 cursor-pointer"
              >
                Apply 10% Margin
              </button>
              <button
                type="button"
                onClick={() => handleApplyBatchMargin(0)}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition-all border border-gray-200 cursor-pointer"
              >
                Reset to Base MRP
              </button>
            </div>
          </div>

          {/* Product Margins Table */}
          {loadingMarginData ? (
            <div className="p-8 text-center text-xs font-bold text-purple-700">
              Loading finished goods product catalog & stock levels...
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="max-h-[62vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-extrabold sticky top-0 bg-gray-50 z-10">
                    <tr>
                      <th className="px-4 py-3">Item Code</th>
                      <th className="px-4 py-3">Item Name</th>
                      <th className="px-4 py-3 text-center">Closing Qty</th>
                      <th className="px-4 py-3 text-right">Standard MRP (₹)</th>
                      <th className="px-4 py-3 text-center">Margin (%)</th>
                      <th className="px-4 py-3 text-right">Final Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {marginProducts
                      .filter((prod) => {
                        if (!marginSearchQuery.trim()) return true;
                        const q = marginSearchQuery.toLowerCase().trim();
                        return (
                          (prod.itemCode || '').toLowerCase().includes(q) ||
                          (prod.name || '').toLowerCase().includes(q) ||
                          (prod.category || '').toLowerCase().includes(q)
                        );
                      })
                      .map((prod) => {
                        const pId = prod._id || prod.id;
                        const closingQty = getProductClosingQty(pId);
                        const baseMrp = parseFloat(prod.mrp || prod.wholesalePrice || 0);
                        const marginData = customerMarginMap[pId] || { marginPercent: 0, customPrice: baseMrp.toFixed(2) };

                        return (
                          <tr key={pId} className="hover:bg-purple-50/20 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-gray-800">
                              <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200">
                                {prod.itemCode}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-extrabold text-gray-900">{prod.name}</div>
                              <span className="text-[10px] text-gray-400 font-normal">Cat: {prod.category} | UOM: {prod.unitOfMeasure}</span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                closingQty > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                              }`}>
                                {closingQty} {prod.unitOfMeasure}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">
                              ₹{baseMrp.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="relative inline-flex items-center w-24">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={marginData.marginPercent}
                                  onChange={(e) => handleMarginPercentChange(pId, baseMrp, e.target.value)}
                                  className="w-full bg-white border border-purple-300 rounded-lg px-2 py-1 text-xs text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 pr-5"
                                  placeholder="0"
                                />
                                <span className="absolute right-2 text-[10px] font-bold text-purple-600 pointer-events-none">%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="relative inline-flex items-center w-28">
                                <span className="absolute left-2.5 text-xs font-bold text-pink-600 pointer-events-none">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={marginData.customPrice}
                                  onChange={(e) => handleCustomPriceChange(pId, baseMrp, e.target.value)}
                                  className="w-full bg-pink-50/50 border border-pink-300 rounded-lg pl-6 pr-2 py-1 text-xs text-right font-mono font-extrabold text-pink-950 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600"
                                  placeholder="0.00"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {marginProducts.filter((prod) => {
                      if (!marginSearchQuery.trim()) return true;
                      const q = marginSearchQuery.toLowerCase().trim();
                      return (
                        (prod.itemCode || '').toLowerCase().includes(q) ||
                        (prod.name || '').toLowerCase().includes(q) ||
                        (prod.category || '').toLowerCase().includes(q)
                      );
                    }).length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-xs text-gray-500">
                          No finished goods products match search term "{marginSearchQuery}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[11px] text-gray-500">
              * Setting a customer margin updates default selling prices automatically during sales invoicing.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMarginModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProductMargins}
                disabled={savingMargins}
                className="px-6 py-2 bg-[var(--color-primary)] hover:bg-pink-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {savingMargins ? 'Saving Margins...' : 'Save Product Margins'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ADD / EDIT CUSTOMER MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCustomerId ? "Edit Customer / Sales Outlet" : "Add New Customer / Outlet"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TOP SECTION: CATEGORY TYPE SELECTION */}
          <div className="bg-gradient-to-r from-pink-50/80 via-white to-purple-50/50 p-4 rounded-2xl border border-pink-100/90 shadow-xs">
            <label className="text-[11px] font-extrabold text-pink-950 uppercase tracking-wider block mb-1.5">
              Category Type *
            </label>
            <select 
              required 
              name="customerType" 
              value={formData.customerType} 
              onChange={handleInputChange} 
              className="w-full bg-white border border-pink-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm font-extrabold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="Party Order">Party Order (Functions / Events)</option>
              <option value="Dealer">Dealer (Regular Parlours & Outlets)</option>
              <option value="Auto Sales">Auto Sales (Street / Area Mobile Vans)</option>
              <option value="Coimbatore">Coimbatore Branch Depot</option>
              <option value="Madurai">Madurai Branch Depot</option>
              <option value="Kerala">Kerala Branch Depot</option>
            </select>
          </div>

          {/* DYNAMIC FORM FIELDS */}
          {formData.customerType === 'Auto Sales' ? (
            /* AUTO SALES FIELDS */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Auto ID / Vehicle No *</label>
                  <input 
                    required 
                    name="autoId" 
                    value={formData.autoId || formData.customerCode} 
                    onChange={(e) => setFormData({ ...formData, autoId: e.target.value, customerCode: e.target.value })} 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="e.g. AUTO-01 or TN-38-AX-1234" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Handler Name *</label>
                  <input 
                    required 
                    name="handlerName" 
                    value={formData.handlerName || formData.name} 
                    onChange={(e) => setFormData({ ...formData, handlerName: e.target.value, name: e.target.value })} 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="e.g. Senthil Kumar (Driver/Incharge)" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Sales Area / Target Route *</label>
                  <input 
                    required 
                    name="area" 
                    value={formData.area || formData.street} 
                    onChange={(e) => setFormData({ ...formData, area: e.target.value, street: e.target.value })} 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="e.g. Coimbatore South / Route 1" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Vehicle Details / Model</label>
                  <input 
                    name="vehicleDetails" 
                    value={formData.vehicleDetails} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="e.g. Piaggio Ape Auto / E-Rickshaw Van" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Handler Phone Number</label>
                  <input 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="e.g. 9843012345" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Sales Owner (Employee)</label>
                  <select 
                    name="salesOwner" 
                    value={formData.salesOwner} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-pink-500"
                  >
                    <option value="">-- Select Sales Incharge --</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.designation || u.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* PARTY ORDER & DEALER FIELDS */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Customer Code *</label>
                  <input 
                    required 
                    name="customerCode" 
                    value={formData.customerCode} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="e.g. C-PARTY-003 or D-DEALER-01" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Customer / Outlet Name *</label>
                  <input 
                    required 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="e.g. Sri Lakshmi Caterers / Nila Ice Cream Parlour" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Sales Owner (Employee)</label>
                <select 
                  name="salesOwner" 
                  value={formData.salesOwner} 
                  onChange={handleInputChange} 
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-pink-500"
                >
                  <option value="">-- Select Salesperson / Incharge --</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.designation || u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Phone Number</label>
                  <input 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="e.g. 9843012345" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Email</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="customer@email.com" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">GSTIN Number</label>
                  <input 
                    name="gstinNumber" 
                    value={formData.gstinNumber} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-pink-500" 
                    placeholder="e.g. 33AAAAA1111A1Z1" 
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">Billing Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Street / Area</label>
                    <input 
                      name="street" 
                      value={formData.street} 
                      onChange={handleInputChange} 
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" 
                      placeholder="Street Address / Area" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">City</label>
                    <input 
                      name="city" 
                      value={formData.city} 
                      onChange={handleInputChange} 
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" 
                      placeholder="City" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">State</label>
                    <input 
                      name="state" 
                      value={formData.state || 'Tamil Nadu'} 
                      onChange={handleInputChange} 
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500" 
                      placeholder="Tamil Nadu" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">State Code *</label>
                    <input 
                      required 
                      name="stateCode" 
                      value={formData.stateCode || '33'} 
                      onChange={handleInputChange} 
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-pink-500" 
                      placeholder="33" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">PIN Code *</label>
                    <input 
                      required 
                      name="pinCode" 
                      value={formData.pinCode} 
                      onChange={handleInputChange} 
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-pink-500" 
                      placeholder="641001" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer">Cancel</button>
            <button type="submit" disabled={submitting} className="bg-[var(--color-primary)] hover:bg-pink-700 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer">
              {submitting ? 'Saving...' : (editingCustomerId ? 'Update Customer' : 'Save Customer')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerList;
