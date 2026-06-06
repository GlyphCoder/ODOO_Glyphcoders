import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotificationStore } from '../store/notificationStore';
import api from '../lib/api';

export function useNotifications(userId) {
  const { setNotifications, addNotification } = useNotificationStore();

  useEffect(() => {
    if (!userId) return;

    // Load existing notifications
    api.get('/notifications').then(res => {
      setNotifications(res.data.data || []);
    }).catch(() => {});

    // Subscribe to realtime
    const channel = supabase
      .channel(`notif:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => addNotification(payload.new))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);
}
