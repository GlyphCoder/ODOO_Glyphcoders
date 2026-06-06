import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, MessageSquare, Loader2, XCircle } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';

// Statuses from which a vendor can withdraw (cancel) their quotation
const WITHDRAWABLE_STATUSES = ['submitted', 'under_review'];

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => api.get(`/quotations/${id}`).then(r => r.data.data),
    enabled: Boolean(id),
  });

  const withdrawMut = useMutation({
    mutationFn: () => api.post(`/quotations/${id}/withdraw`),
    onSuccess: () => {
      toast.success('Quotation withdrawn successfully');
      qc.invalidateQueries({ queryKey: ['quotation', id] });
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleWithdraw = () => {
    if (!window.confirm('Are you sure you want to withdraw this quotation? This action cannot be undone.')) return;
    withdrawMut.mutate();
  };

  const items = quotation?.quotation_items || [];
  const globalTaxPct = Number(quotation?.tax_percentage ?? 0);
  const getItemSubtotal = (item) => Number(item.unit_price || 0) * Number(item.quantity || 0);
  // Always compute from global rate — never use stored item.tax_amount which may be a stale 0
  const getItemTaxAmount = (item) => (getItemSubtotal(item) * globalTaxPct) / 100;
  const getItemTotal = (item) => getItemSubtotal(item) + getItemTaxAmount(item);

  // A vendor can withdraw if status is submitted or under_review
  const canWithdraw = user?.role === 'vendor'
    && quotation
    && ['submitted', 'under_review'].includes(quotation.status);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/quotations')}
              className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
              aria-label="Back to quotations"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <h1 className="page-title">Quotation</h1>
              <p className="text-sm text-gray-500 font-inter">{quotation?.rfqs?.title || 'Vendor quotation details'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {quotation?.status && (
              <span className={`badge ${getStatusBadgeClass(quotation.status)}`}>{getStatusLabel(quotation.status)}</span>
            )}
            {canWithdraw && (
              <button
                onClick={handleWithdraw}
                disabled={withdrawMut.isPending}
                className="btn-outline text-sm text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-2"
              >
                {withdrawMut.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <XCircle size={14} />
                }
                Withdraw Quotation
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="card p-8 space-y-3">
            {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : !quotation ? (
          <div className="card empty-state">
            <MessageSquare size={40} className="text-gray-200" />
            <p className="text-gray-400 font-inter">Quotation not found</p>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="section-label">RFQ</p>
                  <p className="font-schibsted font-semibold">{quotation.rfqs?.rfq_number || '—'}</p>
                </div>
                <div>
                  <p className="section-label">Vendor</p>
                  <p className="font-medium">{quotation.vendors?.company_name || '—'}</p>
                </div>
                <div>
                  <p className="section-label">Submitted</p>
                  <p className="text-sm text-gray-600">{formatDate(quotation.submitted_at)}</p>
                </div>
                <div>
                  <p className="section-label">Total Amount</p>
                  <p className="font-noto font-bold text-lg">{formatCurrency(quotation.total_amount)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
                <div>
                  <p className="section-label">Delivery</p>
                  <p className="font-noto">{quotation.delivery_days || 0} days</p>
                </div>
                <div>
                  <p className="section-label">Validity</p>
                  <p className="font-noto">{quotation.validity_days || 0} days</p>
                </div>
                <div>
                  <p className="section-label">Payment Terms</p>
                  <p className="text-sm text-gray-700">{quotation.payment_terms || '—'}</p>
                </div>
                <div>
                  <p className="section-label">Tax</p>
                  <p className="font-noto">{formatCurrency(quotation.tax_amount)}</p>
                </div>
              </div>
              {quotation.notes && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="section-label">Notes</p>
                  <p className="text-sm text-gray-600 font-inter">{quotation.notes}</p>
                </div>
              )}
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <FileText size={18} className="text-gray-500" />
                <h2 className="font-schibsted font-semibold">Quotation Items</h2>
              </div>
              {items.length === 0 ? (
                <div className="empty-state">
                  <p className="text-gray-400 font-inter">No quotation items found</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item</th><th>Quantity</th><th>Unit Price</th><th>Tax ({globalTaxPct}%)</th><th>Total (incl. Tax)</th><th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td className="font-medium">{item.product_name}</td>
                          <td className="font-noto">{item.quantity} {item.unit}</td>
                          <td className="font-noto">{formatCurrency(item.unit_price)}</td>
                          <td className="font-noto">
                            {formatCurrency(getItemTaxAmount(item))}
                          </td>
                          <td className="font-noto font-semibold">{formatCurrency(getItemTotal(item))}</td>
                          <td className="text-sm text-gray-500">{item.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-sm font-inter">
                    <span className="text-gray-500">Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(quotation.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-inter">
                    <span className="text-gray-500">Tax ({quotation.tax_percentage || 0}%):</span>
                    <span className="font-semibold">{formatCurrency(quotation.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-inter pt-2 border-t border-gray-900">
                    <span className="font-bold">Total:</span>
                    <span className="font-fustat font-bold text-xl">{formatCurrency(quotation.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Withdrawn notice */}
            {quotation.status === 'withdrawn' && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex gap-3 items-center">
                <XCircle size={18} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-700 font-inter">
                  This quotation has been <strong>withdrawn</strong> and is no longer active.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
