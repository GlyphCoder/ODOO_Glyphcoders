import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Upload, X, ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { VENDOR_CATEGORIES } from '../lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';

const STEPS = ['Basic Info', 'Line Items', 'Vendors & Attachments'];

const units = ['Pcs', 'Kg', 'Ltr', 'Mtr', 'Box', 'Set', 'Unit', 'Nos'];
const priorities = ['low', 'medium', 'high'];
const priorityColors = { low: '#16a34a', medium: '#d97706', high: '#dc2626' };

export default function RFQCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [vendorSearch, setVendorSearch] = useState('');

  const { data: vendors } = useQuery({
    queryKey: ['vendors-all'],
    queryFn: () => api.get('/vendors?status=active').then(r => r.data.data),
  });

  const { register, handleSubmit, control, watch, formState: { errors }, trigger } = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      deadline: '',
      items: [{ product_name: '', description: '', quantity: '', unit: 'Pcs', specifications: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const createMut = useMutation({
    mutationFn: (data) => api.post('/rfqs', data),
    onSuccess: (res) => {
      toast.success('RFQ created successfully!');
      navigate(`/rfqs/${res.data.data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const publishMut = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/rfqs', { ...data, status: 'open', vendor_ids: selectedVendors });
      await api.post(`/rfqs/${res.data.data.id}/publish`);
      return res.data.data;
    },
    onSuccess: (rfq) => {
      toast.success('RFQ published and vendors notified!');
      navigate(`/rfqs/${rfq.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const goNext = async () => {
    const fields_to_validate = step === 0
      ? ['title', 'deadline']
      : step === 1 ? ['items'] : [];
    const valid = await trigger(fields_to_validate);
    if (valid) setStep(s => s + 1);
  };

  const onSaveDraft = handleSubmit((data) => {
    createMut.mutate({ ...data, vendor_ids: selectedVendors });
  });

  const onPublish = handleSubmit((data) => {
    if (selectedVendors.length === 0) {
      toast.error('Please select at least one vendor');
      return;
    }
    publishMut.mutate(data);
  });

  const filteredVendors = (vendors || []).filter(v =>
    v.company_name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const toggleVendor = (id) => {
    setSelectedVendors(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const selectedPriority = watch('priority');

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/rfqs')} className="text-sm text-gray-400 hover:text-gray-700 font-inter mb-2 flex items-center gap-1">
            <ChevronLeft size={14} /> Back to RFQs
          </button>
          <h1 className="page-title">Create RFQ</h1>
        </div>

        {/* Step Progress */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`wizard-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                  <div className="wizard-step-num">
                    {i < step ? <Check size={12} /> : i + 1}
                  </div>
                  <span className="hidden sm:block">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="card">
          {/* Step 1: Basic Info */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="section-label">Basic Information</h2>
              <div>
                <label className="label">RFQ Title *</label>
                <input
                  {...register('title', { required: 'Title is required' })}
                  className={`input ${errors.title ? 'error' : ''}`}
                  placeholder="Office Furniture Procurement Q2"
                />
                {errors.title && <p className="input-error">{errors.title.message}</p>}
              </div>

              <div>
                <label className="label">Description</label>
                <textarea {...register('description')} className="input resize-none" rows={3} placeholder="Describe the requirements..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select {...register('category')} className="input">
                    <option value="">Select category</option>
                    {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Deadline *</label>
                  <input
                    type="date"
                    {...register('deadline', { required: 'Deadline is required' })}
                    className={`input ${errors.deadline ? 'error' : ''}`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.deadline && <p className="input-error">{errors.deadline.message}</p>}
                </div>
              </div>

              <div>
                <label className="label">Priority</label>
                <div className="flex gap-3 mt-1">
                  {priorities.map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" {...register('priority')} value={p} className="sr-only" />
                      <div className={`px-4 py-2 rounded-xl text-sm font-schibsted font-semibold transition-all border-2 cursor-pointer
                        ${selectedPriority === p ? 'border-current text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        style={{ background: selectedPriority === p ? priorityColors[p] : '', borderColor: selectedPriority === p ? priorityColors[p] : '' }}
                        onClick={() => document.querySelector(`input[value="${p}"]`)?.click()}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Line Items */}
          {step === 1 && (
            <div>
              <h2 className="section-label mb-4">Line Items</h2>
              <div className="table-container mb-4">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Product / Service *</th><th>Description</th>
                      <th>Qty *</th><th>Unit</th><th>Specs</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, i) => (
                      <tr key={field.id}>
                        <td className="text-gray-400 font-noto">{i + 1}</td>
                        <td>
                          <input
                            {...register(`items.${i}.product_name`, { required: true })}
                            className="input py-1.5 text-xs"
                            placeholder="Product name"
                          />
                        </td>
                        <td>
                          <input {...register(`items.${i}.description`)} className="input py-1.5 text-xs" placeholder="Optional" />
                        </td>
                        <td>
                          <input
                            type="number"
                            {...register(`items.${i}.quantity`, { required: true, min: 0.01 })}
                            className="input py-1.5 text-xs w-20"
                            placeholder="10"
                          />
                        </td>
                        <td>
                          <select {...register(`items.${i}.unit`)} className="input py-1.5 text-xs w-20">
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td>
                          <input {...register(`items.${i}.specifications`)} className="input py-1.5 text-xs" placeholder="Specs" />
                        </td>
                        <td>
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => append({ product_name: '', description: '', quantity: '', unit: 'Pcs', specifications: '' })}
                className="btn-green text-sm"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>
          )}

          {/* Step 3: Vendors & Attachments */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="section-label mb-3">Select Vendors</h2>
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search vendors..."
                    value={vendorSearch}
                    onChange={e => setVendorSearch(e.target.value)}
                    className="input pl-4"
                  />
                </div>

                {/* Selected chips */}
                {selectedVendors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedVendors.map(id => {
                      const v = vendors?.find(v => v.id === id);
                      return v ? (
                        <span key={id} className="flex items-center gap-1.5 bg-black text-white text-xs font-schibsted px-3 py-1.5 rounded-full">
                          {v.company_name}
                          <button type="button" onClick={() => toggleVendor(id)}><X size={12} /></button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  {filteredVendors.length === 0 ? (
                    <p className="text-center py-6 text-sm text-gray-400">No active vendors found</p>
                  ) : (
                    filteredVendors.map(v => (
                      <label key={v.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                        <input
                          type="checkbox"
                          checked={selectedVendors.includes(v.id)}
                          onChange={() => toggleVendor(v.id)}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-schibsted font-semibold text-gray-800">{v.company_name}</p>
                          <p className="text-xs text-gray-400">{v.category}</p>
                        </div>
                        <span className="badge badge-green text-xs">{v.status}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h2 className="section-label mb-3">Attachments</h2>
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-all">
                  <Upload size={24} className="text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm font-inter font-medium text-gray-700">Drag & drop files here or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, DOC, XLS, PNG, JPG up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    className="sr-only"
                    onChange={e => setAttachments(Array.from(e.target.files))}
                  />
                </label>
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((f, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700 font-inter">{f.name}</span>
                        <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(s => s - 1)} className="btn-outline">
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button type="button" onClick={goNext} className="btn-primary">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <div className="flex gap-3">
                <button type="button" onClick={onSaveDraft} disabled={createMut.isPending} className="btn-outline">
                  {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Save as Draft
                </button>
                <button type="button" onClick={onPublish} disabled={publishMut.isPending} className="btn-primary">
                  {publishMut.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Save & Send to Vendors
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
