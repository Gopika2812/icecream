import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  PackageCheck, Plus, Search, Wrench, ShieldAlert, History, Calendar, 
  Building2, UserCheck, DollarSign, Loader2, CheckCircle2, ChevronRight, X, Clock, AlertTriangle
} from 'lucide-react';
import Modal from '../../components/Modal';
import SearchableSelect from '../../components/SearchableSelect';

const AssetsList = () => {
  const [assets, setAssets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals State
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);
  
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedAssetForMaintenance, setSelectedAssetForMaintenance] = useState(null);

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Forms State
  const [assetForm, setAssetForm] = useState({
    assetCode: '',
    name: '',
    category: 'Processing Machinery',
    modelNumber: '',
    serialNumber: '',
    manufacturer: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    warrantyExpiry: '',
    location: 'Main Factory',
    status: 'Operational',
    assignedDealerCustomer: '',
    remarks: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    serviceType: 'Preventive Servicing',
    issueDescription: '',
    workDone: '',
    serviceVendor: '',
    sparePartsCost: 0,
    laborCost: 0,
    totalExpenseAmount: 0,
    servicedDate: new Date().toISOString().split('T')[0],
    nextDueDate: '',
    status: 'Completed'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [astRes, custRes] = await Promise.all([
        api.get('/assets'),
        api.get('/customers')
      ]);
      setAssets(astRes.data.data || []);
      setCustomers(custRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch assets data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddAssetModal = () => {
    setEditingAssetId(null);
    setAssetForm({
      assetCode: '',
      name: '',
      category: 'Processing Machinery',
      modelNumber: '',
      serialNumber: '',
      manufacturer: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: '',
      warrantyExpiry: '',
      location: 'Main Factory',
      status: 'Operational',
      assignedDealerCustomer: '',
      remarks: ''
    });
    setIsAssetModalOpen(true);
  };

  const handleOpenEditAssetModal = (asset) => {
    setEditingAssetId(asset._id);
    setAssetForm({
      assetCode: asset.assetCode || '',
      name: asset.name || '',
      category: asset.category || 'Processing Machinery',
      modelNumber: asset.modelNumber || '',
      serialNumber: asset.serialNumber || '',
      manufacturer: asset.manufacturer || '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      purchaseCost: asset.purchaseCost || '',
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
      location: asset.location || 'Main Factory',
      status: asset.status || 'Operational',
      assignedDealerCustomer: asset.assignedDealerCustomer?._id || asset.assignedDealerCustomer || '',
      remarks: asset.remarks || ''
    });
    setIsAssetModalOpen(true);
  };

  const handleAssetSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...assetForm,
        purchaseCost: parseFloat(assetForm.purchaseCost) || 0
      };

      if (editingAssetId) {
        await api.put(`/assets/${editingAssetId}`, payload);
      } else {
        await api.post('/assets', payload);
      }

      setIsAssetModalOpen(false);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to save asset:', error);
      alert(error.response?.data?.message || 'Error saving asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMaintenanceModal = (asset) => {
    setSelectedAssetForMaintenance(asset);
    setMaintenanceForm({
      serviceType: 'Preventive Servicing',
      issueDescription: '',
      workDone: '',
      serviceVendor: '',
      sparePartsCost: 0,
      laborCost: 0,
      totalExpenseAmount: 0,
      servicedDate: new Date().toISOString().split('T')[0],
      nextDueDate: '',
      status: 'Completed'
    });
    setIsMaintenanceModalOpen(true);
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssetForMaintenance) return;

    try {
      setSubmitting(true);
      const parts = parseFloat(maintenanceForm.sparePartsCost) || 0;
      const labor = parseFloat(maintenanceForm.laborCost) || 0;
      const total = parseFloat(maintenanceForm.totalExpenseAmount) || (parts + labor);

      const payload = {
        ...maintenanceForm,
        sparePartsCost: parts,
        laborCost: labor,
        totalExpenseAmount: total
      };

      const res = await api.post(`/assets/${selectedAssetForMaintenance._id}/maintenance`, payload);
      alert(res.data?.message || 'Maintenance record saved!');
      setIsMaintenanceModalOpen(false);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to log asset maintenance:', error);
      alert(error.response?.data?.message || 'Error logging maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryDrawer = async (asset) => {
    setSelectedAssetForHistory(asset);
    setIsHistoryDrawerOpen(true);
    try {
      setLoadingHistory(true);
      const res = await api.get(`/assets/${asset._id}/maintenance`);
      setMaintenanceHistory(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch asset maintenance history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filter Assets
  const filteredAssets = assets.filter(a => {
    if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (a.assetCode || '').toLowerCase().includes(q) ||
      (a.name || '').toLowerCase().includes(q) ||
      (a.serialNumber || '').toLowerCase().includes(q) ||
      (a.location || '').toLowerCase().includes(q)
    );
  });

  // Calculate Metrics
  const totalAssetsCount = assets.length;
  const operationalCount = assets.filter(a => a.status === 'Operational').length;
  const dealerAssignedCount = assets.filter(a => a.status === 'Assigned to Dealer').length;
  const totalMaintenanceSpent = assets.reduce((sum, a) => sum + (a.totalMaintenanceCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
            <PackageCheck className="text-[var(--color-primary)]" size={26} />
            Asset & Machinery Management (Code: A001)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track high-value cold-chain freezers, pasteurizers, machinery maintenance ledgers, and dealer equipment allocations
          </p>
        </div>

        <button
          onClick={handleOpenAddAssetModal}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-xs font-bold cursor-pointer"
        >
          <Plus size={16} /> Add New Asset (A001)
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <PackageCheck size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Registered Assets</span>
            <h3 className="text-xl font-bold text-gray-900 font-mono mt-0.5">{totalAssetsCount} Equipment</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Operational Fleet</span>
            <h3 className="text-xl font-bold text-emerald-700 font-mono mt-0.5">{operationalCount} Active</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-purple-500">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <UserCheck size={24} />
          </div>
          <div>
            <span className="text-xs text-purple-800 font-semibold uppercase tracking-wider">Assigned to Retail Dealers</span>
            <h3 className="text-xl font-bold text-purple-700 font-mono mt-0.5">{dealerAssignedCount} Freezers</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-rose-500">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Wrench size={24} />
          </div>
          <div>
            <span className="text-xs text-rose-800 font-semibold uppercase tracking-wider">Lifetime Maintenance Ledger</span>
            <h3 className="text-xl font-bold text-rose-700 font-mono mt-0.5">₹{totalMaintenanceSpent.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Search & Filtration Bar */}
      <div className="bg-white/50 p-4 rounded-2xl border border-[var(--color-glass-border)] shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Asset Code (A001), Name, Serial No, Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="Processing Machinery">Processing Machinery</option>
            <option value="Cold Storage & Compressors">Cold Storage & Compressors</option>
            <option value="Retail Dealer Freezer">Retail Dealer Freezer</option>
            <option value="Utility & Generator">Utility & Generator</option>
            <option value="Factory Tools">Factory Tools</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Operational">Operational</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Assigned to Dealer">Assigned to Dealer</option>
            <option value="Scrapped">Scrapped</option>
          </select>
        </div>
      </div>

      {/* Asset Catalog Table */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 font-medium flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-[var(--color-primary)]" /> Loading Assets Catalog...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50/70 border-b border-rose-100 text-rose-950 font-black uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Asset Code</th>
                  <th className="px-4 py-3.5">Asset Name & Details</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Location / Dealer</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Maintenance Spent</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredAssets.map((asset) => (
                  <tr key={asset._id} className="hover:bg-rose-50/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-black text-rose-900">
                      <span className="bg-rose-100/80 px-2 py-1 rounded-lg border border-rose-200">
                        {asset.assetCode || 'A001'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-gray-900 text-sm">{asset.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        S/N: {asset.serialNumber || 'N/A'} | Model: {asset.modelNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-gray-200">
                        {asset.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {asset.status === 'Assigned to Dealer' && asset.assignedDealerCustomer ? (
                        <div>
                          <span className="font-bold text-purple-900 block flex items-center gap-1">
                            <UserCheck size={12} /> {asset.assignedDealerCustomer.name}
                          </span>
                          <span className="text-[10px] text-purple-700 block">{asset.assignedDealerCustomer.shopName || asset.location}</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-700">{asset.location || 'Main Factory'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] border ${
                        asset.status === 'Operational'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : asset.status === 'Under Maintenance'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : asset.status === 'Assigned to Dealer'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-rose-950">
                      ₹{(asset.totalMaintenanceCost || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenMaintenanceModal(asset)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg font-extrabold text-[11px] border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                          title="Log Maintenance Expense"
                        >
                          <Wrench size={12} /> + Maintenance
                        </button>
                        <button
                          onClick={() => handleOpenHistoryDrawer(asset)}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg font-extrabold text-[11px] border border-purple-200 transition-all flex items-center gap-1 cursor-pointer"
                          title="View Ledger History"
                        >
                          <History size={12} /> Ledger
                        </button>
                        <button
                          onClick={() => handleOpenEditAssetModal(asset)}
                          className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-2 py-1 rounded-lg font-bold text-[11px] border border-gray-200 transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500 font-medium">
                      No assets found matching the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL 1: ADD / EDIT ASSET (A001) --- */}
      {isAssetModalOpen && (
        <Modal
          isOpen={isAssetModalOpen}
          onClose={() => setIsAssetModalOpen(false)}
          title={editingAssetId ? `Edit Asset (${assetForm.assetCode})` : "Register New Asset / Equipment (Code: A001)"}
          size="lg"
        >
          <form onSubmit={handleAssetSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Asset Code *</label>
                <input
                  type="text"
                  required
                  placeholder="Auto-generated (e.g. A001)"
                  value={assetForm.assetCode}
                  onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-rose-950"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Continuous Freezer 600 LPH"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Asset Category *</label>
                <select
                  value={assetForm.category}
                  onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 cursor-pointer"
                >
                  <option value="Processing Machinery">Processing Machinery</option>
                  <option value="Cold Storage & Compressors">Cold Storage & Compressors</option>
                  <option value="Retail Dealer Freezer">Retail Dealer Freezer</option>
                  <option value="Utility & Generator">Utility & Generator</option>
                  <option value="Factory Tools">Factory Tools</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Current Location / Facility *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Factory Floor 1"
                  value={assetForm.location}
                  onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Model Number</label>
                <input
                  type="text"
                  placeholder="e.g. CF-600"
                  value={assetForm.modelNumber}
                  onChange={(e) => setAssetForm({ ...assetForm, modelNumber: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. SN-998844"
                  value={assetForm.serialNumber}
                  onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Purchase Cost (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 450000"
                  value={assetForm.purchaseCost}
                  onChange={(e) => setAssetForm({ ...assetForm, purchaseCost: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Operational Status *</label>
                <select
                  value={assetForm.status}
                  onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 cursor-pointer"
                >
                  <option value="Operational">Operational</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Assigned to Dealer">Assigned to Dealer</option>
                  <option value="Scrapped">Scrapped</option>
                </select>
              </div>

              {assetForm.status === 'Assigned to Dealer' && (
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-purple-900 block">Assign to Retail Dealer Customer</label>
                  <select
                    value={assetForm.assignedDealerCustomer}
                    onChange={(e) => setAssetForm({ ...assetForm, assignedDealerCustomer: e.target.value })}
                    className="w-full bg-purple-50 border border-purple-300 rounded-xl px-3 py-2 text-xs font-bold text-purple-950 cursor-pointer"
                  >
                    <option value="">-- Select Retail Dealer --</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.shopName || 'Retail Customer'})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsAssetModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-[var(--color-primary)] hover:bg-pink-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? 'Saving Asset...' : (editingAssetId ? 'Update Asset' : 'Register Asset (A001)')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 2: LOG ASSET MAINTENANCE EXPENSE --- */}
      {isMaintenanceModalOpen && selectedAssetForMaintenance && (
        <Modal
          isOpen={isMaintenanceModalOpen}
          onClose={() => setIsMaintenanceModalOpen(false)}
          title={`Log Maintenance Ledger (${selectedAssetForMaintenance.assetCode} - ${selectedAssetForMaintenance.name})`}
          size="md"
        >
          <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-rose-950">
                <span>Asset Code: <strong>{selectedAssetForMaintenance.assetCode}</strong></span>
                <span>Category: <strong>{selectedAssetForMaintenance.category}</strong></span>
              </div>
              <p className="text-[11px] text-rose-800 font-semibold">
                Current Lifetime Spent: <strong>₹{(selectedAssetForMaintenance.totalMaintenanceCost || 0).toLocaleString()}</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Service Type *</label>
                <select
                  value={maintenanceForm.serviceType}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceType: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 cursor-pointer"
                >
                  <option value="Preventive Servicing">Preventive Servicing</option>
                  <option value="Breakdown Repair">Breakdown Repair</option>
                  <option value="Refrigerant Gas Top-Up">Refrigerant Gas Top-Up</option>
                  <option value="Calibration">Calibration</option>
                  <option value="Part Replacement">Part Replacement</option>
                  <option value="General Checkup">General Checkup</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Serviced Date *</label>
                <input
                  type="date"
                  required
                  value={maintenanceForm.servicedDate}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, servicedDate: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-gray-800 block">Work Done / Repair Description *</label>
              <textarea
                rows="2"
                required
                placeholder="e.g. Replaced compressor oil filter & recharged Freon Gas"
                value={maintenanceForm.workDone}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, workDone: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Spare Parts Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={maintenanceForm.sparePartsCost}
                  onChange={(e) => {
                    const parts = parseFloat(e.target.value) || 0;
                    const labor = parseFloat(maintenanceForm.laborCost) || 0;
                    setMaintenanceForm({
                      ...maintenanceForm,
                      sparePartsCost: e.target.value,
                      totalExpenseAmount: parts + labor
                    });
                  }}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Labor Charge (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={maintenanceForm.laborCost}
                  onChange={(e) => {
                    const labor = parseFloat(e.target.value) || 0;
                    const parts = parseFloat(maintenanceForm.sparePartsCost) || 0;
                    setMaintenanceForm({
                      ...maintenanceForm,
                      laborCost: e.target.value,
                      totalExpenseAmount: parts + labor
                    });
                  }}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-rose-950 block">Total Spent Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={maintenanceForm.totalExpenseAmount}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, totalExpenseAmount: e.target.value })}
                  className="w-full bg-rose-50 border-2 border-rose-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-rose-950"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-gray-800 block">Workshop / Service Engineer Vendor</label>
              <input
                type="text"
                placeholder="e.g. Carrier Refrigeration Services"
                value={maintenanceForm.serviceVendor}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceVendor: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsMaintenanceModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? 'Recording Ledger...' : 'Post to Maintenance Ledger'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- DRAWER 3: ASSET MAINTENANCE LEDGER HISTORY --- */}
      {isHistoryDrawerOpen && selectedAssetForHistory && (
        <Modal
          isOpen={isHistoryDrawerOpen}
          onClose={() => setIsHistoryDrawerOpen(false)}
          title={`Maintenance Ledger History (${selectedAssetForHistory.assetCode} - ${selectedAssetForHistory.name})`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-rose-50 via-purple-50 to-blue-50 border border-rose-200 rounded-2xl flex justify-between items-center">
              <div>
                <h4 className="text-base font-extrabold text-rose-950">{selectedAssetForHistory.name}</h4>
                <p className="text-xs text-rose-800 font-semibold mt-0.5">
                  Asset Code: <strong>{selectedAssetForHistory.assetCode}</strong> | Category: {selectedAssetForHistory.category}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Total Spent</span>
                <span className="text-xl font-mono font-black text-rose-900">₹{(selectedAssetForHistory.totalMaintenanceCost || 0).toLocaleString()}</span>
              </div>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-gray-500 font-medium flex justify-center items-center gap-2">
                <Loader2 size={16} className="animate-spin text-rose-600" /> Loading Maintenance Ledger Entries...
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {maintenanceHistory.map((item, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-rose-100 text-rose-900 font-mono text-[10px] font-black px-2 py-0.5 rounded-md border border-rose-200">
                          {item.maintenanceNumber || `MNT-${idx+1}`}
                        </span>
                        <span className="font-extrabold text-xs text-gray-900">{item.serviceType}</span>
                        <span className="text-[10px] text-gray-500 font-bold">
                          • {new Date(item.servicedDate).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 font-medium">{item.workDone || item.issueDescription || 'Servicing completed'}</p>
                      {item.serviceVendor && (
                        <div className="text-[10px] text-gray-500 font-semibold">Workshop/Engineer: {item.serviceVendor}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono font-black text-rose-950">₹{(item.totalExpenseAmount || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 font-bold">Parts: ₹{item.sparePartsCost} | Labor: ₹{item.laborCost}</div>
                    </div>
                  </div>
                ))}

                {maintenanceHistory.length === 0 && (
                  <div className="p-8 text-center text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    No maintenance records logged for this asset yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AssetsList;
