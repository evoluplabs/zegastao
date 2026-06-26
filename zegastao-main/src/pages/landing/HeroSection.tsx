import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingDown, AlertTriangle, Clock, CalendarCheck2, Wallet, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

function DashboardMockup() {
  return (
    <div className="perspective-wrap w-full max-w-lg mx-auto">
      <div className="tilt-card animate-float rounded-2xl border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/60">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">Zé Gastão · Dashboard</span>
          <div className="w-14" />
        </div>

        <div className="p-4 space-y-3">
          {/* Hero Row: Saldo Total + Receitas + Despesas */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border bg-background p-2">
              <div className="flex items-center gap-1 mb-0.5">
                <Wallet className="h-2.5 w-2.5 text-muted-foreground" />
                <p className="text-[8px] text-muted-foreground uppercase tracking-wide">Saldo total</p>
              </div>
              <p className="text-[11px] font-bold text-green-600">R$ 36.218</p>
            </div>
            <div className="rounded-lg border bg-background p-2">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">Receitas</p>
              <p className="text-[11px] font-bold text-green-600">R$ 8.546</p>
            </div>
            <div className="rounded-lg border bg-background p-2">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">Despesas</p>
              <p className="text-[11px] font-bold text-red-500">-R$ 4.898</p>
            </div>
          </div>

          {/* Vencidos / Vencendo / Futuro */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-2">
              <div className="flex items-center gap-1 mb-0.5">
                <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                <p className="text-[8px] font-semibold text-red-600">Vencidos</p>
              </div>
              <p className="text-[9px] text-muted-foreground mb-1">Passados</p>
              <p className="text-[11px] font-bold text-red-600">R$ 650</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2">
              <div className="flex items-center gap-1 mb-0.5">
                <CalendarCheck2 className="h-2.5 w-2.5 text-amber-600" />
                <p className="text-[8px] font-semibold text-amber-700">Vencendo</p>
              </div>
              <p className="text-[9px] text-muted-foreground mb-1">Próx. 7 dias</p>
              <p className="text-[11px] font-bold text-amber-700">R$ 1.200</p>
            </div>
            <div className="rounded-lg border bg-background p-2">
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                <p className="text-[8px] font-semibold">Futuro</p>
              </div>
              <p className="text-[9px] text-muted-foreground mb-1">Próx. 30d</p>
              <p className="text-[11px] font-bold text-muted-foreground">R$ 3.100</p>
            </div>
          </div>

          {/* AI insight */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex gap-2">
            <span className="text-sm shrink-0">🤖</span>
            <div>
              <p className="text-[10px] font-semibold text-primary">Copiloto diz:</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Pagar R$ 80 a mais no Nubank economiza R$ 1.240 em juros. Você tem margem este mês.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-animated">
      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, #1d4ed820 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/70 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-primary mb-6 shadow-sm">
              <Sparkles className="h-3 w-3" />
              Powered by Claude AI · Feito para o Brasil
            </div>

            {/* Tagline */}
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
              78% dos brasileiros estão endividados. Você merece uma saída.
            </p>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5">
              Organize dívidas.<br />Controle contas.<br />
              <span className="text-shimmer">Construa liberdade.</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Seu copiloto financeiro com IA analisa sua situação, monta seu plano e te guia todo mês —{' '}
              <strong className="text-foreground">de graça pra começar.</strong>
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3 mb-5">
              <Button asChild size="lg" className="rounded-xl gap-2 px-7 shadow-lg shadow-primary/25">
                <Link to="/login">
                  Diagnóstico gratuito em 2 min
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl bg-card/70 backdrop-blur-sm">
                <a href="#como-funciona">Ver como funciona</a>
              </Button>
            </div>

            {/* Zé Apostador Copa callout */}
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 mb-6">
              <span className="text-xl shrink-0">⚽</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Novo · Zé Apostador · Copa 2026</p>
                <p className="text-xs text-muted-foreground leading-snug">Fotografa o jogo na Betano. A IA lê as odds e monta a melhor aposta pra você.</p>
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-6">
              <span className="flex items-center gap-1"><span className="text-green-500">✓</span> Gratuito para começar</span>
              <span className="flex items-center gap-1"><span>🔒</span> Dados criptografados</span>
              <span className="flex items-center gap-1"><span>⭐</span> Sem cartão de crédito</span>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'].map((c, i) => (
                  <div
                    key={i}
                    className="h-7 w-7 rounded-full border-2 border-card flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ backgroundColor: c }}
                  >
                    {['A', 'M', 'J', 'C', 'R'][i]}
                  </div>
                ))}
              </div>
              <div>
                <span><strong className="text-foreground">+2.000 usuários ativos</strong></span>
                <div className="flex items-center gap-0.5 text-amber-400">
                  {'★★★★★'.split('').map((s, i) => <span key={i} className="text-xs">{s}</span>)}
                  <span className="text-xs text-muted-foreground ml-1">4.9</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — 3D mockup */}
          <div className="relative">
            <div className="absolute -top-6 -right-4 flex items-center gap-1.5 rounded-xl bg-card shadow-md border px-3 py-2 text-xs font-medium z-10 animate-bounce" style={{ animationDuration: '3s' }}>
              <TrendingDown className="h-3.5 w-3.5 text-green-500" />
              <span>Economizou R$ 1.240 em juros</span>
            </div>
            <DashboardMockup />
            <div className="absolute -bottom-4 -left-4 rounded-xl bg-card shadow-md border px-3 py-2 text-xs z-10" style={{ animation: 'bounce 4s ease-in-out infinite', animationDelay: '1.5s' }}>
              <div className="font-bold text-green-600">✓ Saldo Total: R$ 36.218</div>
              <div className="text-muted-foreground">3 contas vinculadas</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
