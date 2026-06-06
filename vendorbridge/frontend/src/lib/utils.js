import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function daysUntil(date) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = Math.ceil((d - now) / 86400000);
  return diff;
}

export function getStatusBadgeClass(status) {
  const map = {
    active: 'badge-green', approved: 'badge-green', accepted: 'badge-green', completed: 'badge-green', paid: 'badge-green', open: 'badge-green',
    inactive: 'badge-red', rejected: 'badge-red', cancelled: 'badge-red', overdue: 'badge-red',
    pending: 'badge-amber', under_review: 'badge-amber', sent: 'badge-amber', submitted: 'badge-amber', acknowledged: 'badge-amber',
    draft: 'badge-gray', closed: 'badge-gray', generated: 'badge-gray', withdrawn: 'badge-gray',
  };
  return map[status] || 'badge-gray';
}

export function getStatusLabel(status) {
  const map = {
    procurement_officer: 'Procurement Officer',
    under_review: 'Under Review',
    generated: 'Generated',
    withdrawn: 'Withdrawn',
  };
  return map[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '—');
}

export const VENDOR_CATEGORIES = [
  'IT Services', 'Office Supplies', 'Manufacturing', 'Logistics',
  'Furniture', 'Marketing', 'Legal', 'Finance', 'Other',
];
