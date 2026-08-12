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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100/70 text-purple-700 rounded-2xl">
            <Truck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Store Room Requisitions & Stock Issue</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Review material requisitions from Production Team and issue stock to factory floor
            </p>
          </div>
        </div>

        <button
          onClick={fetchRequisitions}
          className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-extrabold transition-all border border-gray-200 flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh List
        </button>
      </div>

      {/* Main List */}
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
        <div className="space-y-4">
          {productions.map((prod) => {
            const isPending = !prod.status || prod.status === 'PENDING_STORE_ROOM_DISPATCH';
            const reqId = prod.productionNumber || `PR-${prod._id.slice(-4)}`;

            return (
              <div key={prod._id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                {/* Requisition Header */}
                <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black font-mono text-purple-900 px-3 py-1 bg-purple-50 rounded-xl border border-purple-200">
                      ID: {reqId}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        {prod.requisitionType === 'MIX_REQUISITION' ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black uppercase tracking-wide border border-purple-300">
                            🥣 Mix Preparation Requisition
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 text-[10px] font-black uppercase tracking-wide border border-indigo-300">
                            🍦 Finished Goods Assembly Requisition
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-extrabold text-gray-900 mt-1">{prod.finishedGoodProduct?.name || 'Finished Product'}</h3>
                      <p className="text-xs text-gray-500 font-semibold">
                        {prod.requisitionType === 'MIX_REQUISITION' ? (
                          <>Target Mix Volume: <span className="font-mono text-purple-900 font-extrabold">{prod.totalPieces || prod.mixLiters} Liters</span></>
                        ) : (
                          <>Target Output: <span className="font-mono text-gray-900 font-extrabold">{prod.totalPieces || prod.quantityBoxes * 12} Pcs ({prod.quantityBoxes} Boxes)</span></>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isPending ? (
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-extrabold border border-amber-200 flex items-center gap-1.5">
                        <Clock size={14} className="text-amber-600" /> Pending Store Room Dispatch
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" /> Dispatched to Production
                      </span>
                    )}

                    {isPending && (
                      <button
                        onClick={() => handleDispatchStock(prod._id, reqId)}
                        disabled={dispatchingId === prod._id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {dispatchingId === prod._id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Dispatching...
                          </>
                        ) : (
                          <>
                            <Truck size={15} /> Dispatch Stock & Auto-Inward Mix
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Materials Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Raw Materials */}
                  <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-2">
                    <h4 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={14} className="text-purple-600" /> Requested Raw Materials
                    </h4>
                    {prod.rawMaterialsUsed?.length > 0 ? (
                      <ul className="space-y-1.5 text-xs">
                        {prod.rawMaterialsUsed.map((rm, idx) => (
                          <li key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-purple-100 shadow-sm">
                            <span className="font-extrabold text-purple-950">{getProductName(rm.product, rm.productName || 'Raw Material')}</span>
                            <span className="font-mono font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                              {rm.quantityUsed} {rm.unitOfMeasure || rm.product?.unitOfMeasure}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No raw material items listed.</p>
                    )}
                  </div>

                  {/* Packaging Materials */}
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2">
                    <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Box size={14} className="text-indigo-600" /> Requested Packaging Materials
                    </h4>
                    {prod.packagingMaterialsUsed?.length > 0 ? (
                      <ul className="space-y-1.5 text-xs">
                        {prod.packagingMaterialsUsed.map((pkg, idx) => (
                          <li key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-indigo-100 shadow-sm">
                            <span className="font-extrabold text-indigo-950">{getProductName(pkg.product, pkg.productName || 'Packaging Item')}</span>
                            <span className="font-mono font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StoreRoomRequisitions;
