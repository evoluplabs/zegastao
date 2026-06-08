import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

function DashboardMockup() {
  return (
    <div className="perspective-wrap w-full max-w-lg mx-auto">
      <div className="tilt-card animate-float rounded-2xl border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-secondary/40">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">Zé Gastão · Dashboard</span>
          <div className="w-14" />
        </div>

        <div className="p-4 space-y-3">
          {/* Phase badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5">
              🔄 Reorganização
            </span>
            <span className="text-[10px] text-muted-foreground">Fase 2 de 5</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Saldo mensal', value: '+R$ 380', color: 'text-green-600' },
              { label: 'Dívidas', value: 'R$ 8.200', color: 'text-red-500' },
              { label: 'Categorias', value: '94 txns', color: 'text-primary' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-background p-2">
                <p className={`text-xs font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Projection line */}
          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold">Projeção de quitação</span>
              <span className="text-[10px] text-green-600 font-bold">18 meses</span>
            </div>
            <svg viewBox="0 0 200 48" className="w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
              <polyline
                points="0,42 25,38 50,32 75,26 100,20 125,15 150,10 175,6 200,3"
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="200" cy="3" r="3" fill="#22c55e" />
              <text x="160" y="16" fontSize="7" fill="#22c55e" fontWeight="600">QUITADO!</text>
            </svg>
          </div>

          {/* AI insight */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex gap-2">
            <span className="text-sm">🤖</span>
            <div>
              <p className="text-[10px] font-semibold text-primary">Copiloto diz:</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Pagar R$ 80 a mais na dívida do Nubank economiza R$ 1.240 em juros.
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
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/70 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-primary mb-6 shadow-sm">
              <Sparkles className="h-3 w-3" />
              Powered by Claude AI · Feito para o Brasil
            </div>

            {/* Tagline */}
            <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3">
              Você merece um plano. Não uma planilha.
            </p>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5">
              Seu copiloto do{' '}
              <span className="text-shimmer">vermelho à liberdade.</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              O Zé Gastão analisa suas dívidas, monta um plano personalizado e te diz{' '}
              <strong className="text-foreground">exatamente o que fazer todo mês</strong>{' '}
              — sem planilha, sem vergonha, sem enrolação.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3 mb-8">
              <Button asChild size="lg" className="rounded-xl gap-2 px-7 shadow-lg shadow-primary/25">
                <Link to="/login">
                  Começar grátis agora
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl bg-white/70 backdrop-blur-sm">
                <a href="#como-funciona">Ver como funciona</a>
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'].map((c, i) => (
                  <div
                    key={i}
                    className="h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ backgroundColor: c }}
                  >
                    {['A', 'M', 'J', 'C', 'R'][i]}
                  </div>
                ))}
              </div>
              <span>
                <strong className="text-foreground">+2.000 pessoas</strong> já usam o Zé Gastão
              </span>
            </div>
          </div>

          {/* Right — 3D mockup */}
          <div className="relative">
            <div className="absolute -top-6 -right-4 flex items-center gap-1.5 rounded-xl bg-white shadow-md border px-3 py-2 text-xs font-medium z-10 animate-bounce" style={{ animationDuration: '3s' }}>
              <TrendingDown className="h-3.5 w-3.5 text-green-500" />
              <span>Economizou R$ 1.240 em juros</span>
            </div>
            <DashboardMockup />
            <div className="absolute -bottom-4 -left-4 rounded-xl bg-white shadow-md border px-3 py-2 text-xs z-10" style={{ animation: 'bounce 4s ease-in-out infinite', animationDelay: '1.5s' }}>
              <div className="font-bold text-green-600">✓ Quitação: Jun 2026</div>
              <div className="text-muted-foreground">18 meses restantes</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
