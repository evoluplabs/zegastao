import { useState } from 'react';
import { Crown, HelpCircle, MessageSquarePlus, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { monthLabel } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { FeedbackModal } from '@/components/FeedbackModal';

function AvatarChip({ name }: { name?: string }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('')
    : '?';
  return (
    <Link
      to="/profile"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-xs font-bold text-primary hover:bg-primary/25 transition-colors shrink-0"
      title="Meu perfil"
    >
      {initials}
    </Link>
  );
}

function planLabel(plan: string): string {
  if (plan === 'copiloto_annual') return 'Anual';
  if (plan === 'casal_familia_monthly' || plan === 'casal_familia_annual') return 'Casal';
  return 'Copiloto';
}

export function TopBar() {
  const profile = useStore((s) => s.profile);
  const { isPaid, plan, isTrialing, trialDaysLeft } = useSubscription();
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 md:px-6 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <Link to="/dashboard" className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">Z</Link>
          <div>
            <p className="text-sm font-semibold leading-tight">Zé Gastão</p>
            <p className="text-[10px] text-muted-foreground capitalize leading-tight">{monthLabel()}</p>
          </div>
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
          {isPaid && isTrialing && (
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
              title="Você está no teste grátis"
            >
              <Crown className="h-3 w-3" />
              Teste — {trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'}
            </Link>
          )}
          {isPaid && !isTrialing && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Crown className="h-3 w-3" />
              {planLabel(plan)}
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
          <AvatarChip name={profile?.name} />
        </div>
      </header>
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}
