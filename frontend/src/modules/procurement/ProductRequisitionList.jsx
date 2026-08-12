import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  ShoppingCart, Package, AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw
} from 'lucide-react';

const ProductRequisitionList = () => {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/product-requisitions');
      setRequisitions(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch purchase requisitions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/product-requisitions/${id}/status`, { status });
      fetchRequisitions();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-100/70 text-rose-700 rounded-2xl">
            <ShoppingCart size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Product Purchase Requisitions</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Low stock & out-of-stock purchase indents sent by Production Team for Purchase Order processing
            </p>
          </div>
        </div>

        <button
          onClick={fetchRequisitions}
          className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-extrabold transition-all border border-gray-200 flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">
          <Loader2 size={32} className="animate-spin mx-auto text-rose-600 mb-2" />
          <p className="text-xs font-extrabold">Loading Purchase Requisitions...</p>
        </div>
      ) : requisitions.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">
          <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
          <h3 className="text-base font-bold text-gray-800">All Stock Levels Healthy</h3>
          <p className="text-xs text-gray-500">No pending purchase requisitions from production floor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requisitions.map((req) => (
            <div key={req._id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black font-mono bg-rose-50 text-rose-900 px-3 py-1 rounded-xl border border-rose-200">
                    ID: {req.requisitionNumber}
                  </span>
                  <span className="text-xs font-bold text-gray-600">
                    Priority: <strong className="text-rose-700 uppercase">{req.priority || 'HIGH'}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={req.status || 'PENDING_PURCHASE'}
                    onChange={(e) => handleUpdateStatus(req._id, e.target.value)}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-gray-900"
                  >
                    <option value="PENDING_PURCHASE">⏳ Pending Purchase</option>
                    <option value="ORDERED">📦 PO Issued to Vendor</option>
                    <option value="FULFILLED">✅ Fulfilled / Delivered</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Requested Purchase Items:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {req.items?.map((item, idx) => (
                    <div key={idx} className="bg-rose-50/40 p-3 rounded-2xl border border-rose-100 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-xs text-gray-900 block">{item.product?.name || 'Product'}</span>
                        <span className="text-[10px] text-gray-500 font-mono">Current Stock: {item.currentStock} {item.unitOfMeasure}</span>
                      </div>
                      <span className="font-mono text-sm font-black text-rose-900">
                        {item.requestedQuantity} {item.unitOfMeasure}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductRequisitionList;
