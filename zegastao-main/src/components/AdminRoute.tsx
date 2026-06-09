import { Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { isAdmin } from '@/lib/admin';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user.email)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
