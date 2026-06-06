import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Download, Plus, Loader2 } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useRBAC } from '../hooks/useRBAC';
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

function InvoiceModal({ po, onClose, onCreated }) {
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [taxPct, setTaxPct] = useState(18);

  const mutation = useMutation({
    mutationFn: () => api.post('/invoices', { po_id: po.id, invoice_date: invoiceDate, due_date: dueDate, tax_percentage: taxPct }),
    onSuccess: (res) => { toast.success('Invoice generated!'); onCreated(res.data.data.id); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="modal-overlay">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-fade-up">
        <h2 className="font-schibsted font-semibold text-xl mb-5">Generate Invoice</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Invoice Date</label>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Tax Percentage</label>
            <input type="number" value={taxPct} onChange={e => setTaxPct(Number(e.target.value))} className="input" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useRBAC();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const { data: po, isLoading } = useQuery({
    queryKey: ['po', id],
    queryFn: () => api.get(`/purchase-orders/${id}`).then(r => r.data.data),
  });

  const downloadPDF = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/purchase-orders/${id}/pdf`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${po?.po_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('PDF download failed'); }
  };

  if (isLoading) return <AppLayout><div className="animate-pulse space-y-4"><div className="skeleton h-8 w-64 rounded" /><div className="skeleton h-96 rounded-2xl" /></div></AppLayout>;
  if (!po) return <AppLayout><div className="empty-state">PO not found</div></AppLayout>;

  const items = po.quotations?.quotation_items || [];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <button onClick={() => navigate('/purchase-orders')} className="text-sm text-gray-400 hover:text-gray-700 font-inter mb-2 flex items-center gap-1">
            <ChevronLeft size={14} /> Back to POs
          </button>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <h1 className="page-title">{po.po_number}</h1>
              <span className={`badge ${getStatusBadgeClass(po.status)}`}>{getStatusLabel(po.status)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadPDF} className="btn-outline text-sm">
                <Download size={14} /> Download PDF
              </button>
              {can('generateInvoice') && (
                <button onClick={() => setShowInvoiceModal(true)} className="btn-primary text-sm">
                  <Plus size={14} /> Generate Invoice
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PO Document */}
        <div className="card invoice-document" style={{ fontFamily: 'Noto Sans, sans-serif' }}>
          {/* Header */}
          <div className="flex justify-between items-end mb-8 pb-6 border-b border-gray-100">
            <div>
              <h2 className="font-fustat font-bold text-2xl text-gray-900">VendorBridge</h2>
              <p className="text-xs text-gray-400 mt-1">Procurement Platform</p>
            </div>
            <div className="text-right">
              <p className="font-fustat font-bold text-3xl text-gray-900">PURCHASE ORDER</p>
              <p className="text-gray-500 font-schibsted text-sm mt-1">{po.po_number}</p>
              <p className="text-gray-400 text-xs mt-0.5">{formatDate(po.created_at)}</p>
            </div>
          </div>

          {/* Bill To / Vendor */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-schibsted font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
              <p className="font-semibold text-gray-900">Your Organisation</p>
              <p className="text-gray-500 text-sm">VendorBridge ERP</p>
            </div>
            <div>
              <p className="text-xs font-schibsted font-semibold text-gray-400 uppercase tracking-wider mb-2">Vendor</p>
              <p className="font-semibold text-gray-900">{po.vendors?.company_name}</p>
              {po.vendors?.address && <p className="text-gray-500 text-sm">{po.vendors.address}, {po.vendors.city}</p>}
              {po.vendors?.gst_number && <p className="text-gray-400 text-xs mt-0.5">GST: {po.vendors.gst_number}</p>}
            </div>
          </div>

          {/* References */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 mb-6 text-sm">
            <div className="flex gap-2"><span className="text-gray-400">PO Reference:</span><span className="font-semibold">{po.po_number}</span></div>
            <div className="flex gap-2"><span className="text-gray-400">Expected Delivery:</span><span className="font-semibold">{formatDate(po.expected_delivery)}</span></div>
            <div className="flex gap-2"><span className="text-gray-400">RFQ Reference:</span><span>{po.rfqs?.rfq_number || '—'}</span></div>
            <div className="flex gap-2"><span className="text-gray-400">Payment Terms:</span><span>{po.quotations?.payment_terms || '—'}</span></div>
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
                    <td className="font-noto">{item.quantity} {item.unit || ''}</td>
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
              <div className="flex justify-between text-sm font-inter">
                <span className="text-gray-500">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(po.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-inter">
                <span className="text-gray-500">GST ({po.tax_percentage}%):</span>
                <span className="font-semibold">{formatCurrency(po.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-inter pt-2 border-t border-gray-900">
                <span className="font-bold">Total:</span>
                <span className="font-fustat font-bold text-xl">{formatCurrency(po.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInvoiceModal && can('generateInvoice') && (
        <InvoiceModal
          po={po}
          onClose={() => setShowInvoiceModal(false)}
          onCreated={(invoiceId) => { setShowInvoiceModal(false); navigate(`/invoices/${invoiceId}`); }}
        />
      )}
    </AppLayout>
  );
}
