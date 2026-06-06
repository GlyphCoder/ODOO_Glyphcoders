import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Star } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { formatCurrency } from '../lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';

export default function QuotationCompare() {
  const { rfq_id } = useParams();
  const navigate = useNavigate();

  const { data: rfq } = useQuery({
    queryKey: ['rfq', rfq_id],
    queryFn: () => api.get(`/rfqs/${rfq_id}`).then(r => r.data.data),
  });

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['compare', rfq_id],
    queryFn: () => api.post('/quotations/compare', { rfq_id }).then(r => r.data.data),
  });

  const handleSelect = (quotation) => {
    navigate(`/approvals/new?quotation_id=${quotation.id}&rfq_id=${rfq_id}`);
  };

  if (isLoading) return (
    <AppLayout>
      <div className="animate-pulse space-y-4">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    </AppLayout>
  );

  const vendors = quotations || [];
  const allItems = rfq?.rfq_items || [];

  // Find lowest value in each numeric comparison
  const lowestTotal = vendors.length > 0 ? Math.min(...vendors.map(q => q.total_amount || Infinity)) : Infinity;
  const lowestDelivery = vendors.length > 0 ? Math.min(...vendors.map(q => q.delivery_days || Infinity)) : Infinity;

  const getItemLowest = (itemName) => {
    const prices = vendors.map(q => {
      const item = q.quotation_items?.find(i => i.product_name === itemName);
      return item ? Number(item.unit_price) : Infinity;
    });
    return Math.min(...prices);
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <button onClick={() => navigate(`/rfqs/${rfq_id}`)} className="text-sm text-gray-400 hover:text-gray-700 font-inter mb-2 flex items-center gap-1">
            <ChevronLeft size={14} /> Back to RFQ
          </button>
          <h1 className="page-title">Quotation Comparison</h1>
          <p className="text-gray-500 font-inter text-sm mt-1">
            {rfq?.title} · {vendors.length} quotations received
          </p>
        </div>

        {vendors.length < 2 ? (
          <div className="card empty-state">
            <p className="text-gray-400">Need at least 2 quotations to compare</p>
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="data-table w-full" style={{ minWidth: `${300 + vendors.length * 220}px` }}>
              <thead>
                <tr>
                  <th className="w-48 sticky left-0 bg-gray-50 z-10">Criteria</th>
                  {vendors.map(q => (
                    <th key={q.id} className="text-center min-w-[200px]">
                      <div>
                        <p>{q.vendors?.company_name}</p>
                        <div className="flex justify-center mt-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} size={10} className={i <= Math.round(q.vendors?.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                          ))}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Item prices */}
                {allItems.map(rfqItem => {
                  const lowest = getItemLowest(rfqItem.product_name);
                  return (
                    <tr key={rfqItem.id}>
                      <td className="sticky left-0 bg-white z-10 font-medium text-xs">{rfqItem.product_name} (per {rfqItem.unit})</td>
                      {vendors.map(q => {
                        const item = q.quotation_items?.find(i => i.product_name === rfqItem.product_name);
                        const price = item?.unit_price;
                        const isLowest = price && Number(price) === lowest;
                        return (
                          <td key={q.id} className={`text-center font-noto ${isLowest ? 'bg-green-50 text-green-700 font-bold' : ''}`}>
                            {price ? (
                              <span className="flex items-center justify-center gap-1">
                                {formatCurrency(price)}
                                {isLowest && <Star size={12} className="text-green-500 fill-green-500" />}
                              </span>
                            ) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Divider */}
                <tr><td colSpan={vendors.length + 1} className="py-1 bg-gray-50" /></tr>

                {/* Subtotal */}
                <tr>
                  <td className="sticky left-0 bg-white z-10 font-semibold">Subtotal</td>
                  {vendors.map(q => <td key={q.id} className="text-center font-noto">{formatCurrency(q.subtotal)}</td>)}
                </tr>
                <tr>
                  <td className="sticky left-0 bg-white z-10 text-gray-500">Tax</td>
                  {vendors.map(q => <td key={q.id} className="text-center font-noto text-gray-500">{formatCurrency(q.tax_amount)} ({q.tax_percentage}%)</td>)}
                </tr>
                <tr>
                  <td className="sticky left-0 bg-white z-10 font-bold text-base">Grand Total</td>
                  {vendors.map(q => {
                    const isLowest = q.total_amount === lowestTotal;
                    return (
                      <td key={q.id} className={`text-center font-fustat text-lg ${isLowest ? 'bg-green-50 text-green-700' : 'text-gray-900'}`}>
                        <span className="flex items-center justify-center gap-1">
                          {formatCurrency(q.total_amount)}
                          {isLowest && <Star size={14} className="text-green-500 fill-green-500" />}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Divider */}
                <tr><td colSpan={vendors.length + 1} className="py-1 bg-gray-50" /></tr>

                {/* Delivery */}
                <tr>
                  <td className="sticky left-0 bg-white z-10 font-medium">Delivery Days</td>
                  {vendors.map(q => {
                    const isLowest = q.delivery_days === lowestDelivery;
                    return (
                      <td key={q.id} className={`text-center font-noto ${isLowest ? 'bg-green-50 text-green-700 font-bold' : ''}`}>
                        <span className="flex items-center justify-center gap-1">
                          {q.delivery_days} days
                          {isLowest && <Star size={12} className="text-green-500 fill-green-500" />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="sticky left-0 bg-white z-10">Payment Terms</td>
                  {vendors.map(q => <td key={q.id} className="text-center text-sm">{q.payment_terms}</td>)}
                </tr>
                <tr>
                  <td className="sticky left-0 bg-white z-10">Validity</td>
                  {vendors.map(q => <td key={q.id} className="text-center">{q.validity_days} days</td>)}
                </tr>

                {/* Action row */}
                <tr>
                  <td className="sticky left-0 bg-white z-10 font-semibold">Action</td>
                  {vendors.map(q => (
                    <td key={q.id} className="text-center py-4">
                      <button
                        onClick={() => handleSelect(q)}
                        className="btn-primary text-sm px-5"
                      >
                        Select & Proceed
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
