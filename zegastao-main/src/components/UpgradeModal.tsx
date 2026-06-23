import { useState } from 'react';
import { X, Check, Zap, ArrowRight, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/Toast';

const startTrialFn = httpsCallable<Record<string, never>, { ok: boolean; trialEndsAt: number }>(
  functions,
  'startTrial'
);

interface UpgradeModalProps {
  reason: 'chat_limit' | 'chat_lifetime' | 'upload_limit' | 'contract' | 'generic';
  onClose: () => void;
}

const REASONS: Record<UpgradeModalProps['reason'], { title: string; desc: string }> = {
  chat_lifetime: {
    title: 'Suas 5 mensagens gratuitas foram usadas',
    desc: 'Assine o Copiloto para conversar sem limite sobre suas finanças.',
  },
  chat_limit: {
    title: 'Você usou todas as mensagens de hoje',
    desc: 'No plano gratuito você tem mensagens limitadas. Assine o Copiloto para acesso ilimitado.',
  },
  upload_limit: {
    title: 'Limite de uploads atingido',
    desc: 'No plano gratuito você pode importar 1 extrato. Assine para uploads ilimitados.',
  },
  contract: {
    title: 'Análise de contratos é premium',
    desc: 'O Copiloto analisa seus contratos PDF com IA e encontra cláusulas abusivas. Feature exclusiva do plano pago.',
  },
  generic: {
    title: 'Desbloqueie o Copiloto completo',
    desc: 'Tenha acesso ilimitado a todos os recursos do seu copiloto financeiro.',
  },
};

const FEATURES = [
  'Mensagens ilimitadas com o copiloto',
  'Uploads ilimitados de extratos',
  'Insights diários personalizados',
  'Análise de contratos PDF',
  'Notificações de alertas',
  'Suporte prioritário',
];

// Preview de resposta do copilot (para o modal de chat_lifetime)
const CHAT_PREVIEW = `"Com base nas suas dívidas, recomendo pagar primeiro o cartão de crédito (juros mais altos). Pagando R$200 a mais por mês, você quita 2 meses antes e economiza ~R$800 em juros. Quer que eu monte o plano semana a semana?"`;

export function UpgradeModal({ reason, onClose }: UpgradeModalProps) {
  const { title, desc } = REASONS[reason];
  const { trialUsed, isPaid } = useSubscription();
  const { toast } = useToast();
  const [startingTrial, setStartingTrial] = useState(false);
  const canTrial = !isPaid && !trialUsed;

  async function handleStartTrial() {
    setStartingTrial(true);
    try {
      await startTrialFn({});
      toast('🎉 Teste grátis ativado! 7 dias com tudo liberado.');
      onClose();
    } catch {
      toast('Não foi possível iniciar o teste. Tente novamente.', 'error');
    } finally {
      setStartingTrial(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-md animate-slide-up">
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Plano Copiloto</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-4">
          <h2 className="text-lg font-bold mb-1">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
        </div>

        {reason === 'chat_lifetime' && (
          <div className="px-6 pb-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-primary mb-2">O copiloto responderia:</p>
              <p className="text-sm text-foreground leading-relaxed italic">{CHAT_PREVIEW}</p>
              <div className="mt-2 h-6 rounded bg-secondary/60 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground font-medium">continua no plano pago…</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 pb-4">
          <div className="rounded-xl border bg-primary/5 border-primary/20 p-4">
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-bold text-primary">R$ 19,90</span>
              <span className="text-sm text-muted-foreground">/mês</span>
              <span className="ml-2 rounded-full bg-success/10 border border-success/20 px-2 py-0.5 text-xs font-medium text-success">
                Ou R$ 14,90/mês no anual
              </span>
            </div>
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-3">
          {canTrial && (
            <Button className="w-full gap-2" loading={startingTrial} onClick={handleStartTrial}>
              <Gift className="h-4 w-4" />
              Testar 7 dias grátis
            </Button>
          )}
          <div className="flex gap-3">
            <Button
              asChild
              variant={canTrial ? 'outline' : 'default'}
              className="flex-1 gap-2"
            >
              <Link to="/pricing" onClick={onClose}>
                Ver planos completos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" onClick={onClose} className="shrink-0">
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
