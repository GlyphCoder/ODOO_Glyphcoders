import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { formatRelativeTime, getStatusLabel } from '../lib/utils';
import api from '../lib/api';

const actionColors = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  deleted: 'bg-red-100 text-red-700',
  sent: 'bg-purple-100 text-purple-700',
  published: 'bg-indigo-100 text-indigo-700',
};

export default function ActivityLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => api.get('/auth/activity-logs').then(r => r.data.data),
    refetchInterval: 15000,
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <h1 className="page-title">Activity Logs</h1>

        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">{Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : !data || data.length === 0 ? (
            <div className="empty-state">
              <Activity size={40} className="text-gray-200" />
              <p className="text-gray-400 font-inter">No activity yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold bg-gray-100 text-gray-600">
                    {log.profiles?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-schibsted font-semibold text-gray-800 text-sm">
                        {log.profiles?.full_name || 'System'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold font-schibsted ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                      {log.entity_label && (
                        <span className="text-xs text-gray-500 font-noto font-semibold">{log.entity_label}</span>
                      )}
                    </div>
                    {log.description && (
                      <p className="text-sm text-gray-500 font-inter mt-0.5">{log.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap font-inter">{formatRelativeTime(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
