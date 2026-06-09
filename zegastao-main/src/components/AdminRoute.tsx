import { Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { isAdmin } from '@/lib/admin';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user);
  const authLoading = useStore((s) => s.authLoading);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-1 w-24 rounded bg-primary/30 animate-pulse" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user.email)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
