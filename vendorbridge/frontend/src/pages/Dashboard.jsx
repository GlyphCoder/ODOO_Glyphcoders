import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, ShoppingCart, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart, ResponsiveContainer
} from 'recharts';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuthStore } from '../store/authStore';
import { useRBAC } from '../hooks/useRBAC';
import { formatCurrency, formatDate, getStatusBadgeClass, getStatusLabel } from '../lib/utils';
import api from '../lib/api';

const StatCard = ({ title, value, sub, subUp, icon: Icon, color }) => (
  <div className="card animate-fade-up">
    <div className="flex items-start justify-between mb-4">
      <div>
        <p className="text-xs font-schibsted font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-fustat font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: color + '18' }}>
        <Icon size={20} style={{ color }} />
      </div>
    </div>
    {sub && (
      <div className="flex items-center gap-1.5">
        {subUp !== undefined ? (
          subUp ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />
        ) : null}
        <span className={`text-xs font-inter ${subUp ? 'text-green-600' : subUp === false ? 'text-red-600' : 'text-gray-500'}`}>{sub}</span>
      </div>
    )}
  </div>
);

const SkeletonCard = () => (
  <div className="card">
    <div className="skeleton h-4 w-24 mb-3 rounded" />
    <div className="skeleton h-8 w-16 mb-4 rounded" />
    <div className="skeleton h-3 w-32 rounded" />
  </div>
);

export default function Dashboard() {
  const { user } = useAuthStore();
  const { can } = useRBAC();
  const navigate = useNavigate();

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: approvalsData } = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => api.get('/approvals?status=pending').then(r => r.data.data),
    enabled: can('approveRFQ'),
  });

  const { data: rfqsData } = useQuery({
    queryKey: ['rfqs', 'open'],
    queryFn: () => api.get('/rfqs?status=open').then(r => r.data.data),
  });

  const { data: posData } = useQuery({
    queryKey: ['pos', 'recent'],
    queryFn: () => api.get('/purchase-orders').then(r => r.data.data?.slice(0, 5)),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['invoices', 'recent'],
    queryFn: () => api.get('/invoices').then(r => r.data.data?.slice(0, 5)),
  });

  const stats = dashData || {};
  const trendData = stats.trends || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header + Quick Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="text-sm text-gray-500 font-inter mt-1">
              Welcome back, {user?.full_name?.split(' ')[0]}! Here's what's happening.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {can('compareQuotations') && (
              <button onClick={() => navigate('/rfqs')} className="btn-outline text-sm">Compare Quotes</button>
            )}
            {can('manageVendors') && (
              <button onClick={() => navigate('/vendors')} className="btn-outline text-sm">+ Add Vendor</button>
            )}
            {can('createRFQ') && (
              <button onClick={() => navigate('/rfqs/new')} className="btn-primary text-sm">+ Create RFQ</button>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                title="Pending Approvals"
                value={stats.pending_approvals ?? 0}
                sub={`Review required`}
                icon={AlertCircle}
                color="#d97706"
              />
              <StatCard
                title="Active RFQs"
                value={stats.active_rfqs ?? 0}
                sub="Open for quotations"
                icon={CheckCircle2}
                color="#2563eb"
              />
              <StatCard
                title="POs This Month"
                value={stats.total_pos_month ?? 0}
                sub="Purchase orders"
                icon={ShoppingCart}
                color="#16a34a"
              />
              <StatCard
                title="Total Invoiced"
                value={formatCurrency(stats.total_invoiced_month)}
                sub="This month"
                icon={Receipt}
                color="#7c3aed"
              />
            </>
          )}
        </div>

        {/* Main content row */}
        <div className="grid grid-cols-5 gap-4">
          {/* Pending Approvals table — 3/5 */}
          {can('approveRFQ') && (
            <div className="col-span-5 lg:col-span-3 card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-label">Pending Approvals</h2>
                <button onClick={() => navigate('/approvals')} className="text-xs text-gray-400 hover:text-black font-inter transition-colors">
                  View all →
                </button>
              </div>
              {!approvalsData || approvalsData.length === 0 ? (
                <div className="empty-state py-10">
                  <CheckCircle2 size={36} className="text-gray-200" />
                  <p className="text-sm text-gray-400">No pending approvals</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>RFQ</th><th>Vendor</th><th>Amount</th><th>Requested</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(approvalsData || []).slice(0, 5).map(a => (
                        <tr key={a.id}>
                          <td className="font-medium">{a.rfqs?.rfq_number || '—'}</td>
                          <td className="text-gray-600">{a.quotations?.vendors?.company_name || '—'}</td>
                          <td className="font-noto">{formatCurrency(a.quotations?.total_amount)}</td>
                          <td className="text-gray-400 text-xs">{formatDate(a.created_at)}</td>
                          <td>
                            <button
                              onClick={() => navigate(`/approvals/${a.id}`)}
                              className="btn-green text-xs px-3 py-1.5"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Spend Trend Chart — 2/5 */}
          <div className={`col-span-5 ${can('approveRFQ') ? 'lg:col-span-2' : 'lg:col-span-5'} card`}>
            <h2 className="section-label mb-4">Procurement Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgba(90,225,76,0.89)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="rgba(90,225,76,0.89)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'Schibsted Grotesk' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'Inter' }} tickFormatter={v => `₹${v >= 100000 ? (v/100000).toFixed(0)+'L' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v}`} />
                <Tooltip
                  formatter={(v) => [formatCurrency(v), 'Spend']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'Inter' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#0e1311" strokeWidth={2} fill="url(#trendGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Third row: Active RFQs | Recent POs | Recent Invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Active RFQs */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-label">Active RFQs</h2>
              <button onClick={() => navigate('/rfqs')} className="text-xs text-gray-400 hover:text-black font-inter">View all →</button>
            </div>
            {!rfqsData || rfqsData.length === 0 ? (
              <div className="empty-state py-8">
                <p className="text-sm text-gray-400">No active RFQs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(rfqsData || []).slice(0, 4).map(rfq => {
                  const daysLeft = Math.ceil((new Date(rfq.deadline) - new Date()) / 86400000);
                  return (
                    <div
                      key={rfq.id}
                      onClick={() => navigate(`/rfqs/${rfq.id}`)}
                      className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-schibsted font-semibold text-gray-400">{rfq.rfq_number}</p>
                          <p className="text-sm font-inter font-medium text-gray-800 mt-0.5 truncate-2">{rfq.title}</p>
                        </div>
                        <span className={`badge ml-2 shrink-0 ${daysLeft <= 3 ? 'badge-amber' : 'badge-green'}`}>
                          {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent POs */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-label">Recent POs</h2>
              <button onClick={() => navigate('/purchase-orders')} className="text-xs text-gray-400 hover:text-black font-inter">View all →</button>
            </div>
            {!posData || posData.length === 0 ? (
              <div className="empty-state py-8"><p className="text-sm text-gray-400">No purchase orders</p></div>
            ) : (
              <div className="space-y-2">
                {(posData || []).map(po => (
                  <div key={po.id} onClick={() => navigate(`/purchase-orders/${po.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div>
                      <p className="text-xs font-schibsted font-semibold text-gray-800">{po.po_number}</p>
                      <p className="text-xs text-gray-400 font-inter truncate" style={{ maxWidth: '120px' }}>{po.vendors?.company_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-noto font-semibold">{formatCurrency(po.total_amount)}</p>
                      <span className={`badge ${getStatusBadgeClass(po.status)} mt-0.5`}>{getStatusLabel(po.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Invoices */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-label">Recent Invoices</h2>
              <button onClick={() => navigate('/invoices')} className="text-xs text-gray-400 hover:text-black font-inter">View all →</button>
            </div>
            {!invoicesData || invoicesData.length === 0 ? (
              <div className="empty-state py-8"><p className="text-sm text-gray-400">No invoices yet</p></div>
            ) : (
              <div className="space-y-2">
                {(invoicesData || []).map(inv => (
                  <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div>
                      <p className="text-xs font-schibsted font-semibold text-gray-800">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400 font-inter">{inv.vendors?.company_name || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-noto font-semibold">{formatCurrency(inv.total_amount)}</p>
                      <span className={`badge ${getStatusBadgeClass(inv.status)} mt-0.5`}>{getStatusLabel(inv.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
