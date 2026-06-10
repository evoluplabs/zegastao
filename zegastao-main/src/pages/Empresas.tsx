import { Link } from 'react-router-dom';
import { ArrowRight, Building2, TrendingUp, Users, Shield, CheckCircle2, ArrowLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const B2B_PLANS = [
  { size: 'Até 10 colaboradores', price: 'R$ 149', perPerson: 'R$ 14,90/pessoa', highlight: false },
  { size: 'Até 50 colaboradores', price: 'R$ 499', perPerson: '~R$ 9,98/pessoa', highlight: true },
  { size: 'Até 200 colaboradores', price: 'R$ 999', perPerson: '~R$ 4,99/pessoa', highlight: false },
  { size: '+200 colaboradores', price: 'Consulte', perPerson: 'Proposta personalizada', highlight: false },
];

const BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Funcionário financeiramente saudável = mais produtivo',
    desc: '68% dos trabalhadores com dívidas reportam impacto negativo na produtividade. O Copiloto resolve isso na raiz.',
  },
  {
    icon: Users,
    title: 'Benefício que as pessoas realmente usam',
    desc: 'Diferente de academias e planos de saúde ignorados, finanças pessoais são urgentes para a maioria dos brasileiros.',
  },
  {
    icon: Shield,
    title: 'Privacidade total',
    desc: 'O RH não vê dados individuais. Apenas relatórios agregados e anonimizados para medir o impacto.',
  },
  {
    icon: Building2,
    title: 'Implementação sem fricção',
    desc: 'Sem integração de sistemas. Seus colaboradores recebem um link e em 2 minutos estão usando.',
  },
];

const STATS = [
  { value: '68%', label: 'dos brasileiros têm dívidas' },
  { value: '23%', label: 'de queda de produtividade em estressados com finanças' },
  { value: 'R$ 5-15', label: 'por colaborador/mês (referência de mercado)' },
  { value: '5x', label: 'ROI estimado em retenção e produtividade' },
];

export function Empresas() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ nome: '', empresa: '', email: '', tamanho: '', mensagem: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Por ora, apenas simula o envio (integrar com Firestore ou email service depois)
    await new Promise((r) => setTimeout(r, 800));
    // Salvar lead no Firestore
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('@/firebase');
      await addDoc(collection(db, 'b2b_leads'), {
        ...form,
        createdAt: new Date().toISOString(),
        source: 'landing_empresas',
      });
    } catch { /* silenciar */ }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <Button asChild size="sm">
            <Link to="/login">Acessar app</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-5">
            <Building2 className="h-3 w-3" />
            Bem-estar financeiro para equipes
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-balance">
            Seu colaborador com dívidas<br />
            <span className="text-primary">custa caro para sua empresa.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            O Copiloto Financeiro como benefício corporativo: seu time sai das dívidas, você ganha produtividade e retenção.
          </p>
          <Button size="lg" className="rounded-xl gap-2 px-8" onClick={() => document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' })}>
            Quero saber mais
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-secondary/30">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="border-b">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="text-2xl font-bold text-center mb-8">Por que oferecer o Copiloto à sua equipe?</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-4 rounded-xl border bg-card p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1.5">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-b bg-secondary/20">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-2xl font-bold text-center mb-8">Como funciona</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Você manifesta interesse', desc: 'Preenche o formulário abaixo. Nossa equipe entra em contato em até 48h.' },
              { step: '2', title: 'Enviamos o kit de onboarding', desc: 'Guia para o RH + link exclusivo da sua empresa com tracking de uso (sem dados individuais).' },
              { step: '3', title: 'Colaboradores ativam', desc: 'Recebem o link, criam conta e começam a usar em 2 minutos. Sem instalação, funciona no navegador.' },
              { step: '4', title: 'Você vê o impacto', desc: 'Relatório mensal anonimizado: % que saíram da fase Sobrevivência, milestones alcançados, engajamento.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 rounded-xl border bg-card p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing B2B */}
      <section className="border-b">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Preços transparentes</h2>
            <p className="text-sm text-muted-foreground">Sem taxas ocultas. Sem contrato de longo prazo.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {B2B_PLANS.map((p) => (
              <div
                key={p.size}
                className={`rounded-2xl border p-5 flex flex-col gap-3 ${p.highlight ? 'border-2 border-primary relative' : ''}`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                      <Zap className="h-3 w-3" /> Mais popular
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground font-medium">{p.size}</p>
                <p className="text-2xl font-extrabold">{p.price}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                <p className="text-xs text-primary font-medium">{p.perPerson}</p>
                <Button
                  size="sm"
                  variant={p.highlight ? 'default' : 'outline'}
                  className="w-full mt-auto"
                  onClick={() => document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Solicitar proposta
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Todos os planos incluem: acesso completo para todos os colaboradores, relatórios anonimizados mensais e suporte dedicado ao RH.
          </p>
        </div>
      </section>

      {/* Formulário de interesse */}
      <section id="form" className="border-b">
        <div className="mx-auto max-w-lg px-4 py-14">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Quero para minha empresa</h2>
            <p className="text-sm text-muted-foreground">Sem compromisso. Nossa equipe monta uma proposta personalizada.</p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-success/30 bg-success/5 p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-1">Recebemos seu interesse!</h3>
              <p className="text-sm text-muted-foreground">Retornaremos em até 48 horas com uma proposta personalizada para sua empresa.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Seu nome *</label>
                  <input
                    required
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="João Silva"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Empresa *</label>
                  <input
                    required
                    value={form.empresa}
                    onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                    placeholder="Empresa Ltda"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">E-mail corporativo *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="joao@empresa.com.br"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Número de colaboradores</label>
                <select
                  value={form.tamanho}
                  onChange={(e) => setForm({ ...form, tamanho: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                >
                  <option value="">Selecione</option>
                  <option value="1-20">1 a 20</option>
                  <option value="21-100">21 a 100</option>
                  <option value="101-500">101 a 500</option>
                  <option value="500+">Mais de 500</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Mensagem (opcional)</label>
                <textarea
                  value={form.mensagem}
                  onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                  placeholder="Conte um pouco sobre sua empresa e o que você busca..."
                  rows={3}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                />
              </div>
              <Button type="submit" className="w-full gap-2" loading={loading}>
                Enviar interesse
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Sem spam. Seus dados são usados apenas para retornarmos seu contato.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-secondary/20">
        <div className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">C</div>
            <span className="text-sm font-medium">Copiloto Financeiro</span>
          </Link>
          <p className="text-xs text-muted-foreground">Orientação educacional · Não é consultoria regulamentada pela CVM</p>
        </div>
      </footer>
    </div>
  );
}
