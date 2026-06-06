import { useAuthStore } from '../store/authStore';

const PERMISSIONS = {
  createRFQ:        ['admin', 'manager', 'procurement_officer'],
  viewRFQs:         ['admin', 'manager', 'procurement_officer', 'vendor'],
  approveRFQ:       ['admin', 'manager'],
  manageVendors:    ['admin', 'manager', 'procurement_officer'],
  deleteVendors:    ['admin'],
  submitQuotation:  ['vendor', 'procurement_officer', 'admin', 'manager'],
  compareQuotations: ['admin', 'manager', 'procurement_officer'],
  generatePO:       ['admin', 'manager', 'procurement_officer'],
  viewPOs:          ['admin', 'manager', 'procurement_officer', 'vendor'],
  generateInvoice:  ['admin', 'manager', 'procurement_officer'],
  viewInvoices:     ['admin', 'manager', 'procurement_officer', 'vendor'],
  sendInvoice:      ['admin', 'manager', 'procurement_officer'],
  viewReports:      ['admin', 'manager', 'procurement_officer'],
  viewLogs:         ['admin', 'manager'],
  manageUsers:      ['admin'],
};

export function useRBAC() {
  const { user } = useAuthStore();
  const can = (permission) => PERMISSIONS[permission]?.includes(user?.role) ?? false;
  return { can, role: user?.role };
}
