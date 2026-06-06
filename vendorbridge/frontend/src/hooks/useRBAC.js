import { useAuthStore } from '../store/authStore';

const PERMISSIONS = {
  createRFQ:        ['admin', 'manager', 'procurement_officer'],
  approveRFQ:       ['admin', 'manager'],
  manageVendors:    ['admin', 'manager', 'procurement_officer'],
  deleteVendors:    ['admin'],
  submitQuotation:  ['vendor', 'procurement_officer', 'admin', 'manager'],
  compareQuotations: ['admin', 'manager', 'procurement_officer'],
  generatePO:       ['admin', 'manager', 'procurement_officer'],
  generateInvoice:  ['admin', 'manager', 'procurement_officer'],
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
