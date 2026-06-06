import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';

const statusTabs = ['All', 'pending', 'approved', 'rejected'];

export default function Approvals() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['approvals', tab],
    queryFn: () => api.get(`/approvals?status=${tab}`).then(r => r.data.data),
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <h1 className="page-title">Approvals</h1>

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
                {t === 'All' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
          ) : !data || data.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={40} className="text-gray-200" />
              <p className="text-gray-400 font-inter">No {tab} approvals</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>RFQ #</th><th>Vendor</th><th>Amount</th><th>Requested By</th><th>Date</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(a => (
                    <tr key={a.id}>
                      <td className="font-schibsted font-semibold">{a.rfqs?.rfq_number || '—'}</td>
                      <td className="font-medium">{a.quotations?.vendors?.company_name || '—'}</td>
                      <td className="font-noto font-semibold">{formatCurrency(a.quotations?.total_amount)}</td>
                      <td className="text-gray-500">{a.requester?.full_name || a.approver?.full_name || '—'}</td>
                      <td className="text-gray-500 text-xs">{formatDate(a.created_at)}</td>
                      <td><span className={`badge ${getStatusBadgeClass(a.status)}`}>{getStatusLabel(a.status)}</span></td>
                      <td>
                        <button onClick={() => navigate(`/approvals/${a.id}`)} className="btn-green text-xs px-3 py-1.5">
                          {a.status === 'pending' ? 'Review' : 'View'}
                        </button>
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
