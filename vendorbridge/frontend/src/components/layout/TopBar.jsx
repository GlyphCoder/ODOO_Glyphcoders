import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { toast } from 'sonner';

const breadcrumbMap = {
  '/dashboard': 'Dashboard',
  '/vendors': 'Vendors',
  '/rfqs': 'RFQs',
  '/quotations': 'Quotations',
  '/approvals': 'Approvals',
  '/purchase-orders': 'Purchase Orders',
  '/invoices': 'Invoices',
  '/reports': 'Reports',
  '/activity-logs': 'Activity Logs',
};

export function TopBar() {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [search, setSearch] = useState('');
  const menuRef = useRef(null);

  const pageName = breadcrumbMap[location.pathname] ||
    Object.entries(breadcrumbMap).find(([k]) => location.pathname.startsWith(k))?.[1] || 'VendorBridge';

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <>
      <header className="topbar-wrap fixed top-0 right-0 left-64 h-16 bg-white border-b border-gray-100 z-20 flex items-center justify-between px-6 no-print">
        {/* Breadcrumb */}
        <div>
          <p className="text-xs text-gray-400 font-inter">VendorBridge</p>
          <h1 className="text-base font-schibsted font-semibold text-gray-900">{pageName}</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:flex items-center">
            <Search size={15} className="absolute left-3 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search VendorBridge..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-black focus:ring-2 focus:ring-black/5 outline-none transition-all w-64 font-inter"
            />
          </div>

          {/* Bell */}
          <button
            onClick={() => setShowNotif(true)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Bell size={18} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] flex items-center justify-center rounded-full text-[10px] font-bold font-schibsted"
                style={{ background: '#dc2626', color: '#fff', fontSize: '10px', padding: '0 3px', height: '16px', lineHeight: '16px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: '#0e1311', color: 'rgba(90,225,76,0.89)' }}>
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-schibsted text-gray-700 hidden sm:block">{user?.full_name?.split(' ')[0]}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-100 rounded-2xl shadow-lg py-1.5 z-50 animate-fade-up">
                <div className="px-4 py-2 border-b border-gray-50">
                  <p className="text-sm font-schibsted font-semibold text-gray-800">{user?.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-inter"
                >
                  <User size={15} /> Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-inter"
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification Panel */}
      {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
    </>
  );
}
