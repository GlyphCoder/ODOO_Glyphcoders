import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, BarChart2, Loader2, X, CheckCircle2, ShoppingCart, Receipt } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useRBAC } from '../hooks/useRBAC';
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';

const statusTabs = ['All', 'submitted', 'under_review', 'accepted', 'rejected'];

export default function Quotations() {
  const { can, role } = useRBAC();
  const navigate = useNavigate();
  const [tab, setTab] = useState('All');
  const [modalQuot, setModalQuot] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['quotations', tab],
    queryFn: () => {
      const p = new URLSearchParams();
      if (tab !== 'All') p.set('status', tab);
      return api.get(`/quotations?${p}`).then(r => r.data.data);
    },
  });

  const { data: managers } = useQuery({
    queryKey: ['managers'],
    queryFn: () => api.get('/auth/managers').then(r => r.data.data),
    enabled: can('compareQuotations'),
  });

  const approvalMut = useMutation({
    mutationFn: ({ quotation_id, rfq_id, approver_id }) =>
      api.post('/approvals', { rfq_id, quotation_id, approver_id }),
    onSuccess: (res) => {
      toast.success('Sent for manager approval!');
      setModalQuot(null);
      setSelectedManagerId('');
      refetch();
      navigate(`/approvals/${res.data.data.id}`);
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message),
  });

  const handleSendForApproval = (quot) => {
    setModalQuot(quot);
    setSelectedManagerId('');
  };

  const handleConfirmSend = () => {
    if (!selectedManagerId) return toast.error('Please select a manager');
    approvalMut.mutate({
      quotation_id: modalQuot.id,
      rfq_id: modalQuot.rfqs?.id || modalQuot.rfq_id,
      approver_id: selectedManagerId,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="page-title">Quotations</h1>
          <div className="flex gap-2">
            {can('submitQuotation') && (
              <button
                onClick={() => { toast.info('Select an open RFQ to submit a quotation.'); navigate('/rfqs'); }}
                className="btn-outline text-sm"
              >
                + Submit Quotation
              </button>
            )}
          </div>
        </div>

        {/* Status tabs */}
        <div className="card py-4">
          <div className="flex gap-1 flex-wrap">
            {statusTabs.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-schibsted font-semibold transition-all ${
                  tab === t ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'All' ? 'All' : getStatusLabel(t)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
          ) : !data || data.length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={40} className="text-gray-200" />
              <p className="text-gray-400 font-inter">No quotations found</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>RFQ</th>
                    <th>Title</th>
                    <th>Vendor</th>
                    <th>Submitted</th>
                    <th>Total Amount</th>
                    <th>Delivery</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(q => (
                    <tr key={q.id}>
                      <td className="font-schibsted font-semibold">{q.rfqs?.rfq_number || '—'}</td>
                      <td className="font-medium">{q.rfqs?.title || '—'}</td>
                      <td>{q.vendors?.company_name || '—'}</td>
                      <td className="text-gray-500 text-xs">{formatDate(q.submitted_at)}</td>
                      <td className="font-noto font-semibold">{formatCurrency(q.total_amount)}</td>
                      <td className="font-noto">{q.delivery_days}d</td>
                      <td><span className={`badge ${getStatusBadgeClass(q.status)}`}>{getStatusLabel(q.status)}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          {/* View RFQ */}
                          {q.rfqs?.id && (
                            <button
                              onClick={() => navigate(`/rfqs/${q.rfqs.id}`)}
                              className="text-xs btn-outline py-1.5 px-3"
                            >
                              View RFQ
                            </button>
                          )}

                          {/* Officer: Compare button if RFQ has quotations */}
                          {can('compareQuotations') && q.rfqs?.id && (
                            <button
                              onClick={() => navigate(`/rfqs/${q.rfqs.id}/compare`)}
                              className="text-xs btn-outline py-1.5 px-3"
                              title="Compare all quotations for this RFQ"
                            >
                              <BarChart2 size={12} />
                            </button>
                          )}

                          {/* Officer: Send for Approval if submitted */}
                          {can('compareQuotations') && q.status === 'submitted' && (
                            <button
                              onClick={() => handleSendForApproval(q)}
                              className="text-xs btn-primary py-1.5 px-3"
                              title="Send this quotation for manager approval"
                            >
                              <Send size={12} />
                              Send
                            </button>
                          )}

                          {/* Accepted: Show PO link */}
                          {q.status === 'accepted' && (
                            <button
                              onClick={() => navigate('/purchase-orders')}
                              className="text-xs py-1.5 px-3 rounded-lg bg-green-50 text-green-700 font-schibsted font-semibold hover:bg-green-100 transition-colors flex items-center gap-1"
                            >
                              <ShoppingCart size={12} />
                              View PO
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Accepted Vendors Panel (officer view) */}
        {can('compareQuotations') && data?.some(q => q.status === 'accepted') && (
          <div className="card border-l-4 border-l-green-500">
            <h2 className="section-label mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              Selected / Approved Vendors
            </h2>
            <div className="space-y-3">
              {data.filter(q => q.status === 'accepted').map(q => (
                <div key={q.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center font-bold text-green-700 font-schibsted">
                      {q.vendors?.company_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-schibsted font-semibold text-gray-800">{q.vendors?.company_name}</p>
                      <p className="text-xs text-gray-500 font-inter">{q.rfqs?.rfq_number} · {q.rfqs?.title}</p>
                    </div>
                    <div className="hidden sm:flex gap-4 text-sm text-gray-600 ml-4">
                      <span>Total: <strong className="font-noto">{formatCurrency(q.total_amount)}</strong></span>
                      <span>Delivery: <strong>{q.delivery_days} days</strong></span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate('/purchase-orders')}
                      className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <ShoppingCart size={12} /> PO
                    </button>
                    <button
                      onClick={() => navigate('/invoices')}
                      className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <Receipt size={12} /> Invoice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Send for Approval Modal */}
      {modalQuot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5 animate-fade-up">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-fustat font-bold text-xl text-gray-900">Send for Approval</h2>
                <p className="text-sm text-gray-500 font-inter mt-1">Forward this quotation to a manager</p>
              </div>
              <button onClick={() => setModalQuot(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Quotation summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-schibsted font-bold text-gray-400 uppercase tracking-wider">Quotation</p>
              <p className="font-schibsted font-semibold text-gray-800">{modalQuot.vendors?.company_name}</p>
              <p className="text-xs text-gray-500">{modalQuot.rfqs?.rfq_number} · {modalQuot.rfqs?.title}</p>
              <div className="flex gap-4 text-sm mt-2">
                <span>Total: <strong className="font-noto text-gray-900">{formatCurrency(modalQuot.total_amount)}</strong></span>
                <span>Delivery: <strong>{modalQuot.delivery_days}d</strong></span>
              </div>
            </div>

            {/* Manager selector */}
            <div>
              <label className="label font-semibold text-sm text-gray-700 mb-1.5 block">Send to Manager *</label>
              <select
                value={selectedManagerId}
                onChange={e => setSelectedManagerId(e.target.value)}
                className="input py-2.5 w-full font-medium text-gray-700"
              >
                <option value="">-- Select a Manager --</option>
                {(managers || []).map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} · {m.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalQuot(null)} className="btn-outline flex-1">Cancel</button>
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
