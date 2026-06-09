import { useState } from 'react';
import { LogOut, Crown, HelpCircle, MessageSquarePlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { authActions } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { monthLabel } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { FeedbackModal } from '@/components/FeedbackModal';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function TopBar() {
  const profile = useStore((s) => s.profile);
  const { isPaid, plan } = useSubscription();
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 md:px-6 py-3 sticky top-0 z-30">
        <div>
          <p className="text-xs text-muted-foreground capitalize">{monthLabel()}</p>
          <h1 className="text-sm font-semibold">
            {getGreeting()}, {profile?.name || 'amigo'} 👋
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          {!isPaid && (
            <Button asChild variant="outline" size="sm" className="gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50">
              <Link to="/pricing">
                <Crown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Assinar</span>
              </Link>
            </Button>
          )}
          {isPaid && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Crown className="h-3 w-3" />
              {plan === 'copiloto_annual' ? 'Anual' : 'Copiloto'}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFeedback(true)}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            title="Enviar feedback"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Feedback</span>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" title="Ajuda">
            <Link to="/ajuda">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Ajuda</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => authActions.logout()} className="gap-1.5">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}
