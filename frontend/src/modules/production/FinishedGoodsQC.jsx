import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  ShieldCheck, Package, QrCode, RefreshCw, Loader2, CheckCircle2, AlertTriangle, Printer, X
} from 'lucide-react';
import Modal from '../../components/Modal';

const FinishedGoodsQC = () => {
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal States
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [currentQrStickers, setCurrentQrStickers] = useState([]);

  // Form State
  const [damagedPieces, setDamagedPieces] = useState(0);
  const [damageReason, setDamageReason] = useState('Defective Packaging / Tear');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchQcBatches();
  }, []);

  const fetchQcBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/production');
      setProductions(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch QC production batches', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQcModal = (prod) => {
    setSelectedProduction(prod);
    setDamagedPieces(0);
    setDamageReason('Defective Packaging / Tear');
    setRemarks('');
    setIsQcModalOpen(true);
  };

  const handleApproveQc = async (e) => {
    e.preventDefault();
    if (!selectedProduction) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/production/${selectedProduction._id}/approve-qc`, {
        damagedPieces: parseInt(damagedPieces) || 0,
        damageReason,
        remarks
      });

      const updatedBatch = res.data?.data;
      alert(res.data?.message || 'QC Approved! Stock inwarded to Finished Goods Inventory.');
      
      setIsQcModalOpen(false);
      fetchQcBatches();

      if (updatedBatch?.boxQrStickers?.length > 0) {
        setCurrentQrStickers(updatedBatch.boxQrStickers);
        setIsQrModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to approve QC', err);
      alert(err.response?.data?.message || 'Error approving QC');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingQcList = productions.filter(p => 
    p.status === 'SENT_TO_QC' || p.status === 'PRODUCTION_COMPLETED'
  );

  const approvedQcList = productions.filter(p => 
    p.status === 'QC_APPROVED' || p.qcStatus === 'PASSED'
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100/70 text-emerald-700 rounded-2xl">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Finished Goods Quality Control & Box QR Generation</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Inspect produced ice cream batches, record damage count, inward approved stock, and print per-box QR stickers
            </p>
          </div>
        </div>

        <button
          onClick={fetchQcBatches}
          className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-extrabold transition-all border border-gray-200 flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh List
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">
          <Loader2 size={32} className="animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs font-extrabold">Loading QC Batches...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Pending QC Approval */}
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              Batches Awaiting QC Inspection ({pendingQcList.length})
            </h2>

            {pendingQcList.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 rounded-3xl border border-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>All production runs have completed QC Inspection! No pending batches.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingQcList.map(prod => {
                  const reqId = prod.productionNumber || `PR-${prod._id.slice(-4)}`;
                  const totalProducedPcs = prod.producedPieces || prod.totalPieces || 0;
                  const pPerBox = prod.piecesPerBox || 12;
                  const estBoxes = Number((totalProducedPcs / pPerBox).toFixed(2));

                  return (
                    <div key={prod._id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-base font-black font-mono text-emerald-950 px-3 py-1 bg-emerald-50 rounded-xl border border-emerald-200 inline-block mb-1">
                            Production ID: {reqId}
                          </span>
                          <h3 className="text-base font-extrabold text-gray-900">{prod.finishedGoodProduct?.name || 'Finished Product'}</h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-mono text-xs font-black border border-amber-200">
                          {prod.batchNumber || 'BATCH-1'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl text-xs font-semibold">
                        <div>
                          <span className="text-gray-500 text-[10px] block uppercase font-bold">Produced Pieces Output:</span>
                          <span className="text-sm font-black font-mono text-purple-900">{totalProducedPcs} Pcs</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] block uppercase font-bold">Calculated Box Count:</span>
                          <span className="text-sm font-extrabold font-mono text-gray-800">{estBoxes} Boxes ({pPerBox} Pcs/Box)</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenQcModal(prod)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck size={16} /> Perform QC Inspection & Inward Stock
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: QC Approved Batches List */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              QC Approved & Stock Inwarded Batches ({approvedQcList.length})
            </h2>

            {approvedQcList.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No approved QC batches logged yet.</p>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 uppercase font-extrabold tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3.5">Production ID</th>
                      <th className="px-6 py-3.5">QC ID</th>
                      <th className="px-6 py-3.5">Finished Product</th>
                      <th className="px-6 py-3.5">Approved Output</th>
                      <th className="px-6 py-3.5">Damaged Pcs</th>
                      <th className="px-6 py-3.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {approvedQcList.map(prod => {
                      const reqId = prod.productionNumber || `PR-${prod._id.slice(-4)}`;
                      const qcCode = prod.qcId || 'QC-PASSED';

                      return (
                        <tr key={prod._id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4 font-mono font-extrabold text-purple-900">{reqId}</td>
                          <td className="px-6 py-4 font-mono font-bold text-emerald-800">{qcCode}</td>
                          <td className="px-6 py-4 font-extrabold text-gray-900">{prod.finishedGoodProduct?.name}</td>
                          <td className="px-6 py-4 font-mono font-extrabold text-emerald-700">
                            {prod.passedPieces || prod.totalPieces} Pcs ({prod.passedBoxes || prod.quantityBoxes} Boxes)
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-rose-600">
                            {prod.damagedPieces || 0} Pcs
                          </td>
                          <td className="px-6 py-4">
                            {prod.boxQrStickers?.length > 0 && (
                              <button
                                onClick={() => {
                                  setCurrentQrStickers(prod.boxQrStickers);
                                  setIsQrModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-purple-50 text-purple-800 rounded-xl font-extrabold hover:bg-purple-100 border border-purple-200 flex items-center gap-1.5 cursor-pointer"
                              >
                                <QrCode size={14} /> Print Box QRs
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- POPUP MODAL: PERFORM QC INSPECTION --- */}
      {isQcModalOpen && selectedProduction && (
        <Modal isOpen={isQcModalOpen} onClose={() => setIsQcModalOpen(false)} title="Finished Goods Quality Control (QC Approval)" size="lg">
          <form onSubmit={handleApproveQc} className="space-y-5">
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-base font-extrabold text-emerald-950">{selectedProduction.finishedGoodProduct?.name}</span>
                <span className="font-mono text-xs font-black text-emerald-900 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300">
                  ID: {selectedProduction.productionNumber || `PR-${selectedProduction._id.slice(-4)}`}
                </span>
              </div>
              <p className="text-xs text-emerald-800 font-semibold">
                Batch Code: <strong>{selectedProduction.batchNumber || 'BATCH-1'}</strong>
              </p>
            </div>

            {/* Production Output Display */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Produced Pieces (Non-Editable)</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedProduction.producedPieces || selectedProduction.totalPieces || 0} Pcs`}
                    className="w-full bg-gray-200/80 border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-mono font-black text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">Damaged / Rejected Pieces Count *</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedProduction.producedPieces || selectedProduction.totalPieces}
                    value={damagedPieces}
                    onChange={(e) => setDamagedPieces(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full bg-white border border-rose-300 rounded-xl px-3.5 py-2 text-xs font-mono font-black text-rose-900 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              {damagedPieces > 0 && (
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">Damage Reason *</label>
                  <select
                    value={damageReason}
                    onChange={(e) => setDamageReason(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-xl px-3.5 py-2 text-xs font-bold text-rose-950 focus:outline-none"
                  >
                    <option value="Defective Packaging / Tear">Defective Packaging / Tear</option>
                    <option value="Melted / Temperature Fluctuated">Melted / Temperature Fluctuated</option>
                    <option value="Flavor / Texture Discrepancy">Flavor / Texture Discrepancy</option>
                    <option value="Weight Under-specification">Weight Under-specification</option>
                    <option value="Damaged during Handling">Damaged during Handling</option>
                  </select>
                </div>
              )}

              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">QC Inspector Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional QC inspection notes"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900"
                />
              </div>
            </div>

            {/* Calculated Final Passed Summary */}
            {(() => {
              const totalP = selectedProduction.producedPieces || selectedProduction.totalPieces || 0;
              const pPcs = Math.max(0, totalP - damagedPieces);
              const pPerBox = selectedProduction.piecesPerBox || 12;
              const pBoxes = Math.floor(pPcs / pPerBox);
              const loosePcs = pPcs % pPerBox;

              return (
                <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-2xl flex justify-between items-center text-emerald-950 text-xs font-bold">
                  <span>🟢 Final Passed Stock Inwarding:</span>
                  <span className="font-mono text-sm font-black text-emerald-900">
                    {pPcs} Pcs ({pBoxes} Boxes + {loosePcs} Loose Pcs)
                  </span>
                </div>
              );
            })()}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsQcModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {submitting ? 'Approving & Inwarding...' : 'Approve QC & Inward to Finished Goods Stock'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- POPUP MODAL: PRINT PER-BOX QR STICKERS --- */}
      {isQrModalOpen && currentQrStickers.length > 0 && (
        <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Printable Box QR Code Stickers" size="xl">
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-purple-50 p-3 rounded-2xl border border-purple-200 text-purple-950 text-xs font-bold">
              <span>Generated <strong>{currentQrStickers.length} Box QR Stickers</strong> (1 Sticker per Box)</span>
              <button
                onClick={() => window.print()}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} /> Print Sticker Sheet
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-2">
              {currentQrStickers.map((sticker, idx) => {
                const data = JSON.parse(sticker.qrCodeText || '{}');

                return (
                  <div key={idx} className="bg-white p-3 rounded-2xl border-2 border-dashed border-gray-300 space-y-2 text-center text-[10px]">
                    <div className="font-extrabold text-purple-950 border-b border-gray-200 pb-1">
                      {data.brand || 'SRI SARAVANAA ERP'}
                    </div>
                    <div className="p-2 bg-gray-50 rounded-xl font-mono text-[9px] text-gray-800 font-bold space-y-0.5">
                      <div className="text-xs font-black text-purple-900">BOX {sticker.boxIndex} / {sticker.totalBoxes}</div>
                      <div>PROD ID: {data.productionId}</div>
                      <div>QC ID: {data.qcId}</div>
                      <div>QTY: {data.piecesInBox} Pcs</div>
                    </div>
                    <div className="text-[9px] font-bold text-gray-500">{data.product}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FinishedGoodsQC;
