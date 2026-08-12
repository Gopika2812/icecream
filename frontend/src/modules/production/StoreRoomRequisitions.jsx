import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Factory, Package, CheckCircle2, Clock, Truck, ShieldAlert, ArrowRight, Loader2, RefreshCw, Box
} from 'lucide-react';

const StoreRoomRequisitions = () => {
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [dispatchingId, setDispatchingId] = useState(null);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const [prodRes, productsRes] = await Promise.all([
        api.get('/production'),
        api.get('/products')
      ]);
      setProductions(prodRes.data?.data || []);
      setProducts(productsRes.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch store room requisitions', err);
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (prodRef, defaultFallback) => {
    if (!prodRef) return defaultFallback;
    if (typeof prodRef === 'object' && prodRef.name) return prodRef.name;
    const prodId = typeof prodRef === 'object' ? (prodRef._id || prodRef.id) : prodRef;
    const found = products.find(p => (p._id || p.id) === prodId);
    return found ? found.name : defaultFallback;
  };

  const handleDispatchStock = async (id, prodNumber) => {
    if (!window.confirm(`Are you sure you want to dispatch raw & packaging materials for Requisition ID "${prodNumber}"? This will reduce Store Room inventory.`)) return;

    try {
      setDispatchingId(id);
      const res = await api.post(`/production/${id}/dispatch`);
      alert(res.data?.message || `Stock dispatched for ${prodNumber}! Inventory updated.`);
      fetchRequisitions();
    } catch (err) {
      console.error('Failed to dispatch stock', err);
      alert(err.response?.data?.message || 'Error dispatching stock from Store Room');
    } finally {
      setDispatchingId(null);
    }
  };

  const [expandedRowId, setExpandedRowId] = useState(null);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Truck className="text-purple-600" size={26} />
            Store Room Requisitions & Stock Issue
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Dispatch raw & packaging materials requested by Production team to reduce Store Room inventory
          </p>
        </div>

        <button
          onClick={fetchRequisitions}
          className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-extrabold transition-all border border-gray-200 flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh List
        </button>
      </div>

      {/* Main Compact Table UI */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">
          <Loader2 size={32} className="animate-spin mx-auto text-purple-600 mb-2" />
          <p className="text-xs font-extrabold">Loading Store Room Requisitions...</p>
        </div>
      ) : productions.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">
          <Package size={40} className="mx-auto text-gray-400 mb-2" />
          <h3 className="text-base font-bold text-gray-800">No Material Requisitions Found</h3>
          <p className="text-xs text-gray-500">Requisitions requested by Production Team will appear here.</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden border border-gray-200/80 rounded-3xl shadow-sm bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-extrabold text-gray-600 uppercase tracking-wider">
                  <th className="px-6 py-4">Requisition ID</th>
                  <th className="px-6 py-4">Requisition Type</th>
                  <th className="px-6 py-4">Product / Mix Name (Click for Details)</th>
                  <th className="px-6 py-4 text-center">Target Output</th>
                  <th className="px-6 py-4 text-center">Dispatch Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productions.map((prod) => {
                  const isPending = !prod.status || prod.status === 'PENDING_STORE_ROOM_DISPATCH';
                  const reqId = prod.productionNumber || `PR-${prod._id.slice(-4)}`;
                  const isExpanded = expandedRowId === prod._id;

                  return (
                    <React.Fragment key={prod._id}>
                      <tr className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-black text-purple-900">{reqId}</td>
                        <td className="px-6 py-4">
                          {prod.requisitionType === 'MIX_REQUISITION' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 text-[10px] font-black uppercase tracking-wide border border-purple-300 inline-flex items-center gap-1">
                              🥣 Mix Preparation
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 text-[10px] font-black uppercase tracking-wide border border-indigo-300 inline-flex items-center gap-1">
                              🍦 FG Assembly
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <button
                            type="button"
                            onClick={() => setExpandedRowId(isExpanded ? null : prod._id)}
                            className="text-left font-extrabold text-purple-950 hover:text-purple-700 hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <Package size={16} className="text-purple-600 shrink-0" />
                            {prod.finishedGoodProduct?.name || 'Finished Product'}
                            <span className="text-[10px] text-purple-600 font-normal">
                              ({isExpanded ? '▲ hide materials' : '▼ view materials'})
                            </span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-extrabold text-gray-800">
                          {prod.requisitionType === 'MIX_REQUISITION' ? (
                            <span className="text-purple-900">{prod.totalPieces || prod.mixLiters} Liters</span>
                          ) : (
                            <span>{prod.totalPieces || prod.quantityBoxes * 12} Pcs ({prod.quantityBoxes} Boxes)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isPending ? (
                            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-extrabold border border-amber-200 inline-flex items-center gap-1">
                              <Clock size={12} className="text-amber-600" /> Pending Dispatch
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-600" /> Dispatched
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isPending ? (
                            <button
                              onClick={() => handleDispatchStock(prod._id, reqId)}
                              disabled={dispatchingId === prod._id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer disabled:opacity-50"
                            >
                              {dispatchingId === prod._id ? (
                                <>
                                  <Loader2 size={13} className="animate-spin" /> Dispatching...
                                </>
                              ) : (
                                <>
                                  <Truck size={14} /> Dispatch Stock
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 font-semibold italic">Dispatched</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Materials Breakdown Drawer Row */}
                      {isExpanded && (
                        <tr className="bg-purple-50/40">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Requested Raw Materials */}
                              <div className="bg-white p-4 rounded-2xl border border-purple-200 space-y-2 shadow-xs">
                                <h4 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                                  <Package size={14} className="text-purple-600" /> Requested Raw Materials
                                </h4>
                                {prod.rawMaterialsUsed?.length > 0 ? (
                                  <ul className="space-y-1.5 text-xs">
                                    {prod.rawMaterialsUsed.map((rm, idx) => (
                                      <li key={idx} className="flex justify-between items-center bg-purple-50/50 p-2 rounded-xl border border-purple-100">
                                        <span className="font-extrabold text-purple-950">{getProductName(rm.product, rm.productName || 'Raw Material')}</span>
                                        <span className="font-mono font-black text-purple-900 bg-white px-2 py-0.5 rounded-lg border border-purple-200">
                                          {rm.quantityUsed} {rm.unitOfMeasure || rm.product?.unitOfMeasure}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-gray-500 italic">No raw material items listed.</p>
                                )}
                              </div>

                              {/* Requested Packaging Materials */}
                              <div className="bg-white p-4 rounded-2xl border border-indigo-200 space-y-2 shadow-xs">
                                <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                                  <Box size={14} className="text-indigo-600" /> Requested Packaging Materials
                                </h4>
                                {prod.packagingMaterialsUsed?.length > 0 ? (
                                  <ul className="space-y-1.5 text-xs">
                                    {prod.packagingMaterialsUsed.map((pkg, idx) => (
                                      <li key={idx} className="flex justify-between items-center bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
                                        <span className="font-extrabold text-indigo-950">{getProductName(pkg.product, pkg.productName || 'Packaging Item')}</span>
                                        <span className="font-mono font-black text-indigo-900 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                                          {pkg.quantityRequested} {pkg.unitOfMeasure || pkg.product?.unitOfMeasure}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-gray-500 italic">No packaging items listed.</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreRoomRequisitions;
