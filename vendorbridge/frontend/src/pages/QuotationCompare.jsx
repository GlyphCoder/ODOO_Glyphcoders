import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Star, Send, CheckCircle2, Loader2, X } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { formatCurrency, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';

export default function QuotationCompare() {
  const { rfq_id } = useParams();
  const navigate = useNavigate();
  const [selectedQuotId, setSelectedQuotId] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data: rfq } = useQuery({
    queryKey: ['rfq', rfq_id],
    queryFn: () => api.get(`/rfqs/${rfq_id}`).then(r => r.data.data),
  });

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['compare', rfq_id],
    queryFn: () => api.post('/quotations/compare', { rfq_id }).then(r => r.data.data),
  });

  const { data: managers } = useQuery({
    queryKey: ['managers'],
    queryFn: () => api.get('/auth/managers').then(r => r.data.data),
  });

  const approvalMut = useMutation({
    mutationFn: ({ quotation_id, approver_id }) =>
      api.post('/approvals', { rfq_id, quotation_id, approver_id }),
    onSuccess: (res) => {
      toast.success('Sent for manager approval!');
      setShowModal(false);
      navigate(`/approvals/${res.data.data.id}`);
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message),
  });

  const handleSelectAndSend = (quot) => {
    setSelectedQuotId(quot.id);
    setShowModal(true);
  };

  const handleConfirmSend = () => {
    if (!selectedManagerId) return toast.error('Please select a manager to send to');
    approvalMut.mutate({ quotation_id: selectedQuotId, approver_id: selectedManagerId });
  };

  if (isLoading) return (
    <AppLayout>
      <div className="animate-pulse space-y-4">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    </AppLayout>
  );

  const vendors = quotations || [];
  const allItems = rfq?.rfq_items || [];
  const selectedQuot = vendors.find(q => q.id === selectedQuotId);

  const lowestTotal = vendors.length > 0 ? Math.min(...vendors.map(q => q.total_amount || Infinity)) : Infinity;
  const lowestDelivery = vendors.length > 0 ? Math.min(...vendors.map(q => q.delivery_days || Infinity)) : Infinity;

  const getItemLowest = (itemName) => {
    const prices = vendors.map(q => {
      const item = q.quotation_items?.find(i => i.product_name === itemName);
      return item ? Number(item.unit_price) : Infinity;
    });
    return Math.min(...prices);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <button onClick={() => navigate(`/rfqs/${rfq_id}`)} className="text-sm text-gray-400 hover:text-gray-700 font-inter mb-2 flex items-center gap-1">
            <ChevronLeft size={14} /> Back to RFQ
          </button>
          <h1 className="page-title">Quotation Comparison</h1>
          <p className="text-gray-500 font-inter text-sm mt-1">
            {rfq?.title} · {vendors.length} quotation{vendors.length !== 1 ? 's' : ''} received
          </p>
        </div>

        {/* Instruction banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-blue-500 shrink-0" />
          <p className="text-sm text-blue-700 font-inter">
            Compare quotations below. Click <strong>Select & Send for Approval</strong> to forward a quotation to a manager.
          </p>
        </div>

        {vendors.length < 1 ? (
          <div className="card empty-state">
            <p className="text-gray-400">No quotations have been received yet for this RFQ.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="data-table w-full" style={{ minWidth: `${300 + vendors.length * 240}px` }}>
              <thead>
                <tr>
                  <th className="w-52 sticky left-0 bg-gray-50 z-10">Criteria</th>
                  {vendors.map(q => (
                    <th key={q.id} className="text-center min-w-[220px]">
                      <div className="space-y-1">
                        <p className="font-schibsted font-semibold">{q.vendors?.company_name}</p>
                        <div className="flex justify-center gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} size={11} className={i <= Math.round(q.vendors?.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                          ))}
                        </div>
                        <span className={`badge text-xs ${getStatusBadgeClass(q.status)}`}>{getStatusLabel(q.status)}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Item unit prices */}
                {allItems.map(rfqItem => {
                  const lowest = getItemLowest(rfqItem.product_name);
                  return (
                    <tr key={rfqItem.id}>
                      <td className="sticky left-0 bg-white z-10 font-medium text-xs text-gray-700">
                        {rfqItem.product_name}<br />
                        <span className="text-gray-400">Qty: {rfqItem.quantity} {rfqItem.unit}</span>
                      </td>
                      {vendors.map(q => {
                        const item = q.quotation_items?.find(i => i.product_name === rfqItem.product_name);
                        const price = item?.unit_price;
                        const isLowest = price && Number(price) === lowest;
                        return (
                          <td key={q.id} className={`text-center font-noto text-sm ${isLowest ? 'bg-green-50 text-green-700 font-bold' : ''}`}>
                            {price ? (
                              <span className="flex items-center justify-center gap-1">
                                {formatCurrency(price)}/unit
                                {isLowest && <Star size={11} className="text-green-500 fill-green-500" />}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                <tr><td colSpan={vendors.length + 1} className="py-1 bg-gray-50" /></tr>

                {/* Subtotal */}
                <tr>
                  <td className="sticky left-0 bg-white z-10 font-semibold text-sm">Subtotal</td>
                  {vendors.map(q => <td key={q.id} className="text-center font-noto text-sm">{formatCurrency(q.subtotal)}</td>)}
                </tr>
                <tr>
                  <td className="sticky left-0 bg-white z-10 text-sm text-gray-500">Tax</td>
                  {vendors.map(q => <td key={q.id} className="text-center font-noto text-sm text-gray-500">{formatCurrency(q.tax_amount)} ({q.tax_percentage}%)</td>)}
                </tr>
                <tr>
                  <td className="sticky left-0 bg-white z-10 font-bold text-base">Grand Total</td>
                  {vendors.map(q => {
                    const isLowest = q.total_amount === lowestTotal;
                    return (
                      <td key={q.id} className={`text-center font-fustat text-lg ${isLowest ? 'bg-green-50 text-green-700' : 'text-gray-900'}`}>
                        <span className="flex items-center justify-center gap-1">
                          {formatCurrency(q.total_amount)}
                          {isLowest && <Star size={14} className="text-green-500 fill-green-500" />}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                <tr><td colSpan={vendors.length + 1} className="py-1 bg-gray-50" /></tr>

                {/* Delivery */}
                <tr>
                  <td className="sticky left-0 bg-white z-10 font-medium text-sm">Delivery Days</td>
                  {vendors.map(q => {
                    const isLowest = q.delivery_days === lowestDelivery;
                    return (
                      <td key={q.id} className={`text-center font-noto text-sm ${isLowest ? 'bg-green-50 text-green-700 font-bold' : ''}`}>
                        <span className="flex items-center justify-center gap-1">
                          {q.delivery_days} days
                          {isLowest && <Star size={11} className="text-green-500 fill-green-500" />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="sticky left-0 bg-white z-10 text-sm">Payment Terms</td>
                  {vendors.map(q => <td key={q.id} className="text-center text-sm">{q.payment_terms}</td>)}
                </tr>
                <tr>
                  <td className="sticky left-0 bg-white z-10 text-sm">Validity</td>
                  {vendors.map(q => <td key={q.id} className="text-center text-sm">{q.validity_days} days</td>)}
                </tr>

                <tr><td colSpan={vendors.length + 1} className="py-1 bg-gray-50" /></tr>

                {/* Action row */}
                <tr>
                  <td className="sticky left-0 bg-white z-10 font-semibold text-sm">Action</td>
                  {vendors.map(q => (
                    <td key={q.id} className="text-center py-4">
                      {q.status === 'under_review' || q.status === 'accepted' ? (
                        <span className={`badge ${getStatusBadgeClass(q.status)}`}>{getStatusLabel(q.status)}</span>
                      ) : (
                        <button
                          onClick={() => handleSelectAndSend(q)}
                          className="btn-primary text-sm px-4"
                        >
                          <Send size={13} />
                          Select & Send
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send for Approval Modal */}
      {showModal && selectedQuot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5 animate-fade-up">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-fustat font-bold text-xl text-gray-900">Send for Approval</h2>
                <p className="text-sm text-gray-500 font-inter mt-1">Forward this quotation to a manager for review</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Selected vendor summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-schibsted font-bold text-gray-400 uppercase tracking-wider">Selected Quotation</p>
              <p className="font-schibsted font-semibold text-gray-800">{selectedQuot.vendors?.company_name}</p>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>Total: <strong className="text-gray-900 font-noto">{formatCurrency(selectedQuot.total_amount)}</strong></span>
                <span>Delivery: <strong>{selectedQuot.delivery_days} days</strong></span>
              </div>
            </div>

            {/* Manager selector */}
            <div>
              <label className="label font-semibold text-sm text-gray-700 mb-1.5 block">Send to Manager *</label>
              <select
                value={selectedManagerId}
                onChange={e => setSelectedManagerId(e.target.value)}
                className="input py-2 w-full font-medium text-gray-700"
              >
                <option value="">-- Select a Manager --</option>
                {(managers || []).map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={approvalMut.isPending || !selectedManagerId}
                className="btn-primary flex-1 justify-center"
              >
                {approvalMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send for Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
