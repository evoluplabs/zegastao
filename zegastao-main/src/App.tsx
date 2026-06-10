import { Navigate, Routes, Route } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ToastProvider } from '@/components/ui/Toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { CookieConsent } from '@/components/CookieConsent';
import { Login } from '@/pages/Login';
import { Onboarding } from '@/pages/Onboarding';
import { Dashboard } from '@/pages/Dashboard';
import { Financas } from '@/pages/Financas';
import { Transactions } from '@/pages/Transactions';
import { Copilot } from '@/pages/Copilot';
import { Journey } from '@/pages/Journey';
import { UploadPage } from '@/pages/Upload';
import { Landing } from '@/pages/Landing';
import { Betting } from '@/pages/Betting';
import { FEATURES } from '@/lib/features';
import { Pricing } from '@/pages/Pricing';
import { Empresas } from '@/pages/Empresas';
import { Terms } from '@/pages/Terms';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { Help } from '@/pages/Help';
import { Profile } from '@/pages/Profile';
import { Blog } from '@/pages/Blog';
import { BlogPost } from '@/pages/BlogPost';
import { Admin } from '@/pages/Admin';
import { AdminRoute } from '@/components/AdminRoute';

export default function App() {
  useAuthListener();

  return (
    <ToastProvider>
      <Routes>
        {/* Páginas públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/welcome" element={<Navigate to="/" replace />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/empresas" element={<Empresas />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/termos" element={<Terms />} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/ajuda" element={<Help />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

        {/* App autenticado */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/financas" element={<Financas />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/copilot" element={<Copilot />} />
          <Route path="/journey" element={<Journey />} />

          {/* Rotas legadas → redirects para nova arquitetura */}
          <Route path="/debts" element={<Navigate to="/financas?tab=debts" replace />} />
          <Route path="/goals" element={<Navigate to="/financas?tab=goals" replace />} />
          <Route path="/rules" element={<Navigate to="/financas?tab=rules" replace />} />
          <Route path="/investments" element={<Navigate to="/financas?tab=investments" replace />} />
          <Route path="/projection" element={<Navigate to="/financas?tab=projection" replace />} />
          <Route path="/documents" element={<Navigate to="/copilot?tab=documentos" replace />} />
          <Route path="/context" element={<Navigate to="/copilot?tab=historico" replace />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/profile" element={<Profile />} />
          {FEATURES.ZE_APOSTADOR && <Route path="/apostas" element={<Betting />} />}
        </Route>
      </Routes>
      <CookieConsent />
    </ToastProvider>
  );
}
