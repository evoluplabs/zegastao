import { useEffect, useState, type TextareaHTMLAttributes } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  Brain, Save, Bot, PenLine, Zap, TrendingUp, AlertCircle,
  CheckCircle2, ChevronDown, ChevronUp, DollarSign, Target, RefreshCw,
} from 'lucide-react';
import { db, functions } from '@/firebase';
import { useStore } from '@/store/useStore';
import { useCopilotNotes } from '@/hooks/useDocuments';
import { useDebts } from '@/hooks/useDebts';
import { useGoals } from '@/hooks/useGoals';
import { useDailyTasks } from '@/hooks/useJourney';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatPct } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { generateIncomeTaskSuggestions } from '@/lib/incomeTaskSuggestions';
import { PHASE_LABELS } from '@/types';
import type { UserWrittenContext, ImpulseItem, ExtraIncomeSource, ExtraIncomeType } from '@/types';
import { setProfile } from '@/lib/firestore';

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
    />
  );
}

const SKILL_OPTIONS: { category: string; skills: string[] }[] = [
  {
    category: 'Digital & Tech',
    skills: ['Programação', 'Design gráfico', 'Edição de vídeo', 'Fotografia', 'Criação de conteúdo', 'Tráfego pago', 'Marketing digital', 'SEO', 'Gestão de redes sociais', 'Suporte de TI'],
  },
  {
    category: 'Educação & Idiomas',
    skills: ['Aulas particulares', 'Idiomas', 'Redação', 'Coaching', 'Tutoria on-line'],
  },
  {
    category: 'Serviços Manuais',
    skills: ['Marcenaria', 'Elétrica', 'Encanamento', 'Pintura residencial', 'Jardinagem', 'Limpeza', 'Montagem de móveis', 'Mecânica', 'Costura e alfaiataria'],
  },
  {
    category: 'Beleza & Bem-estar',
    skills: ['Beleza (cabelo/unhas/maquiagem)', 'Massagem', 'Personal trainer', 'Nutrição', 'Cuidado de animais (pet sitter)'],
  },
  {
    category: 'Negócios & Vendas',
    skills: ['Vendas', 'Assistente virtual', 'Consultoria financeira', 'Consultoria empresarial', 'Logística / entregas'],
  },
  {
    category: 'Culinária & Eventos',
    skills: ['Culinária (marmitas / confeitaria)', 'Bartender / garçom', 'Organização de eventos', 'Artesanato'],
  },
];

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'fácil', medium: 'médio', hard: 'difícil' };
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  hard: 'bg-red-100 text-red-700 border-red-200',
};

function ImpulseOutcomeBadge({ outcome }: { outcome: ImpulseItem['outcome'] }) {
  if (outcome === 'resisted') return <Badge className="bg-green-100 text-green-700 border-green-200">✓ resistido</Badge>;
  if (outcome === 'acted') return <Badge variant="destructive">comprou</Badge>;
  return <Badge variant="outline">pendente</Badge>;
}

function NoteList({ title, items, icon }: { title: string; items?: string[]; icon?: React.ReactNode }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
        {icon} {title}
      </p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Persona Card ── */
function PersonaCard() {
  const profile = useStore((s) => s.profile);
  const notes = useCopilotNotes();
  const { data: debts } = useDebts();
  const { data: goals } = useGoals();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const phase = profile?.financialPhase;
  const activeDebts = debts.filter((d) => d.status === 'active');
  const totalDebt = activeDebts.reduce((s, d) => s + d.totalBalance, 0);
  const income = profile?.monthlyIncome || 0;
  const debtPayments = activeDebts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);
  const comprometimento = income > 0 ? ((debtPayments) / income) * 100 : 0;
  const activeGoals = goals.filter((g) => g.status === 'active');

  const traits: { label: string; value: string; status: 'good' | 'warn' | 'bad' | 'neutral' }[] = [
    { label: 'Fase', value: phase ? PHASE_LABELS[phase] : 'Calculando…', status: 'neutral' },
    { label: 'Renda mensal', value: income > 0 ? formatBRL(income) : 'Não informada', status: income > 0 ? 'good' : 'warn' },
    { label: 'Dívidas ativas', value: activeDebts.length === 0 ? 'Nenhuma 🎉' : `${activeDebts.length} (${formatBRL(totalDebt)})`, status: activeDebts.length === 0 ? 'good' : activeDebts.length > 3 ? 'bad' : 'warn' },
    { label: 'Comprometimento', value: income > 0 ? `${formatPct(comprometimento)} da renda em parcelas` : '—', status: comprometimento < 30 ? 'good' : comprometimento < 60 ? 'warn' : 'bad' },
    { label: 'Metas ativas', value: activeGoals.length === 0 ? 'Nenhuma ainda' : `${activeGoals.length} meta${activeGoals.length > 1 ? 's' : ''}`, status: activeGoals.length > 0 ? 'good' : 'neutral' },
  ];

  const statusClass = { good: 'text-green-600', warn: 'text-yellow-600', bad: 'text-red-600', neutral: 'text-foreground' };

  async function generateNow() {
    setGenerating(true);
    setGenError(null);
    try {
      const fn = httpsCallable(functions, 'generateInsightsNow');
      await fn({});
    } catch (err: unknown) {
      // FirebaseFunctionsError.message pode vir como "functions/code: texto" — pega só o texto
      const raw = err instanceof Error ? err.message : 'Erro ao gerar análise.';
      const msg = raw.includes(': ') ? raw.split(': ').slice(1).join(': ') : raw;
      setGenError(msg);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-base">{profile?.name ? `Persona de ${profile.name}` : 'Sua Persona Financeira'}</h3>
          <p className="text-xs text-muted-foreground">Como o copiloto te enxerga — atualizado em tempo real</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {traits.map((t) => (
          <div key={t.label} className="rounded-xl border bg-secondary/30 px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{t.label}</p>
            <p className={cn('text-sm font-semibold mt-0.5', statusClass[t.status])}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* Copilot insights sobre a persona */}
      {notes && (
        <div className="space-y-3 border-t pt-4">
          {notes.suggestedFocus && (
            <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-primary">Foco desta semana</p>
                <p className="text-sm mt-0.5">{notes.suggestedFocus}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NoteList title="Padrões observados" items={notes.behaviorPatterns} icon={<Brain className="h-3 w-3" />} />
            <NoteList title="Pontos fortes" items={notes.strengths} icon={<CheckCircle2 className="h-3 w-3 text-green-600" />} />
            <NoteList title="Áreas de atenção" items={notes.riskAreas} icon={<AlertCircle className="h-3 w-3 text-amber-600" />} />
          </div>
          {notes.progressNotes && notes.progressNotes.length > 0 && (
            <NoteList title="Progresso recente" items={notes.progressNotes} icon={<TrendingUp className="h-3 w-3 text-green-600" />} />
          )}
          {!notes.suggestedFocus && !notes.behaviorPatterns?.length && (
            <p className="text-xs text-muted-foreground text-center py-2">
              As anotações personalizadas aparecem após o primeiro processamento noturno.
            </p>
          )}
        </div>
      )}

      {!notes && (
        <div className="space-y-2">
          <div className="rounded-xl bg-secondary/50 border px-4 py-3 text-xs text-muted-foreground">
            <Bot className="h-4 w-4 inline-block mr-1.5" />
            As análises de comportamento ainda não foram geradas.
          </div>
          <Button
            className="w-full gap-2"
            variant="outline"
            loading={generating}
            onClick={generateNow}
          >
            <RefreshCw className="h-4 w-4" />
            Gerar minha análise agora
          </Button>
          {genError && <p className="text-xs text-destructive text-center">{genError}</p>}
        </div>
      )}

      {notes && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" loading={generating} onClick={generateNow} className="gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            {generating ? 'Gerando…' : 'Atualizar análise'}
          </Button>
        </div>
      )}
      {genError && notes && <p className="text-xs text-destructive text-center">{genError}</p>}
    </div>
  );
}

/* ── Income Tasks Section ── */
function IncomeTasksSection() {
  const profile = useStore((s) => s.profile);
  const { data: debts } = useDebts();
  const { data: goals } = useGoals();
  const backendTasks = useDailyTasks();
  const [expanded, setExpanded] = useState<string | null>(null);

  const [form] = useState<UserWrittenContext>({});
  const skills = profile?.skills || [];

  // Backend tasks de renda_extra
  const backendIncomeTasks = backendTasks.filter((t) => t.category === 'renda_extra');

  // Frontend-generated suggestions
  const suggestions = generateIncomeTaskSuggestions(skills, debts, goals);

  const topDebt = [...debts]
    .filter((d) => d.status === 'active')
    .sort((a, b) => b.interestRateMonthly - a.interestRateMonthly)[0];

  return (
    <div className="space-y-4">
      {/* Contexto da dívida prioritária */}
      {topDebt && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <DollarSign className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-amber-800">Dívida prioritária: {topDebt.creditor}</p>
            <p className="text-amber-700 mt-0.5">
              Parcela: <strong>{formatBRL(topDebt.monthlyPayment)}/mês</strong> · Juros: <strong>{formatPct(topDebt.interestRateMonthly * 100, 1)} a.m.</strong>
              {' '}— as tarefas abaixo foram escolhidas para te ajudar a cobrir ou acelerar esse pagamento.
            </p>
          </div>
        </div>
      )}

      {skills.length === 0 && (
        <div className="rounded-xl border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
          Adicione suas habilidades na aba <strong>Meu Contexto</strong> para receber sugestões personalizadas de renda extra.
        </div>
      )}

      {/* Backend tasks (geradas pelo job noturno) */}
      {backendIncomeTasks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <Bot className="h-3.5 w-3.5" /> Tarefas do seu plano hoje
          </p>
          <div className="space-y-2">
            {backendIncomeTasks.map((t, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 flex items-start gap-3">
                <span className="text-xl shrink-0">💰</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ⏱ {t.estimatedTime}
                    {t.estimatedReturn && ` · 💰 ${t.estimatedReturn}`}
                    {t.platform && ` · ${t.platform}`}
                  </p>
                </div>
                <Badge className={cn('shrink-0 text-xs', DIFFICULTY_COLOR[t.difficulty] || '')}>
                  {DIFFICULTY_LABEL[t.difficulty] || t.difficulty}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frontend-generated suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Sugestões baseadas no seu perfil
          </p>
          <div className="space-y-2">
            {suggestions.map((t) => {
              const isOpen = expanded === t.id;
              return (
                <div key={t.id} className="rounded-xl border bg-card overflow-hidden">
                  <button
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                  >
                    <span className="text-xl shrink-0">💰</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">{t.title}</p>
                      {t.debtContext && (
                        <p className="text-[11px] font-semibold text-green-600 mt-0.5">{t.debtContext}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          💰 {t.estimatedReturn} · ⏱ {t.estimatedTime}
                        </span>
                        {t.skillRequired && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">{t.skillRequired}</Badge>
                        )}
                        <Badge className={cn('text-[10px] h-4 px-1.5', DIFFICULTY_COLOR[t.difficulty])}>
                          {DIFFICULTY_LABEL[t.difficulty]}
                        </Badge>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-0 border-t bg-secondary/20 space-y-2">
                      <p className="text-xs text-muted-foreground leading-relaxed pt-3">{t.detail}</p>
                      {t.platform && (
                        <p className="text-xs font-medium text-primary">🔗 Onde começar: {t.platform}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {suggestions.length === 0 && backendIncomeTasks.length === 0 && (
        <div className="rounded-xl border bg-secondary/30 px-4 py-6 text-center">
          <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Adicione suas habilidades para ver sugestões personalizadas de renda extra.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Impulse History ── */
function ImpulseHistory({ impulses }: { impulses: ImpulseItem[] }) {
  if (impulses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Quando você conversar sobre uma vontade de compra no Copiloto, ela aparece aqui com o impacto financeiro estimado.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {impulses.map((it) => (
        <div key={it.id} className="rounded-xl border p-4 flex items-start gap-3">
          <span className="text-lg shrink-0">{it.outcome === 'resisted' ? '✋' : it.outcome === 'acted' ? '💸' : '🤔'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{it.impulse}</p>
            {it.copilotResponse && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{it.copilotResponse}</p>
            )}
            {it.impactIfActed != null && it.impactIfActed > 0 && (
              <p className="text-xs text-amber-600 font-medium mt-1">
                Impacto estimado: {formatBRL(it.impactIfActed)}
              </p>
            )}
          </div>
          <ImpulseOutcomeBadge outcome={it.outcome} />
        </div>
      ))}
    </div>
  );
}

const EXTRA_INCOME_OPTIONS: { type: ExtraIncomeType; label: string; emoji: string; month?: number }[] = [
  { type: 'decimo_terceiro', label: '13º salário',       emoji: '🎁', month: 12 },
  { type: 'plr',             label: 'PLR / participação', emoji: '📊' },
  { type: 'bonus',           label: 'Bônus anual',        emoji: '💼' },
  { type: 'bolsa_familia',   label: 'Bolsa Família',      emoji: '🏛️' },
  { type: 'bpc',             label: 'BPC/LOAS',           emoji: '🏛️' },
  { type: 'aluguel',         label: 'Aluguel recebido',   emoji: '🏠' },
  { type: 'pensao',          label: 'Pensão/alimony',     emoji: '👨‍👩‍👧' },
  { type: 'outro',           label: 'Outra renda extra',  emoji: '💰' },
];

/* ── Extra Income Card ── */
function ExtraIncomeCard() {
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const [sources, setSources] = useState<ExtraIncomeSource[]>(profile?.extraIncomeSources || []);
  const [saving, setSaving] = useState(false);

  function toggle(type: ExtraIncomeType) {
    setSources((prev) =>
      prev.find((s) => s.type === type)
        ? prev.filter((s) => s.type !== type)
        : [...prev, { type, estimatedAmount: 0, month: EXTRA_INCOME_OPTIONS.find((o) => o.type === type)?.month }]
    );
  }

  function setAmount(type: ExtraIncomeType, val: string) {
    setSources((prev) =>
      prev.map((s) => s.type === type ? { ...s, estimatedAmount: parseFloat(val.replace(',', '.')) || 0 } : s)
    );
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try { await setProfile({ extraIncomeSources: sources }); }
    finally { setSaving(false); }
  }

  const totalExtra = sources.reduce((s, e) => s + (e.estimatedAmount || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-500" /> Rendas extras previsíveis
        </CardTitle>
        <p className="text-xs text-muted-foreground">13º, PLR, Bolsa Família… O Zé Gastão avisa antes de chegar e sugere como usar bem.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          {EXTRA_INCOME_OPTIONS.map((opt) => {
            const active = sources.find((s) => s.type === opt.type);
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => toggle(opt.type)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs text-left transition-colors',
                  active ? 'border-green-400 bg-green-50 dark:bg-green-500/10 font-medium text-green-700 dark:text-green-400' : 'hover:bg-accent'
                )}
              >
                <span>{opt.emoji}</span>
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {sources.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground">Valor estimado de cada um:</p>
            {sources.map((src) => {
              const opt = EXTRA_INCOME_OPTIONS.find((o) => o.type === src.type)!;
              return (
                <div key={src.type} className="flex items-center gap-2">
                  <span className="text-sm shrink-0">{opt.emoji}</span>
                  <p className="text-xs flex-1 truncate">{opt.label}</p>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={src.estimatedAmount || ''}
                    onChange={(e) => setAmount(src.type, e.target.value)}
                    placeholder="R$ 0"
                    className="w-24 rounded-md border border-input bg-background px-2 py-1 text-xs text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              );
            })}
            {totalExtra > 0 && (
              <p className="text-xs font-semibold text-green-600 text-right">
                Total extra previsto: {formatBRL(totalExtra)}
              </p>
            )}
          </div>
        )}

        <Button size="sm" onClick={save} disabled={saving} className="w-full gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Salvando…' : 'Salvar rendas extras'}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ── Main Component ── */
export function PersonalContext() {
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const [activeTab, setActiveTab] = useState<'persona' | 'contexto' | 'renda_extra' | 'impulsos'>('persona');
  const [form, setForm] = useState<UserWrittenContext>({});
  const [skillsSelected, setSkillsSelected] = useState<string[]>(profile?.skills || []);
  const [impulses, setImpulses] = useState<ImpulseItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'personal_context', 'user_written');
    const unsubDoc = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserWrittenContext;
        setForm(data);
        if (data.skills) setSkillsSelected(data.skills);
      }
    });
    const itemsRef = query(
      collection(db, 'users', user.uid, 'personal_context', 'impulse_history', 'items'),
      orderBy('recordedAt', 'desc')
    );
    const unsubItems = onSnapshot(itemsRef, (snap) => {
      setImpulses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ImpulseItem));
    });
    return () => { unsubDoc(); unsubItems(); };
  }, [user]);

  function toggleSkill(s: string) {
    setSkillsSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'personal_context', 'user_written'),
        { ...form, skills: skillsSelected, updatedAt: new Date() },
        { merge: true }
      );
    } finally {
      setSaving(false);
    }
  }

  const TABS = [
    { id: 'persona' as const, label: 'Minha Persona', icon: Brain },
    { id: 'renda_extra' as const, label: 'Renda Extra', icon: Zap },
    { id: 'contexto' as const, label: 'Meu Contexto', icon: PenLine },
    { id: 'impulsos' as const, label: 'Impulsos', icon: AlertCircle, badge: impulses.length > 0 ? impulses.length : undefined },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Brain className="h-5 w-5 text-primary" /> Contexto Pessoal
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Seu diário financeiro vivo — o copiloto usa isso para personalizar seu plano.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors relative',
              activeTab === t.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.badge && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[9px] text-white flex items-center justify-center font-bold">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Persona Tab */}
      {activeTab === 'persona' && <PersonaCard />}

      {/* Renda Extra Tab */}
      {activeTab === 'renda_extra' && <IncomeTasksSection />}

      {/* Contexto Tab */}
      {activeTab === 'contexto' && (
        <div className="space-y-4">
          {/* Rendas extras previsíveis */}
          <ExtraIncomeCard />

          {/* Habilidades */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Minhas habilidades
              </CardTitle>
              <p className="text-xs text-muted-foreground">Usamos para sugerir tarefas de renda extra sob medida</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SKILL_OPTIONS.map((group) => (
                  <div key={group.category}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{group.category}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.skills.map((s) => (
                        <button
                          key={s}
                          onClick={() => toggleSkill(s)}
                          className={cn(
                            'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                            skillsSelected.includes(s)
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'hover:bg-accent'
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PenLine className="h-4 w-4" /> O que eu escrevi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Meus objetivos de vida</Label>
                <Textarea
                  placeholder="O que você quer conquistar? Casa própria, aposentadoria, viagem?"
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Como estou me sentindo / meus medos</Label>
                <Textarea
                  placeholder="O que te preocupa? O que te impede de avançar?"
                  value={form.currentFeelings || ''}
                  onChange={(e) => setForm({ ...form, currentFeelings: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Eventos importantes da minha vida</Label>
                <Textarea
                  placeholder="Mudança de emprego, filho nascendo, separação — coisas que afetam sua vida financeira"
                  value={form.lifeEvents?.join('\n') || ''}
                  onChange={(e) => setForm({ ...form, lifeEvents: e.target.value.split('\n').filter(Boolean) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Gatilhos de gasto impulsivo</Label>
                <Textarea
                  placeholder="Situações que te fazem gastar sem pensar (ex: estresse, redes sociais, promoções)"
                  value={form.impulses?.join('\n') || ''}
                  onChange={(e) => setForm({ ...form, impulses: e.target.value.split('\n').filter(Boolean) })}
                />
              </div>
              <Button onClick={save} disabled={saving} className="w-full gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Salvando…' : 'Salvar contexto'}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Essas informações são privadas e usadas exclusivamente para personalizar seu plano.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Impulsos Tab */}
      {activeTab === 'impulsos' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" /> Histórico de impulsos de compra
            </CardTitle>
            <p className="text-xs text-muted-foreground">Registrado automaticamente pelo copiloto nas conversas</p>
          </CardHeader>
          <CardContent>
            <ImpulseHistory impulses={impulses} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
