import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Shield, TrendingUp, Zap, CheckCircle2, BarChart3, FileText, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PHASES = [
  { emoji: '🆘', phase: 'Sobrevivência', desc: 'Gastos > renda. Tom urgente, foco em cortar dívidas.' },
  { emoji: '🔄', phase: 'Reorganização', desc: 'Conta equilibrada, ainda tem dívidas. Estratégia avalanche.' },
  { emoji: '🛡️', phase: 'Estabilização', desc: 'Dívidas quitadas. Construindo reserva de emergência.' },
  { emoji: '📈', phase: 'Acumulação', desc: 'Reserva ok. Começando a investir consistentemente.' },
  { emoji: '🏆', phase: 'Crescimento', desc: 'Patrimônio em construção. Rumo à liberdade financeira.' },
];

const FEATURES = [
  {
    icon: Bot,
    title: 'Copiloto com IA',
    desc: 'Chat com Claude Sonnet que conhece suas finanças. Conselhos personalizados, não genéricos.',
  },
  {
    icon: BarChart3,
    title: 'Categorização automática',
    desc: 'Importou o extrato? Em segundos tudo categorizado: alimentação, transporte, lazer...',
  },
  {
    icon: TrendingUp,
    title: 'Projeção de quitação',
    desc: 'Veja exatamente quando vai quitar cada dívida — e o impacto de pagar um pouco a mais todo mês.',
  },
  {
    icon: FileText,
    title: 'Análise de contratos',
    desc: 'Cole o PDF do contrato. O Copiloto encontra cláusulas abusivas e oportunidades de renegociação.',
  },
  {
    icon: Target,
    title: 'Tarefas diárias personalizadas',
    desc: 'Com base nas suas habilidades, recebe sugestões reais de renda extra e economia.',
  },
  {
    icon: Zap,
    title: 'Regras automáticas',
    desc: '"Quando receber salário, redirecionar 20% para a reserva." O app executa sozinho.',
  },
];

const STATS = [
  { value: '9', label: 'bancos brasileiros suportados' },
  { value: '5', label: 'fases financeiras progressivas' },
  { value: '10', label: 'marcos da jornada para liberdade' },
  { value: '0', label: 'reais por mês para começar' },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              C
            </div>
            <span className="font-bold text-sm">Copiloto Financeiro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </Link>
            <Link to="/empresas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Empresas
            </Link>
            <Button asChild size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
            <Bot className="h-3 w-3" />
            Powered by Claude AI · Feito para o Brasil
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight mb-5 text-balance">
            Saia das dívidas.<br />
            <span className="text-primary">Com um copiloto de IA.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-balance">
            O único app financeiro que evolui com você: começa te ajudando a sair das dívidas e termina como seu assessor de patrimônio.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-xl gap-2 px-8">
              <Link to="/login">
                Começar grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl gap-2">
              <Link to="/pricing">
                Ver planos
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Sem cartão de crédito · Gratuito para sempre no plano básico
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-secondary/30">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fases */}
      <section className="border-b">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">5 fases. 1 jornada.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              O app identifica sua fase financeira automaticamente e adapta tom, conselhos e tarefas — nada de conselho genérico.
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-border hidden md:block" />
            <div className="space-y-4">
              {PHASES.map((p, i) => (
                <div key={p.phase} className="flex items-start gap-4 rounded-xl border bg-card p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background text-xl">
                    {p.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Fase {i + 1}</span>
                      <span className="font-bold text-sm">{p.phase}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b bg-secondary/20">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Tudo que você precisa</h2>
            <p className="text-muted-foreground">E nenhuma feature inútil que ninguém usa.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="border-b">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-3">
            Pronto para mudar sua relação com o dinheiro?
          </h2>
          <p className="text-muted-foreground mb-8">
            Comece grátis agora. Leva menos de 2 minutos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Button asChild size="lg" className="rounded-xl gap-2 px-8">
              <Link to="/login">
                Criar conta grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link to="/empresas">Quero para minha empresa</Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            {['Sem cartão', 'Dados protegidos', 'Cancele quando quiser'].map((t) => (
              <span key={t} className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-secondary/20">
        <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">C</div>
            <span className="text-sm font-medium">Copiloto Financeiro</span>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link to="/pricing" className="hover:text-foreground transition-colors">Preços</Link>
            <Link to="/empresas" className="hover:text-foreground transition-colors">Empresas</Link>
            <a href="mailto:suporte@copilotofinanceiro.com.br" className="hover:text-foreground transition-colors">Contato</a>
          </div>
          <p className="text-xs text-muted-foreground">
            Orientação educacional · Não é consultoria financeira regulamentada pela CVM
          </p>
        </div>
      </footer>
    </div>
  );
}
