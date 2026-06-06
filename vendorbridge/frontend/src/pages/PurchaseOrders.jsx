import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Eye } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('All');
  const statuses = ['All', 'generated', 'sent', 'acknowledged', 'completed', 'cancelled'];

  const { data, isLoading } = useQuery({
    queryKey: ['pos', tab],
    queryFn: () => {
      const p = new URLSearchParams();
      if (tab !== 'All') p.set('status', tab);
      return api.get(`/purchase-orders?${p}`).then(r => r.data.data);
    },
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <h1 className="page-title">Purchase Orders</h1>

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
              <ShoppingCart size={40} className="text-gray-200" />
              <p className="text-gray-400 font-inter">No purchase orders</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>PO #</th><th>RFQ</th><th>Vendor</th><th>Total</th><th>Date</th><th>Expected Delivery</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {data.map(po => (
                    <tr key={po.id}>
                      <td className="font-schibsted font-semibold">{po.po_number}</td>
                      <td className="text-gray-600">{po.rfqs?.rfq_number || '—'}</td>
                      <td className="font-medium">{po.vendors?.company_name || '—'}</td>
                      <td className="font-noto font-semibold">{formatCurrency(po.total_amount)}</td>
                      <td className="text-gray-500 text-xs">{formatDate(po.created_at)}</td>
                      <td className="text-gray-500 text-xs">{formatDate(po.expected_delivery)}</td>
                      <td><span className={`badge ${getStatusBadgeClass(po.status)}`}>{getStatusLabel(po.status)}</span></td>
                      <td>
                        <button onClick={() => navigate(`/purchase-orders/${po.id}`)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors">
                          <Eye size={15} />
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
