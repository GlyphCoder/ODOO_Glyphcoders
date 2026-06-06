import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { VENDOR_CATEGORIES } from '../../lib/utils';
import api from '../../lib/api';
import { toast } from 'sonner';

export function VendorFormModal({ vendor, onClose, onSaved }) {
  const isEdit = !!vendor;
  const [rating, setRating] = useState(vendor?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: vendor || { status: 'pending', category: 'IT Services' },
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? api.put(`/vendors/${vendor.id}`, data) : api.post('/vendors', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Vendor updated' : 'Vendor added successfully');
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data) => mutation.mutate({ ...data, rating });

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-panel animate-slide-right" style={{ width: '480px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-schibsted font-semibold text-gray-900 text-lg">{isEdit ? 'Edit Vendor' : 'Add Vendor'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Company Name *</label>
              <input {...register('company_name', { required: 'Required' })} className={`input ${errors.company_name ? 'error' : ''}`} placeholder="TechCorp Ltd" />
              {errors.company_name && <p className="input-error">{errors.company_name.message}</p>}
            </div>

            <div>
              <label className="label">Category *</label>
              <select {...register('category', { required: true })} className="input">
                {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="label">Email *</label>
              <input type="email" {...register('email', { required: 'Required' })} className={`input ${errors.email ? 'error' : ''}`} placeholder="vendor@company.com" />
              {errors.email && <p className="input-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Phone</label>
              <input type="tel" {...register('phone')} className="input" placeholder="+91 98765..." />
            </div>

            <div>
              <label className="label">GST Number</label>
              <input {...register('gst_number')} className="input" placeholder="22AAAAA0000A1Z5" />
            </div>

            <div>
              <label className="label">PAN Number</label>
              <input {...register('pan_number')} className="input" placeholder="AAAAA0000A" />
            </div>

            <div>
              <label className="label">Contact Person</label>
              <input {...register('contact_person')} className="input" placeholder="John Doe" />
            </div>

            <div>
              <label className="label">Contact Phone</label>
              <input {...register('contact_phone')} className="input" placeholder="+91 ..." />
            </div>

            <div className="col-span-2">
              <label className="label">Address</label>
              <input {...register('address')} className="input" placeholder="123 Main Street" />
            </div>

            <div>
              <label className="label">City</label>
              <input {...register('city')} className="input" placeholder="Mumbai" />
            </div>

            <div>
              <label className="label">State</label>
              <input {...register('state')} className="input" placeholder="Maharashtra" />
            </div>

            <div>
              <label className="label">Pincode</label>
              <input {...register('pincode')} className="input" placeholder="400001" />
            </div>

            <div>
              <label className="label">Rating</label>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i)}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-amber-400"
                  >
                    <Star size={22} className={(hoverRating || rating) >= i ? 'fill-amber-400' : 'text-gray-200'} />
                  </button>
                ))}
                <span className="text-sm text-gray-500 ml-1">{rating > 0 ? `${rating}.0` : 'No rating'}</span>
              </div>
            </div>

            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea {...register('notes')} className="input resize-none" rows={3} placeholder="Additional notes about this vendor..." />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2 border-t border-gray-100 sticky bottom-0 bg-white py-4">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              {mutation.isPending ? 'Saving...' : 'Save Vendor'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
