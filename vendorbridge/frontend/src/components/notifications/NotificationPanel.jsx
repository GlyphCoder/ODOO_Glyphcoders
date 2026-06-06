import { useNavigate } from 'react-router-dom';
import { X, Bell, FileText, CheckCircle, Receipt, Info, Package } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { formatRelativeTime } from '../../lib/utils';
import api from '../../lib/api';
import { toast } from 'sonner';

const typeIcons = {
  rfq: FileText,
  approval: CheckCircle,
  invoice: Receipt,
  quotation: Package,
  system: Info,
};

const entityRoutes = {
  rfq: '/rfqs',
  approval: '/approvals',
  invoice: '/invoices',
  purchase_order: '/purchase-orders',
  quotation: '/quotations',
};

export function NotificationPanel({ onClose }) {
  const { notifications, markAllRead, markRead, removeNotification } = useNotificationStore();
  const navigate = useNavigate();

  const today = notifications.filter(n => {
    const d = new Date(n.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const earlier = notifications.filter(n => {
    const d = new Date(n.created_at);
    const now = new Date();
    return d.toDateString() !== now.toDateString();
  });

  const handleMarkAll = async () => {
    try {
      await api.put('/notifications/read-all');
      markAllRead();
    } catch { toast.error('Failed to mark all read'); }
  };

  const handleClick = async (notif) => {
    if (!notif.is_read) {
      await api.put(`/notifications/${notif.id}/read`).catch(() => {});
      markRead(notif.id);
    }
    const route = entityRoutes[notif.entity_type];
    if (route && notif.entity_id) navigate(`${route}/${notif.entity_id}`);
    onClose();
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await api.delete(`/notifications/${id}`).catch(() => {});
    removeNotification(id);
  };

  const NotifItem = ({ n }) => {
    const Icon = typeIcons[n.type] || Bell;
    return (
      <div
        onClick={() => handleClick(n)}
        className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${!n.is_read ? 'bg-blue-50/30' : ''}`}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.is_read ? 'bg-gray-100' : 'bg-blue-100'}`}>
          <Icon size={16} className={n.is_read ? 'text-gray-500' : 'text-blue-600'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-inter truncate ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
            {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(n.created_at)}</p>
        </div>
        <button
          onClick={(e) => handleDelete(e, n.id)}
          className="text-gray-300 hover:text-gray-500 shrink-0 mt-1"
        >
          <X size={14} />
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="sheet-overlay animate-fade-up" onClick={onClose} style={{ animationDuration: '0.15s' }} />
      <div className="sheet-panel animate-slide-right" style={{ width: '380px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-gray-700" />
            <h2 className="font-schibsted font-semibold text-gray-900 text-base">Notifications</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleMarkAll} className="text-xs text-blue-600 hover:text-blue-700 font-inter">Mark all read</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-full pb-20">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <Bell size={40} className="text-gray-300" />
              <p className="text-gray-400 font-inter">No notifications yet</p>
            </div>
          ) : (
            <>
              {today.length > 0 && (
                <>
                  <p className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 font-schibsted">Today</p>
                  {today.map(n => <NotifItem key={n.id} n={n} />)}
                </>
              )}
              {earlier.length > 0 && (
                <>
                  <p className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 font-schibsted">Earlier</p>
                  {earlier.map(n => <NotifItem key={n.id} n={n} />)}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
