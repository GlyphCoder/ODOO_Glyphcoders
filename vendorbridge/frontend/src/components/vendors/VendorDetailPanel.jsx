import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Building2, Star, Package, ShoppingCart } from 'lucide-react';
import { formatCurrency, formatDate, getStatusBadgeClass, getStatusLabel } from '../../lib/utils';
import api from '../../lib/api';

const tabs = ['Overview', 'Purchase Orders'];

export function VendorDetailPanel({ vendor, onClose }) {
  const [tab, setTab] = useState('Overview');

  const { data: stats } = useQuery({
    queryKey: ['vendor-stats', vendor.id],
    queryFn: () => api.get(`/vendors/${vendor.id}/stats`).then(r => r.data.data),
  });

  const { data: pos } = useQuery({
    queryKey: ['vendor-pos', vendor.id],
    queryFn: () => api.get(`/purchase-orders?vendor_id=${vendor.id}`).then(r => r.data.data),
    enabled: tab === 'Purchase Orders',
  });

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-panel animate-slide-right" style={{ width: '520px' }}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold"
              style={{ background: '#f0fdf4', color: '#16a34a' }}>
              {vendor.company_name.charAt(0)}
            </div>
            <div>
              <h2 className="font-schibsted font-semibold text-gray-900 text-lg">{vendor.company_name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="badge badge-gray text-xs">{vendor.category}</span>
                <span className={`badge ${getStatusBadgeClass(vendor.status)}`}>{getStatusLabel(vendor.status)}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-1 py-3 mr-5 text-sm font-schibsted font-semibold border-b-2 transition-colors ${
                tab === t ? 'border-black text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto">
          {tab === 'Overview' && (
            <div className="space-y-5">
              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Orders', value: stats.total_orders || 0, icon: ShoppingCart },
                    { label: 'Total Value', value: formatCurrency(stats.total_value), icon: Package },
                    { label: 'On-time Rate', value: `${stats.on_time_rate || 0}%`, icon: Star },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-fustat font-bold text-gray-900">{s.value}</p>
                      <p className="text-xs text-gray-400 font-inter mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={16} className={i <= Math.round(vendor.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                  ))}
                </div>
                <span className="text-sm font-noto font-semibold">{Number(vendor.rating || 0).toFixed(1)}</span>
                <span className="text-xs text-gray-400">vendor rating</span>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {[
                  ['Email', vendor.email],
                  ['Phone', vendor.phone],
                  ['Contact Person', vendor.contact_person],
                  ['Contact Phone', vendor.contact_phone],
                  ['GST Number', vendor.gst_number],
                  ['PAN Number', vendor.pan_number],
                  ['Address', [vendor.address, vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(', ')],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <span className="text-xs text-gray-400 font-schibsted font-semibold uppercase tracking-wider w-28 shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-gray-700 font-inter">{value}</span>
                  </div>
                ))}
              </div>

              {vendor.notes && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-schibsted font-semibold text-gray-400 uppercase mb-1.5">Notes</p>
                  <p className="text-sm text-gray-600 font-inter">{vendor.notes}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'Purchase Orders' && (
            <div>
              {!pos || pos.length === 0 ? (
                <div className="empty-state"><p className="text-sm text-gray-400">No purchase orders for this vendor</p></div>
              ) : (
                <div className="space-y-3">
                  {pos.map(po => (
                    <div key={po.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-sm font-schibsted font-semibold">{po.po_number}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(po.created_at)}</p>
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
          )}
        </div>
      </div>
    </>
  );
}
