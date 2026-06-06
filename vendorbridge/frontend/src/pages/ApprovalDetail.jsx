import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Check, X, Clock, ShoppingCart, Receipt, Loader2, Star, Send } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';

const NewApprovalForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quotationId = searchParams.get('quotation_id');
  const rfqId = searchParams.get('rfq_id');
  const qc = useQueryClient();
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const { data: managers, isLoading: loadingManagers } = useQuery({
    queryKey: ['managers'],
    queryFn: () => api.get('/auth/managers').then(r => r.data.data),
  });

  const { data: quotation } = useQuery({
    queryKey: ['quotation-preview', quotationId],
    queryFn: () => api.get(`/quotations/${quotationId}`).then(r => r.data.data),
    enabled: !!quotationId,
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/approvals', data),
    onSuccess: (res) => {
      toast.success('Approval request submitted!');
      qc.invalidateQueries(['approvals']);
      navigate(`/approvals/${res.data.data.id}`);
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedManagerId) return toast.error('Please select a manager to send to');
    mutation.mutate({ rfq_id: rfqId, quotation_id: quotationId, approver_id: selectedManagerId });
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-700 font-inter mb-4 flex items-center gap-1">
          <ChevronLeft size={14} /> Back
        </button>
        <div className="card space-y-6">
          <div>
            <h1 className="page-title">Submit for Approval</h1>
            <p className="text-sm text-gray-500 font-inter mt-1">Send this quotation to a manager for review and decision</p>
          </div>

          {quotation && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-1">
              <p className="text-xs font-schibsted font-bold text-blue-400 uppercase tracking-wider">Quotation Summary</p>
              <p className="font-schibsted font-semibold text-blue-800">{quotation.vendors?.company_name}</p>
              <div className="flex gap-4 text-sm text-blue-700">
                <span>Total: <strong className="font-noto">{formatCurrency(quotation.total_amount)}</strong></span>
                <span>Delivery: <strong>{quotation.delivery_days} days</strong></span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label font-semibold text-sm text-gray-700 mb-1.5 block">Send to Manager *</label>
              {loadingManagers ? (
                <div className="skeleton h-10 rounded-xl" />
              ) : (
                <select
                  value={selectedManagerId}
                  onChange={e => setSelectedManagerId(e.target.value)}
                  className="input py-2.5 w-full font-medium text-gray-700"
                  required
                >
                  <option value="">-- Select a Manager or Admin --</option>
                  {(managers || []).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} · {m.role}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1">Cancel</button>
              <button type="submit" disabled={mutation.isPending || !selectedManagerId} className="btn-primary flex-1 justify-center">
                {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Submit for Approval
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default function ApprovalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [remarks, setRemarks] = useState('');

  // Handle new approval form
  if (id === 'new') return <NewApprovalForm />;

  const { data: approval, isLoading } = useQuery({
    queryKey: ['approval', id],
    queryFn: () => api.get(`/approvals/${id}`).then(r => r.data.data),
  });

  const approveMut = useMutation({
    mutationFn: () => api.post(`/approvals/${id}/approve`, { remarks }),
    onSuccess: (res) => {
      toast.success('Approved! Purchase Order generated.');
      qc.invalidateQueries(['approval', id]);
      const poId = res.data.data?.po?.id;
      if (poId) setTimeout(() => navigate(`/purchase-orders/${poId}`), 800);
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMut = useMutation({
    mutationFn: () => {
      if (!remarks.trim()) throw new Error('Remarks required for rejection');
      return api.post(`/approvals/${id}/reject`, { remarks });
    },
    onSuccess: () => {
      toast.success('Approval rejected');
      qc.invalidateQueries(['approval', id]);
      navigate('/approvals');
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return (
    <AppLayout>
      <div className="animate-pulse space-y-4">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 skeleton h-96 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    </AppLayout>
  );

  if (!approval) return <AppLayout><div className="empty-state">Approval not found</div></AppLayout>;

  const rfq = approval.rfqs;
  const quot = approval.quotations;

  const timeline = [
    { label: 'RFQ Created', sub: rfq?.title, done: true },
    { label: 'Quotations Received', sub: 'Vendors responded', done: !!quot },
    { label: 'Vendor Selected', sub: quot?.vendors?.company_name, done: !!quot },
    { label: 'Awaiting Approval', sub: approval.status === 'pending' ? 'PENDING' : approval.status.toUpperCase(), active: approval.status === 'pending', done: approval.status === 'approved' },
    { label: 'Purchase Order', sub: approval.status === 'approved' ? 'Generated' : 'Pending approval', done: approval.status === 'approved', locked: approval.status !== 'approved' },
    { label: 'Invoice', sub: 'After PO', done: false, locked: true },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <button onClick={() => navigate('/approvals')} className="text-sm text-gray-400 hover:text-gray-700 font-inter mb-2 flex items-center gap-1">
            <ChevronLeft size={14} /> Back to Approvals
          </button>
          <div className="flex items-center gap-3">
            <h1 className="page-title">Approval Review</h1>
            <span className={`badge ${getStatusBadgeClass(approval.status)}`}>{getStatusLabel(approval.status)}</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-5">
          {/* Left: 60% */}
          <div className="col-span-5 lg:col-span-3 space-y-5">
            {/* RFQ Summary */}
            <div className="card">
              <h2 className="section-label mb-4">RFQ Summary</h2>
              {rfq ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-schibsted font-semibold text-gray-700">{rfq.rfq_number}</p>
                      <p className="font-inter text-gray-800 mt-0.5">{rfq.title}</p>
                      {rfq.description && <p className="text-sm text-gray-500 mt-1">{rfq.description}</p>}
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(rfq.deadline)}</span>
                  </div>
                  {rfq.rfq_items?.length > 0 && (
                    <div className="table-container mt-3">
                      <table className="data-table text-xs">
                        <thead><tr><th>Product</th><th>Qty</th><th>Unit</th></tr></thead>
                        <tbody>
                          {rfq.rfq_items.map(item => (
                            <tr key={item.id}>
                              <td>{item.product_name}</td>
                              <td className="font-noto">{item.quantity}</td>
                              <td>{item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : <p className="text-gray-400">—</p>}
            </div>

            {/* Selected Quotation */}
            {quot && (
              <div className="card">
                <h2 className="section-label mb-4">Selected Quotation</h2>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Grand Total</p>
                    <p className="text-lg font-fustat font-bold">{formatCurrency(quot.total_amount)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Delivery</p>
                    <p className="text-lg font-fustat font-bold">{quot.delivery_days}d</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Payment</p>
                    <p className="text-sm font-semibold">{quot.payment_terms}</p>
                  </div>
                </div>
                {quot.quotation_items?.length > 0 && (
                  <div className="table-container">
                    <table className="data-table text-xs">
                      <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                      <tbody>
                        {quot.quotation_items.map(item => (
                          <tr key={item.id}>
                            <td>{item.product_name}</td>
                            <td className="font-noto">{item.quantity}</td>
                            <td className="font-noto">{formatCurrency(item.unit_price)}</td>
                            <td className="font-noto font-semibold">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Checklist */}
            <div className="card">
              <h2 className="section-label mb-4">Approval Checklist</h2>
              <div className="space-y-3">
                {[
                  { text: 'Review vendor quote', done: true },
                  { text: 'Validate items match RFQ', done: !!quot },
                  { text: 'Confirm delivery timeline acceptable', done: false },
                  { text: 'Verify budget approval', done: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 ${item.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {item.done && <Check size={12} className="text-white" />}
                    </div>
                    <span className={`text-sm font-inter ${item.done ? 'text-gray-700' : 'text-gray-500'}`}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: 40% */}
          <div className="col-span-5 lg:col-span-2 space-y-5">
            {/* Timeline */}
            <div className="card">
              <h2 className="section-label mb-5">Approval Timeline</h2>
              <div className="space-y-4">
                {timeline.map((step, i) => (
                  <div key={i} className="timeline-item">
                    <div className={`timeline-dot ${step.done ? 'done' : step.active ? 'active' : ''}`}>
                      {step.done ? <Check size={10} /> : step.locked ? <X size={10} className="text-gray-300" /> : null}
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm font-schibsted font-semibold ${step.done ? 'text-gray-800' : step.active ? 'text-green-700' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {step.sub && <p className="text-xs text-gray-400 mt-0.5">{step.sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vendor Summary */}
            {quot?.vendors && (
              <div className="card">
                <h2 className="section-label mb-3">Selected Vendor</h2>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold bg-green-50 text-green-600">
                    {quot.vendors.company_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-schibsted font-semibold">{quot.vendors.company_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={10} className={i <= Math.round(quot.vendors.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Total</span><span className="font-noto font-bold">{formatCurrency(quot.total_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Delivery</span><span>{quot.delivery_days} days</span></div>
                </div>
              </div>
            )}

            {/* Action */}
            {approval.status === 'pending' && (
              <div className="card">
                <h2 className="section-label mb-4">Approval Decision</h2>
                <div>
                  <label className="label">Remarks {rejectMut.isPending ? '(Required for rejection)' : '(Optional)'}</label>
                  <textarea
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="input resize-none"
                    rows={3}
                    placeholder="Add your remarks..."
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => rejectMut.mutate()}
                    disabled={rejectMut.isPending || approveMut.isPending}
                    className="btn-danger flex-1 justify-center"
                  >
                    {rejectMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    Reject
                  </button>
                  <button
                    onClick={() => approveMut.mutate()}
                    disabled={approveMut.isPending || rejectMut.isPending}
                    className="btn-primary flex-1 justify-center"
                  >
                    {approveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Approve
                  </button>
                </div>
              </div>
            )}

            {approval.status !== 'pending' && approval.remarks && (
              <div className="card">
                <h2 className="section-label mb-2">Decision Remarks</h2>
                <p className="text-sm text-gray-600 font-inter">{approval.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
