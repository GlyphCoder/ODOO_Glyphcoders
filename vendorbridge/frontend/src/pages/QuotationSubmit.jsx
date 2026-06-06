import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { VideoBackground } from '../components/layout/VideoBackground';
import { formatCurrency } from '../lib/utils';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function QuotationSubmit() {
  const { rfq_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [items, setItems] = useState([]);
  const [taxPct, setTaxPct] = useState(18);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: rfq, isLoading } = useQuery({
    queryKey: ['rfq-public', rfq_id],
    queryFn: () => api.get(`/rfqs/${rfq_id}`).then(r => r.data.data),
  });

  useEffect(() => {
    if (rfq?.rfq_items) {
      setItems(rfq.rfq_items.map(item => ({
        rfq_item_id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: '',
        notes: '',
      })));
    }
  }, [rfq]);

  const subtotal = items.reduce((sum, i) => sum + (Number(i.unit_price || 0) * Number(i.quantity || 0)), 0);
  const taxAmount = (subtotal * taxPct) / 100;
  const total = subtotal + taxAmount;

  const mutation = useMutation({
    mutationFn: () => api.post('/quotations', {
      rfq_id,
      delivery_days: Number(deliveryDays),
      payment_terms: paymentTerms,
      validity_days: Number(validityDays),
      notes,
      tax_percentage: taxPct,
      items: items.map(i => ({
        rfq_item_id: i.rfq_item_id,
        product_name: i.product_name,
        quantity: Number(i.quantity),
        unit: i.unit,
        unit_price: Number(i.unit_price),
        notes: i.notes,
      })),
    }),
    onSuccess: () => { setSubmitted(true); toast.success('Quotation submitted!'); },
    onError: (e) => toast.error(e.message),
  });

  // If vendor not logged in, show login reminder
  if (!user) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <VideoBackground />
        <div className="relative z-10 glass-card rounded-3xl p-10 max-w-md w-full text-center">
          <h2 className="font-fustat font-bold text-white text-2xl mb-3">Login Required</h2>
          <p className="text-white/70 font-inter mb-6">Please log in with your vendor account to submit a quotation.</p>
          <button onClick={() => navigate('/login')} className="btn-primary w-full justify-center">Go to Login</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center p-12">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#dcfce7' }}>
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="font-fustat font-bold text-3xl text-gray-900 mb-2">Submitted!</h2>
          <p className="text-gray-500 font-inter">Your quotation for <strong>{rfq?.title}</strong> has been submitted successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(90,225,76,0.12)' }}>
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h1 className="page-title text-2xl">Submit Quotation</h1>
              <p className="text-sm text-gray-500 font-inter">VendorBridge Procurement Platform</p>
            </div>
          </div>
          {rfq && (
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-schibsted uppercase">RFQ</p>
                <p className="text-sm font-semibold">{rfq.rfq_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-schibsted uppercase">Title</p>
                <p className="text-sm font-semibold">{rfq.title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-schibsted uppercase">Deadline</p>
                <p className="text-sm font-semibold">{rfq.deadline}</p>
              </div>
            </div>
          )}
        </div>

        <div className="card space-y-5">
          <h2 className="section-label">Quotation Terms</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Payment Terms *</label>
              <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="input" placeholder="Net 30 days" required />
            </div>
            <div>
              <label className="label">Delivery Days *</label>
              <input type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} className="input" placeholder="7" min="1" required />
            </div>
            <div>
              <label className="label">Validity (Days)</label>
              <input type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} className="input" placeholder="30" />
            </div>
            <div>
              <label className="label">Tax Percentage</label>
              <input type="number" value={taxPct} onChange={e => setTaxPct(Number(e.target.value))} className="input" placeholder="18" />
            </div>
          </div>
          <div>
            <label className="label">Notes / Comments</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none" rows={3} placeholder="Any additional comments..." />
          </div>
        </div>

        <div className="card">
          <h2 className="section-label mb-4">Price Your Items</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Product</th><th>Req. Qty</th><th>Unit</th><th>Unit Price (₹) *</th><th>Total</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="text-gray-400">{i + 1}</td>
                    <td className="font-medium">{item.product_name}</td>
                    <td className="font-noto">{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, unit_price: e.target.value } : it))}
                        className="input py-1.5 w-28"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="font-noto font-semibold">{formatCurrency(Number(item.unit_price || 0) * Number(item.quantity))}</td>
                    <td>
                      <input
                        value={item.notes}
                        onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, notes: e.target.value } : it))}
                        className="input py-1.5"
                        placeholder="Optional"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-5">
            <div className="bg-gray-50 rounded-xl p-5 w-64 space-y-2">
              <div className="flex justify-between text-sm font-inter">
                <span className="text-gray-500">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-inter">
                <span className="text-gray-500">Tax ({taxPct}%):</span>
                <span className="font-semibold">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-schibsted font-bold text-gray-900">Grand Total:</span>
                <span className="font-fustat font-bold text-xl text-black">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !paymentTerms || !deliveryDays}
            className="btn-primary"
          >
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Submit Quotation
          </button>
        </div>
      </div>
    </div>
  );
}
