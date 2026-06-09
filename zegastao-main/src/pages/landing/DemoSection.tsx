import { useState } from 'react';
import { Bot, Upload, TrendingUp, FileText, Trophy, LayoutDashboard } from 'lucide-react';

/* ── Chat Mockup ── */
function ChatMockup() {
  const messages = [
    { from: 'user', text: 'Posso comprar um tênis de R$ 400 agora?' },
    {
      from: 'bot',
      text: 'Oi! Olhando sua situação: você tem R$ 8.200 em dívidas com juros de 14% ao mês. Um tênis de R$ 400 agora significa deixar de amortizar — o que custa ~R$ 56 a mais em juros neste mês.',
    },
    { from: 'user', text: 'Nossa, não tinha pensado assim...' },
    {
      from: 'bot',
      text: 'Se quiser, posso te mostrar qual dívida atacar primeiro para chegar na quitação mais rápido. Mas a decisão é sua 😊',
    },
  ];

  return (
    <div className="rounded-xl border bg-background overflow-hidden shadow-sm max-w-sm mx-auto">
      <div className="flex items-center gap-2 border-b px-4 py-3 bg-secondary/40">
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold">Zé Gastão</p>
          <p className="text-[10px] text-green-500">● online agora</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ opacity: 0, animation: `chat-appear 0.4s ease-out ${i * 600}ms forwards` }}
          >
            <div
              className={`rounded-2xl px-3 py-2 text-xs leading-relaxed max-w-[80%] ${
                m.from === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-secondary text-foreground rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Upload Mockup ── */
function UploadMockup() {
  const items = [
    { desc: 'UBER *TRIP', cat: 'Transporte', value: '-R$ 23,50', color: 'text-blue-600' },
    { desc: 'IFOOD*RESTAURANTE', cat: 'Alimentação', value: '-R$ 67,90', color: 'text-orange-600' },
    { desc: 'SPOTIFY', cat: 'Lazer', value: '-R$ 21,90', color: 'text-purple-600' },
    { desc: 'SALÁRIO', cat: 'Renda', value: '+R$ 3.800,00', color: 'text-green-600' },
  ];
  return (
    <div className="rounded-xl border bg-background overflow-hidden shadow-sm max-w-sm mx-auto">
      <div className="px-4 py-3 border-b bg-secondary/40 flex items-center justify-between"
        style={{ opacity: 0, animation: 'chat-appear 0.4s ease-out 0ms forwards' }}>
        <span className="text-xs font-semibold">Extrato importado</span>
        <span className="text-[10px] text-green-500 font-medium">✓ 94 transações</span>
      </div>
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 py-2 border-b"
          style={{ opacity: 0, animation: 'chat-appear 0.4s ease-out 150ms forwards' }}>
          <div className="h-1.5 flex-1 rounded-full bg-primary/20 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: '0%',
                animation: 'progress-fill 1.2s ease-out 200ms forwards',
              }}
            />
          </div>
          <span className="text-[10px] text-primary font-semibold">Categorizado por IA</span>
        </div>
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 border-b last:border-0"
            style={{ opacity: 0, animation: `chat-appear 0.3s ease-out ${i * 200 + 600}ms forwards` }}
          >
            <div>
              <p className="text-[10px] font-medium">{item.desc}</p>
              <span className={`text-[9px] font-semibold ${item.color}`}>{item.cat}</span>
            </div>
            <span className={`text-xs font-bold ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Projection Mockup ── */
function ProjectionMockup() {
  const scenarios = [
    { label: 'Pagando mínimo', months: '52 meses', extra: 'R$ 6.800 em juros', bad: true },
    { label: 'Pagando R$ 80 a mais', months: '18 meses', extra: 'Economiza R$ 1.240', bad: false },
  ];
  return (
    <div className="rounded-xl border bg-background overflow-hidden shadow-sm max-w-sm mx-auto">
      <div className="px-4 py-3 border-b bg-secondary/40"
        style={{ opacity: 0, animation: 'chat-appear 0.4s ease-out 0ms forwards' }}>
        <p className="text-xs font-semibold">Projeção de quitação</p>
        <p className="text-[10px] text-muted-foreground">Dívida Nubank · R$ 8.200</p>
      </div>
      <div className="p-4 space-y-3">
        {scenarios.map((s, i) => (
          <div key={s.label}
            className={`rounded-lg border p-3 ${s.bad ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}
            style={{ opacity: 0, animation: `chat-appear 0.4s ease-out ${i * 200 + 200}ms forwards` }}>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-lg font-extrabold ${s.bad ? 'text-red-600' : 'text-green-600'}`}>{s.months}</p>
            <p className={`text-[10px] font-medium ${s.bad ? 'text-red-500' : 'text-green-600'}`}>{s.extra}</p>
          </div>
        ))}
        <div style={{ opacity: 0, animation: 'chat-appear 0.4s ease-out 700ms forwards' }}>
          <svg viewBox="0 0 200 60" className="w-full mt-1" xmlns="http://www.w3.org/2000/svg">
            <polyline points="0,55 30,52 70,50 110,48 150,47 200,46" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
            <polyline points="0,55 40,45 80,34 120,24 160,15 200,8" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="250" strokeDashoffset="250" style={{ animation: 'draw-line 1.5s ease-out 900ms forwards' }} />
            <circle cx="200" cy="8" r="4" fill="#22c55e" style={{ opacity: 0, animation: 'chat-appear 0.3s ease-out 2400ms forwards' }} />
            <text x="148" y="6" fontSize="8" fill="#22c55e" fontWeight="700" style={{ opacity: 0, animation: 'chat-appear 0.3s ease-out 2500ms forwards' }}>QUITADO!</text>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── Contract Mockup ── */
function ContractMockup() {
  const alerts = [
    { icon: '🚩', text: 'CET de 48% está 2× acima da média do mercado. Negocie ou porte.', type: 'red' },
    { icon: '💡', text: 'Você pode pedir portabilidade em dez/25 e reduzir juros em ~40%.', type: 'green' },
  ];
  return (
    <div className="rounded-xl border bg-background overflow-hidden shadow-sm max-w-sm mx-auto">
      <div className="px-4 py-3 border-b bg-secondary/40 flex items-center justify-between"
        style={{ opacity: 0, animation: 'chat-appear 0.4s ease-out 0ms forwards' }}>
        <span className="text-xs font-semibold">Contrato analisado</span>
        <span className="text-[10px] text-red-500 font-semibold">⚠ 2 red flags</span>
      </div>
      <div className="p-4 space-y-2">
        <div className="rounded-lg bg-secondary/40 p-3 text-[10px] leading-relaxed text-muted-foreground"
          style={{ opacity: 0, animation: 'chat-appear 0.4s ease-out 300ms forwards' }}>
          <p>§ 4.2 — CET:{' '}
            <span className="bg-red-200 text-red-700 font-semibold px-1 rounded animate-pulse">
              48,3% a.a.
            </span>
          </p>
          <p className="mt-1">§ 7.1 — Multa por atraso:{' '}
            <span className="bg-red-200 text-red-700 font-semibold px-1 rounded">
              10% + 2%/dia
            </span>
          </p>
          <p className="mt-1">§ 12.4 — Portabilidade: permitida após 12 parcelas.</p>
        </div>
        {alerts.map((a, i) => (
          <div key={i}
            className={`rounded-lg border px-3 py-2 text-[10px] flex gap-2 items-start ${a.type === 'red' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}
            style={{ opacity: 0, animation: `chat-appear 0.4s ease-out ${i * 250 + 700}ms forwards` }}>
            <span>{a.icon}</span>
            <p className={a.type === 'red' ? 'text-red-700' : 'text-green-700'}>{a.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Journey Mockup ── */
function JourneyMockup() {
  const milestones = [
    { emoji: '🌱', label: 'Primeiro mês no azul', done: true },
    { emoji: '💥', label: 'Dívida mais cara quitada', done: true },
    { emoji: '🎉', label: 'Todas as dívidas quitadas', done: false },
    { emoji: '🛡️', label: 'Reserva de 3 meses', done: false },
    { emoji: '📈', label: 'Primeiro investimento', done: false },
  ];
  return (
    <div className="rounded-xl border bg-background overflow-hidden shadow-sm max-w-sm mx-auto">
      <div className="px-4 py-3 border-b bg-secondary/40">
        <p className="text-xs font-semibold">Jornada Financeira</p>
        <p className="text-[10px] text-muted-foreground">2 de 10 marcos conquistados</p>
      </div>
      <div className="p-4">
        <div className="h-1.5 rounded-full bg-secondary mb-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full" style={{ width: '20%', transition: 'width 1s ease' }} />
        </div>
        <div className="space-y-2">
          {milestones.map((m, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg p-2 ${m.done ? 'bg-primary/8' : 'opacity-50'}`}
              style={{ opacity: m.done ? 1 : 0.5, animation: `chat-appear 0.3s ease-out ${i * 150}ms both` }}>
              <span className="text-lg">{m.emoji}</span>
              <p className="text-[11px] font-medium flex-1">{m.label}</p>
              {m.done && <span className="text-green-500 text-xs">✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard phase Mockup ── */
function PhaseMockup() {
  const stats = [
    { label: 'Saldo do mês', value: '+R$ 420', color: 'text-green-600' },
    { label: 'Comprometimento', value: '68%', color: 'text-yellow-600' },
    { label: 'Score', value: '620/1000', color: 'text-blue-600' },
    { label: 'Dívidas ativas', value: '2', color: 'text-orange-600' },
  ];
  const phases = [
    { label: 'Fase: Sobrevivência', items: ['Gestão de dívidas', 'Plano de quitação'], locked: ['Investimentos', 'Patrimônio'], color: 'red', badge: true },
    { label: 'Fase: Crescimento', items: ['Portfolio ativo', 'Renda passiva', 'Liberdade financeira'], locked: [], color: 'green', badge: false },
  ];
  return (
    <div className="rounded-xl border bg-background overflow-hidden shadow-sm max-w-sm mx-auto">
      <div className="px-4 py-3 border-b bg-secondary/40"
        style={{ opacity: 0, animation: 'chat-appear 0.4s ease-out 0ms forwards' }}>
        <p className="text-xs font-semibold">Dashboard adaptativo</p>
        <p className="text-[10px] text-muted-foreground">Muda conforme sua fase financeira</p>
      </div>
      <div className="p-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s, i) => (
            <div key={s.label} className="rounded-lg border bg-secondary/30 p-2.5"
              style={{ opacity: 0, animation: `chat-appear 0.3s ease-out ${i * 100 + 200}ms forwards` }}>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
              <p className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        {/* Phase cards */}
        <div className="grid grid-cols-2 gap-2">
          {phases.map((p, i) => (
            <div key={p.label}
              className={`rounded-lg border-2 p-3 ${p.color === 'red' ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}
              style={{ opacity: 0, animation: `chat-appear 0.4s ease-out ${i * 200 + 650}ms forwards` }}>
              <p className={`text-[9px] font-bold uppercase mb-1 ${p.color === 'red' ? 'text-red-600' : 'text-green-600'}`}>{p.label}</p>
              {p.items.map((item) => <p key={item} className="text-[10px] text-muted-foreground">✓ {item}</p>)}
              {p.locked.map((item) => <p key={item} className="text-[10px] text-muted-foreground line-through opacity-40">{item}</p>)}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-center text-muted-foreground"
          style={{ opacity: 0, animation: 'chat-appear 0.4s ease-out 1100ms forwards' }}>
          O app detecta sua fase e muda automaticamente.
        </p>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'chat', label: 'Chat com IA', icon: Bot, component: ChatMockup, copy: 'Não é chatbot genérico. Ele conhece suas dívidas, sua renda e seu histórico. Pergunte qualquer coisa — ele responde com base na sua realidade.' },
  { id: 'upload', label: 'Upload de extrato', icon: Upload, component: UploadMockup, copy: 'Importou o PDF ou CSV do banco? Em segundos tudo está categorizado. Alimentação, transporte, lazer — sem você tocar em nada.' },
  { id: 'projecao', label: 'Projeção de quitação', icon: TrendingUp, component: ProjectionMockup, copy: 'Veja o dia exato em que vai quitar cada dívida — e o quanto economiza pagando um pouco a mais por mês.' },
  { id: 'contrato', label: 'Análise de contrato', icon: FileText, component: ContractMockup, copy: 'Mande o PDF do contrato. Em segundos o Zé Gastão encontra cláusulas abusivas, explica em português simples e mostra como negociar.' },
  { id: 'jornada', label: 'Jornada de marcos', icon: Trophy, component: JourneyMockup, copy: '10 conquistas no caminho. Cada marco que você alcança te lembra que está avançando — porque avançar é o que importa.' },
  { id: 'dashboard', label: 'Dashboard adaptativo', icon: LayoutDashboard, component: PhaseMockup, copy: 'Quem está em dívida não precisa ver aba de investimento. O app muda conforme a sua fase — você vê só o que é relevante agora.' },
];

export function DemoSection() {
  const [active, setActive] = useState('chat');
  const tab = TABS.find((t) => t.id === active)!;
  const MockupComponent = tab.component;

  return (
    <section id="como-funciona" className="border-b py-16 md:py-24 bg-secondary/20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Veja em ação</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Tudo que você precisa.<br />Nada que você não vai usar.
          </h2>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                active === t.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border text-muted-foreground hover:text-foreground hover:border-primary/30'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="reveal-left order-2 md:order-1" key={active + '-text'}>
            <h3 className="text-xl font-bold mb-3">{tab.label}</h3>
            <p className="text-muted-foreground leading-relaxed">{tab.copy}</p>
          </div>
          <div className="reveal-right order-1 md:order-2" key={active + '-mockup'}>
            <MockupComponent />
          </div>
        </div>
      </div>
    </section>
  );
}
