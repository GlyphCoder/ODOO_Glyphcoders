import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Pencil, Trash2, Star } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useRBAC } from '../hooks/useRBAC';
import { getStatusBadgeClass, getStatusLabel, VENDOR_CATEGORIES } from '../lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';
import { VendorFormModal } from '../components/vendors/VendorFormModal';
import { VendorDetailPanel } from '../components/vendors/VendorDetailPanel';

const statusTabs = ['All', 'active', 'inactive', 'pending'];

export default function Vendors() {
  const { can } = useRBAC();
  const qc = useQueryClient();
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [viewVendor, setViewVendor] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', tab, search, category],
    queryFn: () => {
      const params = new URLSearchParams();
      if (tab !== 'All') params.set('status', tab);
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      return api.get(`/vendors?${params}`).then(r => r.data.data);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/vendors/${id}`),
    onSuccess: () => { qc.invalidateQueries(['vendors']); toast.success('Vendor deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const handleDelete = (id) => {
    if (confirm('Delete this vendor? This action cannot be undone.')) deleteMut.mutate(id);
  };

  const StarRating = ({ rating }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
      ))}
      <span className="text-xs text-gray-500 ml-1 font-noto">{Number(rating || 0).toFixed(1)}</span>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="page-title">Vendors</h1>
          {can('manageVendors') && (
            <button onClick={() => { setEditVendor(null); setShowForm(true); }} className="btn-primary">
              <Plus size={16} /> Add Vendor
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="card py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="input w-48"
            >
              <option value="">All Categories</option>
              {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 mt-4">
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

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
            </div>
          ) : !data || data.length === 0 ? (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="opacity-20">
                <circle cx="32" cy="32" r="28" stroke="#6b7280" strokeWidth="2"/>
                <path d="M20 32h24M32 20v24" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className="text-gray-500 font-inter">No vendors found</p>
              {can('manageVendors') && (
                <button onClick={() => setShowForm(true)} className="btn-primary text-sm mt-2">Add First Vendor</button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Company</th><th>Category</th><th>GST Number</th>
                    <th>Contact Person</th><th>Email</th><th>Status</th>
                    <th>Rating</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(v => (
                    <tr key={v.id}>
                      <td>
                        <button
                          onClick={() => setViewVendor(v)}
                          className="font-semibold text-gray-800 hover:text-black hover:underline text-left font-inter"
                        >
                          {v.company_name}
                        </button>
                      </td>
                      <td><span className="badge badge-gray">{v.category}</span></td>
                      <td className="font-noto text-gray-600">{v.gst_number || '—'}</td>
                      <td className="text-gray-600">{v.contact_person || '—'}</td>
                      <td className="text-gray-600 text-xs">{v.email}</td>
                      <td><span className={`badge ${getStatusBadgeClass(v.status)}`}>{getStatusLabel(v.status)}</span></td>
                      <td><StarRating rating={v.rating} /></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewVendor(v)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
                            <Eye size={15} />
                          </button>
                          {can('manageVendors') && (
                            <button onClick={() => { setEditVendor(v); setShowForm(true); }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
                              <Pencil size={15} />
                            </button>
                          )}
                          {can('deleteVendors') && (
                            <button onClick={() => handleDelete(v.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={15} />
                            </button>
                          )}
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

      {showForm && (
        <VendorFormModal
          vendor={editVendor}
          onClose={() => { setShowForm(false); setEditVendor(null); }}
          onSaved={() => { setShowForm(false); setEditVendor(null); qc.invalidateQueries(['vendors']); }}
        />
      )}
      {viewVendor && <VendorDetailPanel vendor={viewVendor} onClose={() => setViewVendor(null)} />}
    </AppLayout>
  );
}
