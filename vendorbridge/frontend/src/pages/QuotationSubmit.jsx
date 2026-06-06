import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useRBAC } from '../hooks/useRBAC';
import { AppLayout } from '../components/layout/AppLayout';
import { VideoBackground } from '../components/layout/VideoBackground';
import { formatCurrency } from '../lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';

export function QuotationSubmitModal({ rfqId, onClose, onSubmitted }) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-gray-50 rounded-2xl shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <QuotationSubmitContent rfqId={rfqId} mode="modal" onClose={onClose} onSubmitted={onSubmitted} />
      </div>
    </div>
  );
}

export default function QuotationSubmit() {
  const { rfq_id } = useParams();
  return <QuotationSubmitContent rfqId={rfq_id} mode="page" />;
}

function QuotationSubmitContent({ rfqId, mode = 'page', onClose, onSubmitted }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { can, role } = useRBAC();
  const [items, setItems] = useState([]);
  const [taxPct, setTaxPct] = useState(18);
  const [notes, setNotes] = useState('Payment terms: 20 days net...');
  const [submitted, setSubmitted] = useState(false);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  const isModal = mode === 'modal';

  const { data: rfq, isLoading } = useQuery({
    queryKey: ['rfq-public', rfqId],
    queryFn: () => api.get(`/rfqs/${rfqId}`).then(r => r.data.data),
    enabled: Boolean(rfqId),
  });

  useEffect(() => {
    if (rfq?.rfq_items) {
      setItems(rfq.rfq_items.map(item => ({
        rfq_item_id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: '',
        delivery_days: 7, // default 7 days
        notes: '',
      })));
    }
  }, [rfq]);

  const subtotal = items.reduce((sum, i) => sum + (Number(i.unit_price || 0) * Number(i.quantity || 0)), 0);
  const taxAmount = (subtotal * taxPct) / 100;
  const total = subtotal + taxAmount;

  const mutation = useMutation({
    mutationFn: (status = 'submitted') => {
      const payload = {
        rfq_id: rfqId,
        delivery_days: items.length > 0 ? Math.max(...items.map(i => Number(i.delivery_days || 0))) : 7,
        payment_terms: notes,
        validity_days: 30,
        notes,
        tax_percentage: taxPct,
        status, // 'draft' or 'submitted'
        items: items.map(i => ({
          rfq_item_id: i.rfq_item_id,
          product_name: i.product_name,
          quantity: Number(i.quantity),
          unit: i.unit,
          unit_price: Number(i.unit_price || 0),
          delivery_days: Number(i.delivery_days || 7),
          notes: i.notes || '',
        })),
      };
      if (role !== 'vendor') {
        payload.vendor_id = selectedVendorId;
      }
      return api.post('/quotations', payload);
    },
    onSuccess: (res, status) => {
      setSubmitted(true);
      setIsDraftMode(status === 'draft');
      toast.success(status === 'draft' ? 'Draft saved successfully!' : 'Quotation submitted successfully!');
      onSubmitted?.();
    },
    onError: (e) => toast.error(e.message),
  });

  // If user not logged in, show login reminder
  if (!user) {
    const loginCard = (
      <div className={isModal ? 'p-8 text-center' : 'relative z-10 glass-card rounded-3xl p-10 max-w-md w-full text-center'}>
        <h2 className={`font-fustat font-bold text-2xl mb-3 ${isModal ? 'text-gray-900' : 'text-white'}`}>Login Required</h2>
        <p className={`${isModal ? 'text-gray-500' : 'text-white/70'} font-inter mb-6`}>Please log in to submit a quotation.</p>
        <button onClick={() => navigate('/login')} className="btn-primary w-full justify-center">Go to Login</button>
      </div>
    );

    if (isModal) {
      return (
        <div className="p-6 relative">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
          {loginCard}
        </div>
      );
    }

    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <VideoBackground />
        {loginCard}
      </div>
    );
  }

  // Access check
  if (!can('submitQuotation')) {
    const accessDeniedCard = (
      <div className="card max-w-md w-full text-center p-10 mx-auto">
        <h2 className="font-fustat font-bold text-red-600 text-2xl mb-3">Access Denied</h2>
        <p className="text-gray-500 font-inter mb-6">You do not have permission to submit quotations.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary w-full justify-center">Go to Dashboard</button>
      </div>
    );

    if (isModal) {
      return (
        <div className="p-6 relative">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
          {accessDeniedCard}
        </div>
      );
    }

    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          {accessDeniedCard}
        </div>
      </AppLayout>
    );
  }

  if (submitted) {
    const successCard = (
      <div className="card max-w-md w-full text-center p-12 mx-auto">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#dcfce7' }}>
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="font-fustat font-bold text-3xl text-gray-900 mb-2">
          {isDraftMode ? 'Draft Saved!' : 'Submitted!'}
        </h2>
        <p className="text-gray-500 font-inter mb-6">
          Your quotation for <strong>{rfq?.title}</strong> has been {isDraftMode ? 'saved as a draft' : 'submitted successfully'}.
        </p>
        {isModal ? (
          <button onClick={onClose} className="btn-primary w-full justify-center">Close</button>
        ) : (
          <button onClick={() => navigate('/quotations')} className="btn-primary w-full justify-center">
            Go to Quotations
          </button>
        )}
      </div>
    );

    if (isModal) {
      return (
        <div className="p-6">
          {successCard}
        </div>
      );
    }

    return (
      <AppLayout>
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          {successCard}
        </div>
      </AppLayout>
    );
  }

  const rfqSummary = rfq?.rfq_items
    ? rfq.rfq_items.map(item => `${item.product_name} * ${item.quantity}`).join(', ') + ` - category ${rfq.category || ''}`
    : '';

  const mainForm = (
    <div className="space-y-6">
      {/* Title and RFQ Details */}
      <div className="card space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title text-3xl font-bold font-fustat text-gray-900 mb-1">Submit Quotation</h1>
            <p className="text-base text-gray-600 font-inter font-medium">
              RFQ: {rfq?.title || 'Loading...'} - deadline {rfq?.deadline ? new Date(rfq.deadline).toLocaleDateString() : ''}
            </p>
          </div>
          {isModal && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          )}
        </div>

        {/* RFQ Summary Banner */}
        {rfq && (
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200/80">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">RFQ Summary</p>
            <p className="text-sm font-semibold text-gray-800 font-inter">{rfqSummary}</p>
          </div>
        )}
      </div>

      {/* Your Quotation Items Form */}
      <div className="card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="section-label text-xl font-bold font-fustat text-gray-900">Your Quotation</h2>
          
          {/* Vendor selection for non-vendors (officer, admin, manager) */}
          {role !== 'vendor' && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-schibsted font-bold text-gray-500 uppercase tracking-wider shrink-0">Select Vendor *</span>
              <select
                value={selectedVendorId}
                onChange={e => setSelectedVendorId(e.target.value)}
                className="input py-1.5 px-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl max-w-xs focus:ring-1 focus:ring-green-500"
                required
              >
                <option value="">-- Choose Vendor --</option>
                {rfq?.rfq_vendors?.map(rv => rv.vendors && (
                  <option key={rv.vendors.id} value={rv.vendors.id}>
                    {rv.vendors.company_name} {rv.responded ? '(Responded)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-center">Qty</th>
                <th>Unit price (₹) *</th>
                <th>Total</th>
                <th>Delivery (days) *</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <Loader2 className="animate-spin mx-auto text-green-500" size={24} />
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-gray-800">{item.product_name}</td>
                    <td className="text-center font-semibold text-gray-700">{item.quantity}</td>
                    <td>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, unit_price: e.target.value } : it))}
                        className="input py-2 w-36 font-semibold"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="font-semibold text-gray-800">
                      {formatCurrency(Number(item.unit_price || 0) * Number(item.quantity))}
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.delivery_days}
                        onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, delivery_days: e.target.value } : it))}
                        className="input py-2 w-28 font-semibold"
                        placeholder="7"
                        min="1"
                        required
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="h-px bg-gray-200" />

        {/* Bottom Forms & Calculations Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          {/* Form Inputs */}
          <div className="space-y-4">
            <div>
              <label className="label text-sm font-semibold text-gray-700">tax / GST %</label>
              <input
                type="number"
                value={taxPct}
                onChange={e => setTaxPct(Number(e.target.value))}
                className="input py-2 w-full max-w-[200px] font-semibold"
                placeholder="18"
                min="0"
              />
            </div>
            <div>
              <label className="label text-sm font-semibold text-gray-700">Note / terms</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input resize-none py-2.5 h-32 text-gray-700"
                placeholder="Payment terms: 20 days net..."
                rows={3}
              />
            </div>
          </div>

          {/* Totals Box */}
          <div className="flex justify-end items-start">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 w-full max-w-sm space-y-4">
              <div className="flex justify-between text-sm text-gray-600 font-inter">
                <span>Subtotal</span>
                <span className="font-bold text-gray-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 font-inter">
                <span>GST ({taxPct}%)</span>
                <span className="font-bold text-gray-800">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-gray-800 font-bold font-schibsted text-base">Grand total</span>
                <span className="text-gray-900 text-2xl font-bold font-fustat">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-200 my-6" />

        {/* Buttons Action Group */}
        <div className="flex justify-start gap-4">
          <button
            onClick={() => mutation.mutate('submitted')}
            disabled={mutation.isPending || (role !== 'vendor' && !selectedVendorId) || items.some(i => !i.unit_price || !i.delivery_days)}
            className="btn-primary"
          >
            {mutation.isPending && !isDraftMode ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            Submit Quotation
          </button>
          
          <button
            onClick={() => mutation.mutate('draft')}
            disabled={mutation.isPending || (role !== 'vendor' && !selectedVendorId)}
            className="px-6 py-2.5 rounded-xl border border-gray-300 font-schibsted font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {mutation.isPending && isDraftMode ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            Save Draft
          </button>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return <div className="p-6">{mainForm}</div>;
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {mainForm}
      </div>
    </AppLayout>
  );
}
