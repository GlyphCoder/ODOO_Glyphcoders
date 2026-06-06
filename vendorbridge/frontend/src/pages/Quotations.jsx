import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuthStore } from '../store/authStore';
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';

const statusTabs = ['All', 'submitted', 'under_review', 'accepted', 'rejected'];

export default function Quotations() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('All');

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', tab],
    queryFn: () => {
      const p = new URLSearchParams();
      if (tab !== 'All') p.set('status', tab);
      return api.get(`/quotations?${p}`).then(r => r.data.data);
    },
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <h1 className="page-title">Quotations</h1>

        <div className="card py-4">
          <div className="flex gap-1">
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
                    <th>RFQ</th><th>Title</th><th>Vendor</th><th>Submitted</th>
                    <th>Total Amount</th><th>Delivery</th><th>Status</th><th>Action</th>
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
                        {q.rfqs?.id && (
                          <button
                            onClick={() => navigate(`/rfqs/${q.rfqs.id}`)}
                            className="text-xs btn-outline py-1.5 px-3"
                          >
                            View RFQ
                          </button>
                        )}
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
