import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, FileText, MessageSquare, CheckCircle,
  ShoppingCart, Receipt, BarChart2, Activity, LogOut, Boxes,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useRBAC } from '../../hooks/useRBAC';
import { getStatusLabel } from '../../lib/utils';
import { toast } from 'sonner';

const navItems = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vendors',         icon: Building2,        label: 'Vendors',         perm: 'manageVendors' },
  { to: '/rfqs',            icon: FileText,         label: 'RFQs' },
  { to: '/quotations',      icon: MessageSquare,    label: 'Quotations' },
  { to: '/approvals',       icon: CheckCircle,      label: 'Approvals',       perm: 'approveRFQ' },
  { to: '/purchase-orders', icon: ShoppingCart,     label: 'Purchase Orders', perm: 'generatePO' },
  { to: '/invoices',        icon: Receipt,          label: 'Invoices',        perm: 'generateInvoice' },
  { to: '/reports',         icon: BarChart2,        label: 'Reports',         perm: 'viewReports' },
  { to: '/activity-logs',   icon: Activity,         label: 'Activity Logs',   perm: 'viewLogs' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { can } = useRBAC();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const visibleItems = navItems.filter(item => !item.perm || can(item.perm));

  return (
    <aside className="w-64 min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-30" style={{ background: '#0e1311' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(90,225,76,0.89)' }}>
          <Boxes size={18} className="text-[#0e1311]" strokeWidth={2.5} />
        </div>
        <span className="font-schibsted font-semibold text-white text-lg tracking-tight">VendorBridge</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive || (to !== '/dashboard' && window.location.pathname.startsWith(to)) ? 'active' : ''}`
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 border-t border-white/5 pt-4">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: 'rgba(90,225,76,0.20)', color: 'rgba(90,225,76,0.89)' }}>
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-schibsted font-medium truncate">{user?.full_name || 'User'}</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-schibsted"
              style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.6)' }}>
              {getStatusLabel(user?.role)}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-schibsted transition-colors duration-250"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
