import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { formatCurrency } from '../lib/utils';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const PIE_COLORS = ['#0e1311', '#3db544', '#d97706', '#2563eb', '#7c3aed', '#dc2626', '#64748b'];

const RADIAN = Math.PI / 180;
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return percent > 0.05 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontFamily="Inter">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

function ExportButton({ type, label }) {
  const download = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/reports/export?type=${type}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${type}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };
  return (
    <button onClick={download} className="btn-outline text-sm py-2">
      <Download size={14} /> Export {label}
    </button>
  );
}

export default function Reports() {
  const { data: spending } = useQuery({ queryKey: ['report-spending'], queryFn: () => api.get('/reports/spending').then(r => r.data.data) });
  const { data: vendorPerf } = useQuery({ queryKey: ['report-vperf'], queryFn: () => api.get('/reports/vendor-performance').then(r => r.data.data) });
  const { data: catSpend } = useQuery({ queryKey: ['report-catspend'], queryFn: () => api.get('/reports/category-spending').then(r => r.data.data) });
  const { data: funnel } = useQuery({ queryKey: ['report-funnel'], queryFn: () => api.get('/reports/funnel').then(r => r.data.data) });

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="page-title">Reports & Analytics</h1>
          <div className="flex gap-2">
            <ExportButton type="vendors" label="Vendors" />
            <ExportButton type="rfqs" label="RFQs" />
            <ExportButton type="invoices" label="Invoices" />
          </div>
        </div>

        {/* Top row: Spending Trend + Procurement Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="col-span-2 card">
            <h2 className="section-label mb-5">Monthly Procurement Spend</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={spending || []} margin={{ top: 5, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Schibsted Grotesk', fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#9ca3af' }}
                  tickFormatter={v => v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`} />
                <Tooltip formatter={v => [formatCurrency(v), 'Spend']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'Inter' }} />
                <Bar dataKey="amount" fill="#0e1311" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="section-label mb-5">Procurement Funnel</h2>
            <div className="space-y-3 pt-4">
              {(funnel || []).map((stage, i) => {
                const pct = i === 0 ? 100 : funnel[0]?.count > 0 ? Math.min(100, Math.round((stage.count / funnel[0].count) * 100)) : 0;
                return (
                  <div key={stage.stage}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-schibsted font-semibold text-gray-600">{stage.stage}</span>
                      <span className="text-xs font-noto font-bold text-gray-800">{stage.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: i === 0 ? '#0e1311' : i === 1 ? '#2563eb' : i === 2 ? '#d97706' : '#16a34a' }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{pct}% conversion</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Second row: Vendor Performance + Category Spending Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="col-span-2 card">
            <h2 className="section-label mb-4">Vendor Performance</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Vendor</th><th>Category</th><th>Orders</th><th>Total Value</th><th>Rating</th></tr>
                </thead>
                <tbody>
                  {(vendorPerf || []).slice(0, 10).map(v => (
                    <tr key={v.id}>
                      <td className="font-medium">{v.company_name}</td>
                      <td><span className="badge badge-gray">{v.category}</span></td>
                      <td className="font-noto">{v.po_count}</td>
                      <td className="font-noto font-semibold">{formatCurrency(v.total_value)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${((v.rating || 0) / 5) * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{Number(v.rating || 0).toFixed(1)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2 className="section-label mb-4">Category Spend</h2>
            {catSpend && catSpend.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catSpend} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={<PieLabel />}>
                      {catSpend.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: 12, fontFamily: 'Inter', border: '1px solid #e5e7eb' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {catSpend.slice(0, 5).map((c, i) => (
                    <div key={c.category} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-gray-600 flex-1 truncate">{c.category}</span>
                      <span className="text-xs font-noto font-semibold text-gray-800">{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state py-8"><p className="text-gray-400 text-sm">No spend data</p></div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
