import { Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, authLoading } = useStore();

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Onboarding obrigatório antes de usar o app.
  if (profile && !profile.onboardingDone) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
