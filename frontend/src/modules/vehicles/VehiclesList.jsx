import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Truck, Plus, Search, Wrench, ShieldAlert, History, Calendar, 
  UserCheck, DollarSign, Loader2, CheckCircle2, AlertTriangle, ThermometerSnowflake, FileText, Gauge
} from 'lucide-react';
import Modal from '../../components/Modal';

const VehiclesList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedVehicleForMaintenance, setSelectedVehicleForMaintenance] = useState(null);

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Forms
  const [vehicleForm, setVehicleForm] = useState({
    vehicleCode: '',
    registrationNumber: '',
    vehicleType: 'Auto Sales Delivery Van',
    makeModel: '',
    reeferUnitMake: '',
    targetTemperature: -18,
    payloadCapacityBoxes: 50,
    assignedDriver: '',
    driverContact: '',
    status: 'Operational',
    insuranceExpiry: '',
    fitnessCertExpiry: '',
    pucExpiry: '',
    currentOdometerKm: 0,
    remarks: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    serviceType: 'Engine Oil & Filter',
    description: '',
    workshopName: '',
    odometerKm: 0,
    partsCost: 0,
    laborCost: 0,
    totalExpenseAmount: 0,
    servicedDate: new Date().toISOString().split('T')[0],
    nextServiceDueKm: 0,
    receiptNumber: ''
  });

  useEffect(() => {
    fetchVehiclesData();
  }, []);

  const fetchVehiclesData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vehicles');
      setVehicles(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddVehicleModal = async () => {
    setEditingVehicleId(null);
    let nextCode = 'VECH001';
    try {
      const res = await api.get('/vehicles/next-code');
      if (res.data?.nextCode) nextCode = res.data.nextCode;
    } catch (err) {
      console.error('Failed to get next vehicle code:', err);
    }

    setVehicleForm({
      vehicleCode: nextCode,
      registrationNumber: '',
      vehicleType: 'Auto Sales Delivery Van',
      makeModel: '',
      reeferUnitMake: '',
      targetTemperature: -18,
      payloadCapacityBoxes: 50,
      assignedDriver: '',
      driverContact: '',
      status: 'Operational',
      insuranceExpiry: '',
      fitnessCertExpiry: '',
      pucExpiry: '',
      currentOdometerKm: 0,
      remarks: ''
    });
    setIsVehicleModalOpen(true);
  };

  const handleOpenEditVehicleModal = (v) => {
    setEditingVehicleId(v._id);
    setVehicleForm({
      vehicleCode: v.vehicleCode || '',
      registrationNumber: v.registrationNumber || '',
      vehicleType: v.vehicleType || 'Auto Sales Delivery Van',
      makeModel: v.makeModel || '',
      reeferUnitMake: v.reeferUnitMake || '',
      targetTemperature: v.targetTemperature !== undefined ? v.targetTemperature : -18,
      payloadCapacityBoxes: v.payloadCapacityBoxes || 50,
      assignedDriver: v.assignedDriver || '',
      driverContact: v.driverContact || '',
      status: v.status || 'Operational',
      insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.split('T')[0] : '',
      fitnessCertExpiry: v.fitnessCertExpiry ? v.fitnessCertExpiry.split('T')[0] : '',
      pucExpiry: v.pucExpiry ? v.pucExpiry.split('T')[0] : '',
      currentOdometerKm: v.currentOdometerKm || 0,
      remarks: v.remarks || ''
    });
    setIsVehicleModalOpen(true);
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...vehicleForm,
        targetTemperature: parseFloat(vehicleForm.targetTemperature) || -18,
        payloadCapacityBoxes: parseInt(vehicleForm.payloadCapacityBoxes) || 50,
        currentOdometerKm: parseFloat(vehicleForm.currentOdometerKm) || 0
      };

      if (editingVehicleId) {
        await api.put(`/vehicles/${editingVehicleId}`, payload);
      } else {
        await api.post('/vehicles', payload);
      }

      setIsVehicleModalOpen(false);
      fetchVehiclesData();
    } catch (error) {
      console.error('Failed to save vehicle:', error);
      alert(error.response?.data?.message || 'Error saving vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMaintenanceModal = (v) => {
    setSelectedVehicleForMaintenance(v);
    setMaintenanceForm({
      serviceType: 'Engine Oil & Filter',
      description: '',
      workshopName: '',
      odometerKm: v.currentOdometerKm || 0,
      partsCost: 0,
      laborCost: 0,
      totalExpenseAmount: 0,
      servicedDate: new Date().toISOString().split('T')[0],
      nextServiceDueKm: (v.currentOdometerKm || 0) + 5000,
      receiptNumber: ''
    });
    setIsMaintenanceModalOpen(true);
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicleForMaintenance) return;

    try {
      setSubmitting(true);
      const parts = parseFloat(maintenanceForm.partsCost) || 0;
      const labor = parseFloat(maintenanceForm.laborCost) || 0;
      const total = parseFloat(maintenanceForm.totalExpenseAmount) || (parts + labor);

      const payload = {
        ...maintenanceForm,
        partsCost: parts,
        laborCost: labor,
        totalExpenseAmount: total,
        odometerKm: parseFloat(maintenanceForm.odometerKm) || 0
      };

      const res = await api.post(`/vehicles/${selectedVehicleForMaintenance._id}/maintenance`, payload);
      alert(res.data?.message || 'Vehicle maintenance ledger entry recorded!');
      setIsMaintenanceModalOpen(false);
      fetchVehiclesData();
    } catch (error) {
      console.error('Failed to log vehicle maintenance:', error);
      alert(error.response?.data?.message || 'Error logging vehicle maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryDrawer = async (v) => {
    setSelectedVehicleForHistory(v);
    setIsHistoryDrawerOpen(true);
    try {
      setLoadingHistory(true);
      const res = await api.get(`/vehicles/${v._id}/maintenance`);
      setMaintenanceHistory(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch vehicle maintenance history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Check document expiry status
  const getExpiryStatus = (dateStr) => {
    if (!dateStr) return { status: 'NORMAL', text: 'N/A' };
    const expiry = new Date(dateStr);
    const today = new Date();
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { status: 'EXPIRED', text: 'EXPIRED' };
    if (daysLeft <= 15) return { status: 'WARNING', text: `Expires in ${daysLeft} days` };
    return { status: 'NORMAL', text: expiry.toLocaleDateString('en-IN') };
  };

  // Filter Vehicles
  const filteredVehicles = vehicles.filter(v => {
    if (typeFilter !== 'ALL' && v.vehicleType !== typeFilter) return false;
    if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (v.vehicleCode || '').toLowerCase().includes(q) ||
      (v.registrationNumber || '').toLowerCase().includes(q) ||
      (v.assignedDriver || '').toLowerCase().includes(q) ||
      (v.makeModel || '').toLowerCase().includes(q)
    );
  });

  // Calculate Metrics
  const totalFleetCount = vehicles.length;
  const autoSalesCount = vehicles.filter(v => v.vehicleType === 'Auto Sales Delivery Van' || v.vehicleType === 'Delivery Auto').length;
  const totalMaintenanceSpent = vehicles.reduce((sum, v) => sum + (v.totalMaintenanceCost || 0), 0);
  const expiringDocsCount = vehicles.filter(v => {
    const ins = getExpiryStatus(v.insuranceExpiry);
    const fc = getExpiryStatus(v.fitnessCertExpiry);
    const puc = getExpiryStatus(v.pucExpiry);
    return ins.status !== 'NORMAL' || fc.status !== 'NORMAL' || puc.status !== 'NORMAL';
  }).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Truck className="text-[var(--color-primary)]" size={26} />
            Auto Sales & Vehicle Fleet (Code: VECH001)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage refrigerated delivery trucks, Auto Sales vans, vehicle maintenance ledgers, fuel costs & compliance renewals
          </p>
        </div>

        <button
          onClick={handleOpenAddVehicleModal}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-xs font-bold cursor-pointer"
        >
          <Plus size={16} /> Add Vehicle (VECH001)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Active Fleet</span>
            <h3 className="text-xl font-bold text-gray-900 font-mono mt-0.5">{totalFleetCount} Vehicles</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-indigo-500">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <UserCheck size={24} />
          </div>
          <div>
            <span className="text-xs text-indigo-800 font-semibold uppercase tracking-wider">Auto Sales Vans</span>
            <h3 className="text-xl font-bold text-indigo-700 font-mono mt-0.5">{autoSalesCount} Delivery Vans</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-rose-500">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Wrench size={24} />
          </div>
          <div>
            <span className="text-xs text-rose-800 font-semibold uppercase tracking-wider">Maintenance Ledger Spent</span>
            <h3 className="text-xl font-bold text-rose-700 font-mono mt-0.5">₹{totalMaintenanceSpent.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">FC / Insurance Warnings</span>
            <h3 className="text-xl font-bold text-amber-700 font-mono mt-0.5">{expiringDocsCount} Due Soon</h3>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white/50 p-4 rounded-2xl border border-[var(--color-glass-border)] shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Vehicle Code (VECH001), Reg No (TN-37-AB-1234), Driver Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Vehicle Types</option>
            <option value="Auto Sales Delivery Van">Auto Sales Delivery Van</option>
            <option value="Reefer Truck">Reefer Truck</option>
            <option value="Delivery Auto">Delivery Auto</option>
            <option value="Insulated Van">Insulated Van</option>
            <option value="Forklift / Stack">Forklift / Stack</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Operational">Operational</option>
            <option value="In Transit">In Transit</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Out of Service">Out of Service</option>
          </select>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 font-medium flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-[var(--color-primary)]" /> Loading Fleet Catalog...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50/70 border-b border-rose-100 text-rose-950 font-black uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Vehicle Code</th>
                  <th className="px-4 py-3.5">Registration & Vehicle Model</th>
                  <th className="px-4 py-3.5">Assigned Driver</th>
                  <th className="px-4 py-3.5">Target Temp / Capacity</th>
                  <th className="px-4 py-3.5">Odometer (Km)</th>
                  <th className="px-4 py-3.5 text-right">Maintenance Spent</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredVehicles.map((v) => {
                  const ins = getExpiryStatus(v.insuranceExpiry);
                  const fc = getExpiryStatus(v.fitnessCertExpiry);
                  const hasWarning = ins.status !== 'NORMAL' || fc.status !== 'NORMAL';

                  return (
                    <tr key={v._id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-black text-rose-900">
                        <span className="bg-rose-100/80 px-2 py-1 rounded-lg border border-rose-200 block text-center">
                          {v.vehicleCode || 'VECH001'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                          <span>{v.registrationNumber}</span>
                          {hasWarning && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black border border-amber-300">
                              ⚠️ Compliance Due
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium">
                          {v.vehicleType} | {v.makeModel || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-800 block">{v.assignedDriver || 'Unassigned'}</span>
                        {v.driverContact && <span className="text-[10px] text-gray-500 font-mono">Ph: {v.driverContact}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-mono text-[11px] font-black border border-blue-200">
                            {v.targetTemperature !== undefined ? v.targetTemperature : -18}°C
                          </span>
                          <span className="text-[10px] text-gray-600 font-bold">
                            {v.payloadCapacityBoxes || 50} Boxes
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-800">
                        {(v.currentOdometerKm || 0).toLocaleString()} Km
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-rose-950">
                        ₹{(v.totalMaintenanceCost || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenMaintenanceModal(v)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg font-extrabold text-[11px] border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                            title="Log Vehicle Service Expense"
                          >
                            <Wrench size={12} /> + Service
                          </button>
                          <button
                            onClick={() => handleOpenHistoryDrawer(v)}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg font-extrabold text-[11px] border border-purple-200 transition-all flex items-center gap-1 cursor-pointer"
                            title="View Maintenance Ledger"
                          >
                            <History size={12} /> Ledger
                          </button>
                          <button
                            onClick={() => handleOpenEditVehicleModal(v)}
                            className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-2 py-1 rounded-lg font-bold text-[11px] border border-gray-200 transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500 font-medium">
                      No fleet vehicles found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL 1: ADD / EDIT VEHICLE (VECH001) --- */}
      {isVehicleModalOpen && (
        <Modal
          isOpen={isVehicleModalOpen}
          onClose={() => setIsVehicleModalOpen(false)}
          title={editingVehicleId ? `Edit Vehicle (${vehicleForm.vehicleCode})` : "Register New Delivery Vehicle (Code: VECH001)"}
          size="lg"
        >
          <form onSubmit={handleVehicleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Vehicle Code *</label>
                <input
                  type="text"
                  required
                  placeholder="Auto-generated (e.g. VECH001)"
                  value={vehicleForm.vehicleCode}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleCode: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-rose-950"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Registration Number (e.g. TN-37-AB-1234) *</label>
                <input
                  type="text"
                  required
                  placeholder="TN-37-AB-1234"
                  value={vehicleForm.registrationNumber}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value.toUpperCase() })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-gray-900 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Vehicle Category / Type *</label>
                <select
                  value={vehicleForm.vehicleType}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 cursor-pointer"
                >
                  <option value="Auto Sales Delivery Van">Auto Sales Delivery Van</option>
                  <option value="Reefer Truck">Reefer Truck</option>
                  <option value="Delivery Auto">Delivery Auto</option>
                  <option value="Insulated Van">Insulated Van</option>
                  <option value="Forklift / Stack">Forklift / Stack</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Make & Model</label>
                <input
                  type="text"
                  placeholder="e.g. Mahindra Supro / Tata Ace"
                  value={vehicleForm.makeModel}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, makeModel: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Target Temp (°C) *</label>
                <input
                  type="number"
                  required
                  value={vehicleForm.targetTemperature}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, targetTemperature: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Payload Boxes Cap</label>
                <input
                  type="number"
                  required
                  value={vehicleForm.payloadCapacityBoxes}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, payloadCapacityBoxes: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Current Odometer (Km)</label>
                <input
                  type="number"
                  value={vehicleForm.currentOdometerKm}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, currentOdometerKm: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Assigned Driver Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={vehicleForm.assignedDriver}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, assignedDriver: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Driver Contact Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={vehicleForm.driverContact}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, driverContact: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Insurance Expiry Date</label>
                <input
                  type="date"
                  value={vehicleForm.insuranceExpiry}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceExpiry: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-900 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Fitness Cert (FC) Expiry</label>
                <input
                  type="date"
                  value={vehicleForm.fitnessCertExpiry}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, fitnessCertExpiry: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-900 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">PUC Expiry Date</label>
                <input
                  type="date"
                  value={vehicleForm.pucExpiry}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, pucExpiry: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-900 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-[var(--color-primary)] hover:bg-pink-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? 'Saving Vehicle...' : (editingVehicleId ? 'Update Vehicle' : 'Register Vehicle (VECH001)')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 2: LOG VEHICLE MAINTENANCE EXPENSE --- */}
      {isMaintenanceModalOpen && selectedVehicleForMaintenance && (
        <Modal
          isOpen={isMaintenanceModalOpen}
          onClose={() => setIsMaintenanceModalOpen(false)}
          title={`Log Maintenance Ledger (${selectedVehicleForMaintenance.vehicleCode} - ${selectedVehicleForMaintenance.registrationNumber})`}
          size="md"
        >
          <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-rose-950">
                <span>Vehicle Code: <strong>{selectedVehicleForMaintenance.vehicleCode}</strong></span>
                <span>Reg No: <strong>{selectedVehicleForMaintenance.registrationNumber}</strong></span>
              </div>
              <p className="text-[11px] text-rose-800 font-semibold">
                Lifetime Maintenance Spent: <strong>₹{(selectedVehicleForMaintenance.totalMaintenanceCost || 0).toLocaleString()}</strong> | Odometer: <strong>{selectedVehicleForMaintenance.currentOdometerKm || 0} Km</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Maintenance Service Type *</label>
                <select
                  value={maintenanceForm.serviceType}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceType: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 cursor-pointer"
                >
                  <option value="Engine Oil & Filter">Engine Oil & Filter</option>
                  <option value="Tire Replacement">Tire Replacement</option>
                  <option value="Reefer AC Gas & Compressor">Reefer AC Gas & Compressor</option>
                  <option value="Brake Work">Brake Work</option>
                  <option value="Battery Replacement">Battery Replacement</option>
                  <option value="Electrical & Wiring">Electrical & Wiring</option>
                  <option value="General Service">General Service</option>
                  <option value="Accident Repair">Accident Repair</option>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Current Odometer Reading (Km) *</label>
                <input
                  type="number"
                  required
                  value={maintenanceForm.odometerKm}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, odometerKm: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Mechanic Garage / Workshop Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sri Auto Garage"
                  value={maintenanceForm.workshopName}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, workshopName: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-gray-800 block">Work & Spare Parts Description *</label>
              <textarea
                rows="2"
                required
                placeholder="e.g. Replaced 4 Liters Castrol Engine Oil & 2 Front Tubeless Tires"
                value={maintenanceForm.description}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Spare Parts Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={maintenanceForm.partsCost}
                  onChange={(e) => {
                    const parts = parseFloat(e.target.value) || 0;
                    const labor = parseFloat(maintenanceForm.laborCost) || 0;
                    setMaintenanceForm({
                      ...maintenanceForm,
                      partsCost: e.target.value,
                      totalExpenseAmount: parts + labor
                    });
                  }}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-800 block">Mechanic Labor (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={maintenanceForm.laborCost}
                  onChange={(e) => {
                    const labor = parseFloat(e.target.value) || 0;
                    const parts = parseFloat(maintenanceForm.partsCost) || 0;
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
                <label className="text-xs font-extrabold text-rose-950 block">Total Expense Amount (₹) *</label>
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
                {submitting ? 'Recording Expense...' : 'Post to Vehicle Maintenance Ledger'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- DRAWER 3: VEHICLE MAINTENANCE LEDGER HISTORY --- */}
      {isHistoryDrawerOpen && selectedVehicleForHistory && (
        <Modal
          isOpen={isHistoryDrawerOpen}
          onClose={() => setIsHistoryDrawerOpen(false)}
          title={`Vehicle Maintenance Ledger History (${selectedVehicleForHistory.vehicleCode} - ${selectedVehicleForHistory.registrationNumber})`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-rose-50 via-indigo-50 to-blue-50 border border-rose-200 rounded-2xl flex justify-between items-center">
              <div>
                <h4 className="text-base font-extrabold text-rose-950">{selectedVehicleForHistory.registrationNumber} ({selectedVehicleForHistory.vehicleType})</h4>
                <p className="text-xs text-rose-800 font-semibold mt-0.5">
                  Code: <strong>{selectedVehicleForHistory.vehicleCode}</strong> | Driver: {selectedVehicleForHistory.assignedDriver || 'Unassigned'} | Odo: {selectedVehicleForHistory.currentOdometerKm || 0} Km
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Total Maintenance Spent</span>
                <span className="text-xl font-mono font-black text-rose-900">₹{(selectedVehicleForHistory.totalMaintenanceCost || 0).toLocaleString()}</span>
              </div>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-gray-500 font-medium flex justify-center items-center gap-2">
                <Loader2 size={16} className="animate-spin text-rose-600" /> Loading Vehicle Maintenance History...
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
                          • {new Date(item.servicedDate).toLocaleDateString('en-IN')} @ {item.odometerKm || 0} Km
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 font-medium">{item.description || 'General maintenance completed'}</p>
                      {item.workshopName && (
                        <div className="text-[10px] text-gray-500 font-semibold">Garage: {item.workshopName}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono font-black text-rose-950">₹{(item.totalExpenseAmount || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 font-bold">Parts: ₹{item.partsCost} | Labor: ₹{item.laborCost}</div>
                    </div>
                  </div>
                ))}

                {maintenanceHistory.length === 0 && (
                  <div className="p-8 text-center text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    No maintenance records logged for this vehicle yet.
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

export default VehiclesList;
