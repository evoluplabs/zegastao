import { LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { authActions } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { monthLabel } from '@/lib/utils';

export function TopBar() {
  const profile = useStore((s) => s.profile);

  return (
    <header className="flex items-center justify-between border-b bg-card px-4 md:px-6 py-3">
      <div>
        <p className="text-sm text-muted-foreground capitalize">{monthLabel()}</p>
        <h1 className="text-base font-semibold">
          Olá, {profile?.name || 'amigo'} 👋
        </h1>
      </div>
      <Button variant="ghost" size="sm" onClick={() => authActions.logout()}>
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sair</span>
      </Button>
    </header>
  );
}
