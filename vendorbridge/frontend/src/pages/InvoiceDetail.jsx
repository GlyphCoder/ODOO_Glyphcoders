import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Download, Send, Loader2 } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useRBAC } from '../hooks/useRBAC';
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

function SendModal({ invoice, onClose }) {
  const queryClient = useQueryClient();
  const [to, setTo] = useState(invoice.vendors?.email || '');
  const [subject, setSubject] = useState(`Invoice ${invoice.invoice_number}`);
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/invoices/${invoice.id}/send`, { to, subject, message }),
    onSuccess: () => {
      toast.success('Invoice sent to vendor');
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="modal-overlay">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-fade-up">
        <h2 className="font-schibsted font-semibold text-xl mb-5">Send Invoice</h2>
        <div className="space-y-4">
          <div>
            <label className="label">To *</label>
            <input value={to} onChange={e => setTo(e.target.value)} className="input" type="email" />
          </div>
          <div>
            <label className="label">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Message (optional)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} className="input resize-none" rows={3} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !to.trim()} className="btn-primary flex-1 justify-center">
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useRBAC();
  const [showSendModal, setShowSendModal] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/invoices/${id}`).then(r => r.data.data),
  });

  const downloadPDF = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/invoices/${id}/pdf`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${invoice?.invoice_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('PDF download failed'); }
  };

  if (isLoading) return <AppLayout><div className="animate-pulse space-y-4"><div className="skeleton h-8 w-64 rounded" /><div className="skeleton h-96 rounded-2xl" /></div></AppLayout>;
  if (!invoice) return <AppLayout><div className="empty-state">Invoice not found</div></AppLayout>;

  const items = invoice.purchase_orders?.quotations?.quotation_items || [];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <button onClick={() => navigate('/invoices')} className="text-sm text-gray-400 hover:text-gray-700 font-inter mb-2 flex items-center gap-1">
            <ChevronLeft size={14} /> Back to Invoices
          </button>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <h1 className="page-title">{invoice.invoice_number}</h1>
              <span className={`badge ${getStatusBadgeClass(invoice.status)}`}>{getStatusLabel(invoice.status)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadPDF} className="btn-outline text-sm">
                <Download size={14} /> Download PDF
              </button>
              {can('sendInvoice') && (
                <button onClick={() => setShowSendModal(true)} className="btn-primary text-sm">
                  <Send size={14} /> Send to Vendor
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Document */}
        <div className="card invoice-document">
          {/* Header */}
          <div className="flex justify-between items-end mb-8 pb-6 border-b border-gray-100">
            <div>
              <h2 className="font-fustat font-bold text-2xl text-gray-900">VendorBridge</h2>
              <p className="text-xs text-gray-400 mt-1">Procurement Platform</p>
            </div>
            <div className="text-right">
              <p className="font-fustat font-bold text-3xl text-gray-900">INVOICE</p>
              <p className="text-gray-500 font-schibsted text-sm mt-1">{invoice.invoice_number}</p>
              <p className="text-gray-400 text-xs mt-0.5">{formatDate(invoice.invoice_date)}</p>
            </div>
          </div>

          {/* Bill From / To */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-schibsted font-semibold text-gray-400 uppercase tracking-wider mb-2">From Procurement Officer</p>
              <p className="font-semibold text-gray-900">{invoice.profiles?.full_name || 'Procurement Officer'}</p>
              <p className="text-gray-500 text-sm">Your Organisation</p>
              <p className="text-gray-400 text-xs">VendorBridge ERP</p>
            </div>
            <div>
              <p className="text-xs font-schibsted font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To (Vendor)</p>
              <p className="font-semibold text-gray-900">{invoice.vendors?.company_name}</p>
              {invoice.vendors?.address && <p className="text-gray-500 text-sm">{invoice.vendors.address}</p>}
              {invoice.vendors?.gst_number && <p className="text-gray-400 text-xs">GST: {invoice.vendors.gst_number}</p>}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 mb-6 text-sm">
            <div className="flex gap-2"><span className="text-gray-400">PO Reference:</span><span className="font-semibold">{invoice.purchase_orders?.po_number || '—'}</span></div>
            <div className="flex gap-2"><span className="text-gray-400">Due Date:</span><span className="font-semibold">{formatDate(invoice.due_date)}</span></div>
          </div>

          {/* Items */}
          <div className="table-container mb-6">
            <table className="data-table">
              <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id}>
                    <td className="text-gray-400">{i + 1}</td>
                    <td className="font-medium">{item.product_name}</td>
                    <td className="font-noto">{item.quantity}</td>
                    <td className="font-noto">{formatCurrency(item.unit_price)}</td>
                    <td className="font-noto font-semibold text-right">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm font-inter"><span className="text-gray-500">Subtotal:</span><span className="font-semibold">{formatCurrency(invoice.subtotal)}</span></div>
              <div className="flex justify-between text-sm font-inter"><span className="text-gray-500">Tax ({invoice.tax_percentage}%):</span><span className="font-semibold">{formatCurrency(invoice.tax_amount)}</span></div>
              <div className="flex justify-between text-base font-inter pt-2 border-t border-gray-900">
                <span className="font-bold">Total:</span>
                <span className="font-fustat font-bold text-xl">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Status footer */}
          {invoice.status === 'paid' && (
            <div className="mt-6 flex justify-center">
              <div className="border-4 border-green-400 rounded-xl px-6 py-2 text-green-500 font-fustat font-bold text-2xl rotate-[-15deg] opacity-80">
                PAID
              </div>
            </div>
          )}
        </div>
      </div>

      {showSendModal && can('sendInvoice') && <SendModal invoice={invoice} onClose={() => setShowSendModal(false)} />}
    </AppLayout>
  );
}
