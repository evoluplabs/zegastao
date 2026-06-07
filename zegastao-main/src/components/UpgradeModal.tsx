import { X, Check, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UpgradeModalProps {
  reason: 'chat_limit' | 'upload_limit' | 'contract' | 'generic';
  onClose: () => void;
}

const REASONS: Record<UpgradeModalProps['reason'], { title: string; desc: string }> = {
  chat_limit: {
    title: 'Você usou todas as mensagens de hoje',
    desc: 'No plano gratuito você tem 10 mensagens por dia. Assine o Copiloto para 50 mensagens.',
  },
  upload_limit: {
    title: 'Limite de uploads atingido',
    desc: 'No plano gratuito você pode importar 2 extratos por mês. Assine para uploads ilimitados.',
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
  '50 mensagens por dia com o copiloto',
  'Uploads ilimitados de extratos',
  'Insights Sonnet diários',
  'Análise de contratos PDF',
  'Notificações de alertas',
  'Suporte prioritário',
];

export function UpgradeModal({ reason, onClose }: UpgradeModalProps) {
  const { title, desc } = REASONS[reason];

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

        <div className="flex gap-3 px-6 pb-6">
          <Button asChild className="flex-1 gap-2">
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
  );
}
