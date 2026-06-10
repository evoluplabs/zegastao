import { useEffect, useRef, useState } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ToastProvider } from '@/components/ui/Toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { CookieConsent } from '@/components/CookieConsent';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      // Show banner after 30s of use
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-banner-dismissed');
        if (!dismissed) setShow(true);
      }, 30000);
      return () => clearTimeout(timer);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem('pwa-banner-dismissed', '1');
  }

  async function install() {
    if (!promptRef.current) return;
    await promptRef.current.prompt();
    const { outcome } = await promptRef.current.userChoice;
    if (outcome === 'accepted') setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
      <div className="flex items-center gap-3 rounded-2xl border bg-card shadow-lg px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">Z</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Instale o Zé Gastão</p>
          <p className="text-xs text-muted-foreground">Acesso rápido na tela inicial</p>
        </div>
        <button onClick={install} className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1">
          <Download className="h-3 w-3" /> Instalar
        </button>
        <button onClick={dismiss} className="shrink-0 rounded-lg p-1.5 hover:bg-accent transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
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
      <PWAInstallBanner />
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
