import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Send, X, BarChart2, FileText, CheckCircle, Activity, Loader2, Download } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useRBAC } from '../hooks/useRBAC';
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';

const tabs = ['Details', 'Quotations', 'Approvals', 'Activity'];

export default function RFQDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useRBAC();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('Details');

  const { data: rfq, isLoading } = useQuery({
    queryKey: ['rfq', id],
    queryFn: () => api.get(`/rfqs/${id}`).then(r => r.data.data),
  });

  const { data: quotations } = useQuery({
    queryKey: ['rfq-quotations', id],
    queryFn: () => api.get(`/rfqs/${id}/quotations`).then(r => r.data.data),
    enabled: activeTab === 'Quotations',
  });

  const closeMut = useMutation({
    mutationFn: () => api.post(`/rfqs/${id}/close`),
    onSuccess: () => { qc.invalidateQueries(['rfq', id]); toast.success('RFQ closed'); },
  });

  const publishMut = useMutation({
    mutationFn: () => api.post(`/rfqs/${id}/publish`),
    onSuccess: () => { qc.invalidateQueries(['rfq', id]); toast.success('RFQ published!'); },
  });

  if (isLoading) return (
    <AppLayout>
      <div className="animate-pulse space-y-4">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    </AppLayout>
  );

  if (!rfq) return <AppLayout><div className="empty-state">RFQ not found</div></AppLayout>;

  const priorityColor = { high: 'badge-red', medium: 'badge-amber', low: 'badge-green' }[rfq.priority] || 'badge-gray';

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <button onClick={() => navigate('/rfqs')} className="text-sm text-gray-400 hover:text-gray-700 font-inter mb-2 flex items-center gap-1">
            <ChevronLeft size={14} /> Back to RFQs
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="page-title">{rfq.rfq_number}</h1>
                <span className={`badge ${getStatusBadgeClass(rfq.status)}`}>{getStatusLabel(rfq.status)}</span>
                <span className={`badge ${priorityColor}`}>{rfq.priority}</span>
              </div>
              <p className="text-gray-600 font-inter mt-1">{rfq.title}</p>
            </div>
            <div className="flex gap-2">
              {rfq.status === 'draft' && can('createRFQ') && (
                <button onClick={() => publishMut.mutate()} disabled={publishMut.isPending} className="btn-primary">
                  {publishMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Publish RFQ
                </button>
              )}
              {rfq.status === 'open' && can('createRFQ') && (
                <button onClick={() => closeMut.mutate()} className="btn-outline text-sm">Close RFQ</button>
              )}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="card py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Deadline', formatDate(rfq.deadline)],
              ['Category', rfq.category || '—'],
              ['Created By', rfq.profiles?.full_name || '—'],
              ['Vendors Invited', rfq.rfq_vendors?.length || 0],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-schibsted font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-inter font-medium text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="card p-0">
          <div className="flex border-b border-gray-100 px-6">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-1 py-4 mr-5 text-sm font-schibsted font-semibold border-b-2 transition-colors ${
                  activeTab === t ? 'border-black text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'Details' && (
              <div className="space-y-6">
                {rfq.description && (
                  <div>
                    <h3 className="text-sm font-schibsted font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                    <p className="text-sm text-gray-600 font-inter">{rfq.description}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-schibsted font-semibold text-gray-400 uppercase tracking-wider mb-3">Line Items</h3>
                  <div className="table-container">
                    <table className="data-table">
                      <thead><tr><th>#</th><th>Product</th><th>Description</th><th>Qty</th><th>Unit</th><th>Specs</th></tr></thead>
                      <tbody>
                        {(rfq.rfq_items || []).map((item, i) => (
                          <tr key={item.id}>
                            <td className="text-gray-400">{i + 1}</td>
                            <td className="font-medium">{item.product_name}</td>
                            <td className="text-gray-500">{item.description || '—'}</td>
                            <td className="font-noto">{item.quantity}</td>
                            <td>{item.unit}</td>
                            <td className="text-gray-500">{item.specifications || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {rfq.rfq_vendors?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-schibsted font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Invited Vendors ({rfq.rfq_vendors.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {rfq.rfq_vendors.map(rv => (
                        <span key={rv.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-schibsted">
                          <span className={`w-2 h-2 rounded-full ${rv.responded ? 'bg-green-500' : 'bg-gray-300'}`} />
                          {rv.vendors?.company_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quotations Tab */}
            {activeTab === 'Quotations' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-label">Quotations Received ({quotations?.length || 0})</h3>
                  {quotations && quotations.length >= 2 && can('compareQuotations') && (
                    <button
                      onClick={() => navigate(`/rfqs/${id}/compare`)}
                      className="btn-primary text-sm"
                    >
                      <BarChart2 size={14} /> Compare Quotations
                    </button>
                  )}
                </div>
                {!quotations || quotations.length === 0 ? (
                  <div className="empty-state">
                    <p className="text-gray-400 font-inter">No quotations received yet</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead><tr><th>Vendor</th><th>Delivery Days</th><th>Payment Terms</th><th>Total Amount</th><th>Status</th></tr></thead>
                      <tbody>
                        {quotations.map(q => (
                          <tr key={q.id}>
                            <td className="font-medium">{q.vendors?.company_name}</td>
                            <td className="font-noto">{q.delivery_days} days</td>
                            <td>{q.payment_terms}</td>
                            <td className="font-noto font-semibold">{formatCurrency(q.total_amount)}</td>
                            <td><span className={`badge ${getStatusBadgeClass(q.status)}`}>{getStatusLabel(q.status)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Approvals & Activity are handled separately */}
            {activeTab === 'Approvals' && (
              <div className="empty-state">
                <CheckCircle size={40} className="text-gray-200" />
                <p className="text-gray-400">View full approval history in the <button onClick={() => navigate('/approvals')} className="text-blue-500 hover:underline">Approvals</button> section</p>
              </div>
            )}
            {activeTab === 'Activity' && (
              <div className="empty-state">
                <Activity size={40} className="text-gray-200" />
                <p className="text-gray-400">View full activity in the <button onClick={() => navigate('/activity-logs')} className="text-blue-500 hover:underline">Activity Logs</button> section</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
