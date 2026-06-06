import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Receipt, Eye, Download } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function Invoices() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('All');
  const statuses = ['All', 'draft', 'sent', 'paid', 'overdue', 'cancelled'];

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', tab],
    queryFn: () => {
      const p = new URLSearchParams();
      if (tab !== 'All') p.set('status', tab);
      return api.get(`/invoices?${p}`).then(r => r.data.data);
    },
  });

  const downloadPDF = async (invoice) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/invoices/${invoice.id}/pdf`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${invoice.invoice_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('PDF download failed'); }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <h1 className="page-title">Invoices</h1>

        <div className="card py-4">
          <div className="flex gap-1 flex-wrap">
            {statuses.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-schibsted font-semibold transition-all ${tab === t ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t === 'All' ? 'All' : getStatusLabel(t)}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
          ) : !data || data.length === 0 ? (
            <div className="empty-state">
              <Receipt size={40} className="text-gray-200" />
              <p className="text-gray-400 font-inter">No invoices yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>INV #</th><th>PO #</th><th>Vendor</th><th>Total</th><th>Date</th><th>Due Date</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {data.map(inv => (
                    <tr key={inv.id}>
                      <td className="font-schibsted font-semibold">{inv.invoice_number}</td>
                      <td className="text-gray-600">{inv.purchase_orders?.po_number || '—'}</td>
                      <td className="font-medium">{inv.vendors?.company_name || '—'}</td>
                      <td className="font-noto font-semibold">{formatCurrency(inv.total_amount)}</td>
                      <td className="text-gray-500 text-xs">{formatDate(inv.invoice_date)}</td>
                      <td className="text-gray-500 text-xs">{formatDate(inv.due_date)}</td>
                      <td><span className={`badge ${getStatusBadgeClass(inv.status)}`}>{getStatusLabel(inv.status)}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => downloadPDF(inv)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors">
                            <Download size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
