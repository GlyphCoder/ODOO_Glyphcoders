import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, FileText, Eye } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useRBAC } from '../hooks/useRBAC';
import { formatDate, getStatusBadgeClass, getStatusLabel, daysUntil } from '../lib/utils';
import api from '../lib/api';

const statusTabs = ['All', 'draft', 'open', 'closed', 'cancelled'];

const priorityBadge = { high: 'badge-red', medium: 'badge-amber', low: 'badge-green' };

export default function RFQs() {
  const { can } = useRBAC();
  const navigate = useNavigate();
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['rfqs', tab, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (tab !== 'All') p.set('status', tab);
      if (search) p.set('search', search);
      return api.get(`/rfqs?${p}`).then(r => r.data.data);
    },
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="page-title">RFQs</h1>
          {can('createRFQ') && (
            <button onClick={() => navigate('/rfqs/new')} className="btn-primary">
              <Plus size={16} /> Create RFQ
            </button>
          )}
        </div>

        <div className="card py-4">
          <div className="flex gap-3 items-center mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search RFQs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
          </div>
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
              <FileText size={40} className="text-gray-200" />
              <p className="text-gray-500 font-inter">No RFQs found</p>
              {can('createRFQ') && (
                <button onClick={() => navigate('/rfqs/new')} className="btn-primary text-sm mt-2">Create First RFQ</button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>RFQ #</th><th>Title</th><th>Category</th><th>Priority</th>
                    <th>Deadline</th><th>Vendors</th><th>Quotations</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(rfq => {
                    const dl = daysUntil(rfq.deadline);
                    return (
                      <tr key={rfq.id}>
                        <td className="font-schibsted font-semibold text-gray-700">{rfq.rfq_number}</td>
                        <td>
                          <button
                            onClick={() => navigate(`/rfqs/${rfq.id}`)}
                            className="font-medium text-gray-800 hover:underline text-left"
                          >
                            {rfq.title}
                          </button>
                        </td>
                        <td><span className="badge badge-gray">{rfq.category || '—'}</span></td>
                        <td>
                          <span className={`badge ${priorityBadge[rfq.priority] || 'badge-gray'}`}>
                            {rfq.priority ? rfq.priority.charAt(0).toUpperCase() + rfq.priority.slice(1) : '—'}
                          </span>
                        </td>
                        <td>
                          <div>
                            <span className="text-gray-700">{formatDate(rfq.deadline)}</span>
                            {dl !== null && rfq.status === 'open' && (
                              <span className={`text-xs ml-1.5 ${dl <= 3 ? 'text-red-500' : 'text-gray-400'}`}>
                                ({dl <= 0 ? 'Overdue' : `${dl}d`})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="font-noto">{rfq.rfq_vendors?.length || 0}</td>
                        <td className="font-noto">{rfq.rfq_items?.length || 0} items</td>
                        <td><span className={`badge ${getStatusBadgeClass(rfq.status)}`}>{getStatusLabel(rfq.status)}</span></td>
                        <td>
                          <button
                            onClick={() => navigate(`/rfqs/${rfq.id}`)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
