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
import { ImpostoRenda } from '@/pages/ImpostoRenda';
import { Referrals } from '@/pages/Referrals';
import { Caixinha } from '@/pages/Caixinha';
import { AdminRoute } from '@/components/AdminRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function App() {
  useAuthListener();

  return (
    <ToastProvider>
      <PWAInstallBanner />
      <Routes>
        {/* Páginas públicas */}
        <Route path="/" element={<ErrorBoundary><Landing /></ErrorBoundary>} />
        <Route path="/welcome" element={<Navigate to="/" replace />} />
        <Route path="/pricing" element={<ErrorBoundary><Pricing /></ErrorBoundary>} />
        <Route path="/empresas" element={<ErrorBoundary><Empresas /></ErrorBoundary>} />
        <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
        <Route path="/onboarding" element={<ErrorBoundary><Onboarding /></ErrorBoundary>} />
        <Route path="/termos" element={<ErrorBoundary><Terms /></ErrorBoundary>} />
        <Route path="/privacidade" element={<ErrorBoundary><PrivacyPolicy /></ErrorBoundary>} />
        <Route path="/ajuda" element={<ErrorBoundary><Help /></ErrorBoundary>} />
        <Route path="/blog" element={<ErrorBoundary><Blog /></ErrorBoundary>} />
        <Route path="/blog/:slug" element={<ErrorBoundary><BlogPost /></ErrorBoundary>} />
        <Route path="/admin" element={<AdminRoute><ErrorBoundary><Admin /></ErrorBoundary></AdminRoute>} />

        {/* App autenticado */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/financas" element={<ErrorBoundary><Financas /></ErrorBoundary>} />
          <Route path="/transactions" element={<ErrorBoundary><Transactions /></ErrorBoundary>} />
          <Route path="/copilot" element={<ErrorBoundary><Copilot /></ErrorBoundary>} />
          <Route path="/journey" element={<ErrorBoundary><Journey /></ErrorBoundary>} />

          {/* Rotas legadas → redirects para nova arquitetura */}
          <Route path="/debts" element={<Navigate to="/financas?tab=debts" replace />} />
          <Route path="/goals" element={<Navigate to="/financas?tab=goals" replace />} />
          <Route path="/rules" element={<Navigate to="/financas?tab=rules" replace />} />
          <Route path="/investments" element={<Navigate to="/financas?tab=investments" replace />} />
          <Route path="/projection" element={<Navigate to="/financas?tab=projection" replace />} />
          <Route path="/documents" element={<Navigate to="/copilot?tab=documentos" replace />} />
          <Route path="/context" element={<Navigate to="/copilot?tab=historico" replace />} />
          <Route path="/upload" element={<ErrorBoundary><UploadPage /></ErrorBoundary>} />
          <Route path="/profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
          <Route path="/ir" element={<ErrorBoundary><ImpostoRenda /></ErrorBoundary>} />
          <Route path="/referrals" element={<ErrorBoundary><Referrals /></ErrorBoundary>} />
          <Route path="/caixinha" element={<ErrorBoundary><Caixinha /></ErrorBoundary>} />
          {FEATURES.ZE_APOSTADOR && <Route path="/apostas" element={<ErrorBoundary><Betting /></ErrorBoundary>} />}
        </Route>
      </Routes>
      <CookieConsent />
    </ToastProvider>
  );
}
