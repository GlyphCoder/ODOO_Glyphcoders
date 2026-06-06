import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { supabase } from './lib/supabase';

// Auth pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';

// Protected pages
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import RFQs from './pages/RFQs';
import RFQCreate from './pages/RFQCreate';
import RFQDetail from './pages/RFQDetail';
import Quotations from './pages/Quotations';
import QuotationDetail from './pages/QuotationDetail';
import QuotationSubmit from './pages/QuotationSubmit';
import QuotationCompare from './pages/QuotationCompare';
import Approvals from './pages/Approvals';
import ApprovalDetail from './pages/ApprovalDetail';
import PurchaseOrders from './pages/PurchaseOrders';
import PODetail from './pages/PODetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Reports from './pages/Reports';
import ActivityLogs from './pages/ActivityLogs';
import LandingPage from './pages/LandingPage';

// Route guards
import { ProtectedRoute, RoleRoute } from './routes/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const internalRoles = ['admin', 'manager', 'procurement_officer'];
const approvalRoles = ['admin', 'manager'];
const logRoles = ['admin', 'manager'];

function AppAuthInitializer() {
  const { initialize, setSession, setUser } = useAuthStore();

  useEffect(() => {
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setSession(session);
        setUser({ ...session.user, ...profile });
      } else {
        setSession(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppAuthInitializer />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              borderRadius: '12px',
            },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/" element={<LandingPage />} />

          {/* Vendor: quotation submission (public with auth check inside) */}
          <Route path="/quotations/submit/:rfq_id" element={<QuotationSubmit />} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/vendors" element={<ProtectedRoute><RoleRoute allowedRoles={internalRoles}><Vendors /></RoleRoute></ProtectedRoute>} />
          <Route path="/rfqs" element={<ProtectedRoute><RFQs /></ProtectedRoute>} />
          <Route path="/rfqs/new" element={<ProtectedRoute><RoleRoute allowedRoles={internalRoles}><RFQCreate /></RoleRoute></ProtectedRoute>} />
          <Route path="/rfqs/:id" element={<ProtectedRoute><RFQDetail /></ProtectedRoute>} />
          <Route path="/rfqs/:rfq_id/compare" element={<ProtectedRoute><RoleRoute allowedRoles={internalRoles}><QuotationCompare /></RoleRoute></ProtectedRoute>} />
          <Route path="/quotations" element={<ProtectedRoute><Quotations /></ProtectedRoute>} />
          <Route path="/quotations/:id" element={<ProtectedRoute><QuotationDetail /></ProtectedRoute>} />
          <Route path="/approvals" element={<ProtectedRoute><RoleRoute allowedRoles={approvalRoles}><Approvals /></RoleRoute></ProtectedRoute>} />
          <Route path="/approvals/:id" element={<ProtectedRoute><RoleRoute allowedRoles={internalRoles}><ApprovalDetail /></RoleRoute></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
          <Route path="/purchase-orders/:id" element={<ProtectedRoute><PODetail /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
          <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><RoleRoute allowedRoles={internalRoles}><Reports /></RoleRoute></ProtectedRoute>} />
          <Route path="/activity-logs" element={<ProtectedRoute><RoleRoute allowedRoles={logRoles}><ActivityLogs /></RoleRoute></ProtectedRoute>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
