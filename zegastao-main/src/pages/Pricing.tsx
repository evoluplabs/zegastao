import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Zap, ArrowLeft, Sword, Users, Shield } from 'lucide-react';
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
  { label: '5 consultas ao Sábio (sem renovação)', ok: true },
  { label: '1 upload de extrato para testar', ok: true },
  { label: 'Mapa de Bosses + Metas ilimitadas', ok: true },
  { label: '1 Cofre da Guilda para testar', ok: true },
  { label: 'Categorização automática com IA', ok: true },
  { label: 'Consultas ilimitadas ao Sábio', ok: false },
  { label: 'Análise de contratos PDF', ok: false },
  { label: 'Modo Party / Casal', ok: false },
];

const COPILOTO_FEATURES = [
  { label: 'Consultas ilimitadas ao Sábio', ok: true },
  { label: 'Uploads ilimitados de extratos', ok: true },
  { label: 'Análise de contratos PDF', ok: true },
  { label: 'Insights diários personalizados', ok: true },
  { label: 'Cofres ilimitados + automáticos', ok: true },
  { label: 'Lembretes e streak do Cofre', ok: true },
  { label: 'Notificações push de alertas', ok: true },
  { label: 'Suporte prioritário', ok: true },
];

const CASAL_FEATURES = [
  { label: 'Tudo do Aventureiro, para 2 contas', ok: true },
  { label: 'Modo Party: finanças combinadas', ok: true },
  { label: 'Quem gastou o quê, por membro', ok: true },
  { label: 'Cofre compartilhado da Party', ok: true },
  { label: 'Metas e Bosses do casal juntos', ok: true },
  { label: 'Suporte prioritário', ok: true },
];

const FAQ = [
  { q: 'Posso cancelar quando quiser?', a: 'Sim. O cancelamento é imediato e você continua com acesso até o fim do período pago.' },
  { q: 'Quais formas de pagamento?', a: 'PIX, cartão de crédito e débito. Processado pelo MercadoPago, a plataforma mais usada no Brasil.' },
  { q: 'Qual a diferença do plano Guilda?', a: 'O plano Guilda libera o Modo Party: você vincula a conta do seu parceiro(a), vê as finanças combinadas, sabe quem gastou o quê e podem poupar juntos num Cofre compartilhado — tudo por menos que duas assinaturas individuais.' },
  { q: 'Preciso dar dados bancários?', a: 'Não. Seus dados bancários ficam no seu banco — você só importa o extrato CSV/PDF. O app nunca acessa sua conta diretamente.' },
  { q: 'E se eu já estiver no limite do gratuito?', a: 'Após a assinatura, os limites são desbloqueados imediatamente, sem precisar reiniciar o app.' },
];

function Feature({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {ok
        ? <Check className="h-4 w-4 shrink-0 text-green-400" />
        : <X className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      }
      <span className={ok ? 'text-foreground/80' : 'text-muted-foreground/50 line-through'}>{label}</span>
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
      {/* Ambient grid */}
      <div className="fixed inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #10b98115 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative mx-auto max-w-6xl px-4 py-12">
        {/* Subscriber banner */}
        {plan !== 'free' && (
          <div className="mb-8 rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-5">
            <p className="font-bold text-green-300 text-base">🏆 Você já é um aventureiro ativo!</p>
            <p className="text-sm text-green-400/70 mt-1">
              Acesso ativo{sub.currentPeriodEnd ? ` até ${sub.currentPeriodEnd.toDate().toLocaleDateString('pt-BR')}` : ''} — gerencie no seu perfil.
            </p>
            <Link to="/dashboard" className="mt-3 inline-flex items-center rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-green-400 transition-colors">
              ⚔️ Voltar ao Castelo
            </Link>
          </div>
        )}

        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground/70 hover:text-foreground/90 transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400 mb-4">
            <Sword className="h-3 w-3" /> Escolha sua Classe
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-foreground">
            Qual aventureiro você quer ser?
          </h1>
          <p className="text-muted-foreground/70 max-w-md mx-auto">
            Comece como Recruta. Evolua quando estiver pronto para ter o Sábio do seu lado de verdade.
          </p>

          {/* Toggle mensal/anual */}
          <div className="inline-flex items-center gap-3 mt-6 rounded-xl border border-border bg-card p-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
                !annual ? 'bg-background shadow-sm text-foreground border border-border' : 'text-muted-foreground/70 hover:text-foreground/80'
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-2',
                annual ? 'bg-background shadow-sm text-foreground border border-border' : 'text-muted-foreground/70 hover:text-foreground/80'
              )}
            >
              Anual
              <span className="rounded-full bg-green-500/15 border border-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
                economize
              </span>
            </button>
          </div>
        </div>

        {/* Cards de classe */}
        <div className="grid gap-6 md:grid-cols-3 mb-12 items-start">
          {/* Recruta — Free */}
          <div className="rounded-2xl border border-border bg-card p-7">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-border/40 bg-secondary/80/30 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">T1</span>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-extrabold mb-1 text-foreground">Recruta</h2>
              <p className="text-sm text-muted-foreground/70">Para começar a organizar</p>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-foreground">R$ 0</span>
                <span className="text-muted-foreground/70 ml-1">/mês</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f) => <Feature key={f.label} {...f} />)}
            </ul>
            <Button variant="outline" className="w-full border-border text-foreground/80 hover:bg-secondary hover:text-foreground" asChild>
              <Link to={user ? '/dashboard' : '/login'}>
                {plan === 'free' ? (user ? 'Continuar como Recruta' : '⚔️ Criar Personagem') : 'Plano Recruta'}
              </Link>
            </Button>
          </div>

          {/* Aventureiro — Copiloto — destacado */}
          <div className="relative rounded-2xl border-2 border-green-500/50 bg-card p-7 shadow-lg shadow-green-500/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-stone-950 shadow-sm">
                <Zap className="h-3 w-3" /> Mais popular
              </span>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-green-500/40 bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-400">T2</span>
              <Sword className="h-4 w-4 text-green-400" />
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-extrabold mb-1 text-foreground">Aventureiro</h2>
              <p className="text-sm text-muted-foreground/70">Para quem quer resultados de verdade</p>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-green-400">{copilotoPrice}</span>
                <span className="text-muted-foreground/70 ml-1">/mês</span>
              </div>
              {annual && (
                <p className="text-xs text-green-400 mt-1">cobrado R$ 178,80/ano · economize R$ 60</p>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              {COPILOTO_FEATURES.map((f) => <Feature key={f.label} {...f} />)}
            </ul>
            {isCopiloto || isCasal ? (
              <Button className="w-full bg-green-500 text-stone-950 font-bold" disabled>Classe ativa ✓</Button>
            ) : (
              <Button
                className="w-full gap-2 bg-green-500 hover:bg-green-400 text-stone-950 font-bold"
                loading={loading === copilotoPlan}
                onClick={() => handleCheckout(copilotoPlan)}
              >
                <Zap className="h-4 w-4" />
                Evoluir com PIX ou Cartão
              </Button>
            )}
          </div>

          {/* Guilda — Casal/Família */}
          <div className="relative rounded-2xl border border-border bg-card p-7">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">T3</span>
              <Users className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mb-6">
              <h2 className="flex items-center gap-2 text-xl font-extrabold mb-1 text-foreground">
                Guilda
              </h2>
              <p className="text-sm text-muted-foreground/70">Organizem as contas juntos (Party)</p>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-amber-400">{casalPrice}</span>
                <span className="text-muted-foreground/70 ml-1">/mês</span>
              </div>
              {annual ? (
                <p className="text-xs text-amber-400 mt-1">cobrado R$ 287,00/ano</p>
              ) : (
                <p className="text-xs text-amber-400 mt-1">2 contas por menos que duas assinaturas</p>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              {CASAL_FEATURES.map((f) => <Feature key={f.label} {...f} />)}
            </ul>
            {isCasal ? (
              <Button className="w-full border-amber-500/40 text-amber-400" variant="outline" disabled>Classe ativa ✓</Button>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                loading={loading === casalPlan}
                onClick={() => handleCheckout(casalPlan)}
              >
                <Users className="h-4 w-4" />
                Entrar na Guilda
              </Button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-6 text-foreground">— Perguntas da Taverna —</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-xl border border-border bg-card p-5">
                <p className="font-semibold text-sm mb-1.5 text-foreground/90">{item.q}</p>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
