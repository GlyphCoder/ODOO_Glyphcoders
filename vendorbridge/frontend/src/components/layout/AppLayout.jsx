import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuthStore } from '../../store/authStore';
import { useNotifications } from '../../hooks/useNotifications';

export function AppLayout({ children }) {
  const { user } = useAuthStore();
  useNotifications(user?.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 px-8 py-6 mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
