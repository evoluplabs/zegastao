import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Zap, ArrowLeft, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { useStore } from '@/store/useStore';
import { useSubscription } from '@/hooks/useSubscription';

type PaidPlan =
  | 'copiloto_monthly'
  | 'copiloto_annual'
  | 'casal_familia_monthly'
  | 'casal_familia_annual';

const createCheckout = httpsCallable<
  { plan: PaidPlan; successUrl: string; failureUrl: string },
  { checkoutUrl: string }
>(functions, 'createMPCheckout');

const FREE_FEATURES = [
  { label: '5 conversas com o Copiloto (sem renovação)', ok: true },
  { label: '1 upload de extrato para testar', ok: true },
  { label: 'Dashboard + Dívidas + Metas ilimitadas', ok: true },
  { label: '1 caixinha para testar', ok: true },
  { label: 'Categorização automática com IA', ok: true },
  { label: 'Mensagens ilimitadas com o Copiloto', ok: false },
  { label: 'Análise de contratos PDF', ok: false },
  { label: 'Modo Casal / Família', ok: false },
];

const COPILOTO_FEATURES = [
  { label: 'Mensagens ilimitadas com o Copiloto', ok: true },
  { label: 'Uploads ilimitados de extratos', ok: true },
  { label: 'Análise de contratos PDF', ok: true },
  { label: 'Insights diários personalizados', ok: true },
  { label: 'Caixinhas ilimitadas + automáticas', ok: true },
  { label: 'Lembretes e gamificação da Caixinha', ok: true },
  { label: 'Notificações push de alertas', ok: true },
  { label: 'Suporte prioritário', ok: true },
];

const CASAL_FEATURES = [
  { label: 'Tudo do Copiloto, para 2 contas', ok: true },
  { label: 'Modo Casal: finanças combinadas', ok: true },
  { label: 'Quem gastou o quê, por pessoa', ok: true },
  { label: 'Caixinha compartilhada do casal', ok: true },
  { label: 'Metas e dívidas do casal juntos', ok: true },
  { label: 'Suporte prioritário', ok: true },
];

const FAQ = [
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. O cancelamento é imediato e você continua com acesso até o fim do período pago.',
  },
  {
    q: 'Quais formas de pagamento?',
    a: 'PIX, cartão de crédito e débito. Processado pelo MercadoPago, a plataforma de pagamentos mais usada no Brasil.',
  },
  {
    q: 'Qual a diferença do plano Casal/Família?',
    a: 'O plano Casal/Família libera o Modo Casal: você vincula a conta do seu parceiro(a), vê as finanças combinadas, sabe quem gastou o quê e podem poupar juntos numa caixinha compartilhada — tudo por menos que duas assinaturas individuais.',
  },
  {
    q: 'Preciso dar dados bancários?',
    a: 'Não. Seus dados bancários ficam no seu banco — você só importa o extrato CSV/PDF. O app nunca acessa sua conta.',
  },
  {
    q: 'E se eu já estiver no limite do gratuito?',
    a: 'Após a assinatura, os limites são desbloqueados imediatamente, sem precisar reiniciar o app.',
  },
];

function Feature({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {ok
        ? <Check className="h-4 w-4 shrink-0 text-success" />
        : <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      }
      <span className={ok ? '' : 'text-muted-foreground/60 line-through'}>{label}</span>
    </li>
  );
}

export function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<PaidPlan | null>(null);
  const user = useStore((s) => s.user);
  const { plan, sub } = useSubscription();

  async function handleCheckout(planId: PaidPlan) {
    if (!user) { window.location.href = '/login'; return; }
    setLoading(planId);
    try {
      const res = await createCheckout({
        plan: planId,
        successUrl: `${window.location.origin}/dashboard?subscribed=1`,
        failureUrl: `${window.location.origin}/pricing?error=1`,
      });
      window.location.href = res.data.checkoutUrl;
    } catch {
      alert('Erro ao iniciar pagamento. Tente novamente.');
    } finally {
      setLoading(null);
    }
  }

  const copilotoPlan: PaidPlan = annual ? 'copiloto_annual' : 'copiloto_monthly';
  const casalPlan: PaidPlan = annual ? 'casal_familia_annual' : 'casal_familia_monthly';
  const copilotoPrice = annual ? 'R$ 14,90' : 'R$ 19,90';
  const casalPrice = annual ? 'R$ 23,90' : 'R$ 29,90';

  const isCopiloto = plan === 'copiloto_monthly' || plan === 'copiloto_annual';
  const isCasal = plan === 'casal_familia_monthly' || plan === 'casal_familia_annual';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Subscriber banner */}
        {plan !== 'free' && (
          <div className="mb-8 rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-5">
            <p className="font-semibold text-green-700 dark:text-green-300 text-base">
              ✅ Você já é assinante
            </p>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              Acesso ativo{sub.currentPeriodEnd ? ` até ${sub.currentPeriodEnd.toDate().toLocaleDateString('pt-BR')}` : ''} — gerencie no seu perfil.
            </p>
            <Link
              to="/dashboard"
              className="mt-3 inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              Ver meu painel
            </Link>
          </div>
        )}

        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
            <Sparkles className="h-3 w-3" />
            Planos simples, sem pegadinha
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Quanto custa sair das dívidas?
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Comece grátis. Assine quando estiver pronto para ter o Zé Gastão do seu lado de verdade.
          </p>

          {/* Toggle mensal/anual */}
          <div className="inline-flex items-center gap-3 mt-6 rounded-xl border bg-secondary p-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
                !annual ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-2',
                annual ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Anual
              <span className="rounded-full bg-success/15 border border-success/20 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                economize
              </span>
            </button>
          </div>
        </div>

        {/* Cards de plano */}
        <div className="grid gap-6 md:grid-cols-3 mb-12 items-start">
          {/* Gratuito */}
          <div className="rounded-2xl border bg-card p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Gratuito</h2>
              <p className="text-sm text-muted-foreground">Para começar a organizar</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-muted-foreground ml-1">/mês</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f) => <Feature key={f.label} {...f} />)}
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <Link to={user ? '/dashboard' : '/login'}>
                {plan === 'free' ? (user ? 'Continuar grátis' : 'Começar grátis') : 'Plano gratuito'}
              </Link>
            </Button>
          </div>

          {/* Copiloto — destacado */}
          <div className="relative rounded-2xl border-2 border-primary bg-card p-7">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                <Zap className="h-3 w-3" />
                Mais popular
              </span>
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Copiloto</h2>
              <p className="text-sm text-muted-foreground">Para quem quer resultados de verdade</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">{copilotoPrice}</span>
                <span className="text-muted-foreground ml-1">/mês</span>
              </div>
              {annual && (
                <p className="text-xs text-success mt-1">cobrado R$ 178,80/ano · economize R$ 60</p>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              {COPILOTO_FEATURES.map((f) => <Feature key={f.label} {...f} />)}
            </ul>
            {isCopiloto || isCasal ? (
              <Button className="w-full" disabled>Plano ativo ✓</Button>
            ) : (
              <Button
                className="w-full gap-2"
                loading={loading === copilotoPlan}
                onClick={() => handleCheckout(copilotoPlan)}
              >
                <Zap className="h-4 w-4" />
                Assinar com PIX ou Cartão
              </Button>
            )}
          </div>

          {/* Casal / Família */}
          <div className="relative rounded-2xl border bg-card p-7">
            <div className="mb-6">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-1">
                <Users className="h-5 w-5 text-primary" />
                Casal/Família
              </h2>
              <p className="text-sm text-muted-foreground">Organizem as contas juntos</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">{casalPrice}</span>
                <span className="text-muted-foreground ml-1">/mês</span>
              </div>
              {annual ? (
                <p className="text-xs text-success mt-1">cobrado R$ 287,00/ano</p>
              ) : (
                <p className="text-xs text-success mt-1">2 contas por menos que duas assinaturas</p>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              {CASAL_FEATURES.map((f) => <Feature key={f.label} {...f} />)}
            </ul>
            {isCasal ? (
              <Button className="w-full" disabled>Plano ativo ✓</Button>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/5"
                loading={loading === casalPlan}
                onClick={() => handleCheckout(casalPlan)}
              >
                <Users className="h-4 w-4" />
                Assinar Casal/Família
              </Button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-6">Perguntas frequentes</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-xl border bg-card p-5">
                <p className="font-semibold text-sm mb-1.5">{item.q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
