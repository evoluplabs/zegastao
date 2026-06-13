import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { setProfile, addUserDoc } from '@/lib/firestore';
import { registerForPushNotifications } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput, PercentInput } from '@/components/ui/CurrencyInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';
import { track, Events } from '@/lib/analytics';

const SKILL_CATEGORIES = [
  {
    label: 'Digital & Tecnologia',
    skills: ['Programação', 'Design gráfico', 'Criação de conteúdo', 'Edição de vídeo', 'Fotografia', 'Tráfego pago', 'Marketing digital', 'SEO', 'Gestão de redes sociais', 'Suporte de TI'],
  },
  {
    label: 'Educação & Idiomas',
    skills: ['Aulas particulares', 'Idiomas', 'Tutoria on-line', 'Coaching', 'Redação'],
  },
  {
    label: 'Serviços Manuais',
    skills: ['Marcenaria', 'Elétrica', 'Encanamento', 'Pintura residencial', 'Jardinagem', 'Limpeza', 'Montagem de móveis', 'Mecânica', 'Artesanato'],
  },
  {
    label: 'Beleza & Bem-estar',
    skills: ['Beleza', 'Costura e alfaiataria', 'Massagem', 'Personal trainer', 'Pet sitter'],
  },
  {
    label: 'Negócios & Vendas',
    skills: ['Vendas', 'Marketing', 'Assistente virtual', 'Consultoria financeira', 'Logística/entregas'],
  },
  {
    label: 'Culinária & Eventos',
    skills: ['Culinária', 'Marmitas/confeitaria', 'Bartender/garçom', 'Organização de eventos'],
  },
];

const DREAM_OPTIONS = [
  { id: 'liberdade', label: 'Liberdade financeira' },
  { id: 'casa', label: 'Casa própria' },
  { id: 'aposentadoria', label: 'Aposentadoria tranquila' },
  { id: 'reserva', label: 'Dormir sem dívidas' },
  { id: 'outro', label: 'Outro' },
];

const INVEST_OPTIONS = [
  { id: 'no_idea', label: 'Não sei nem por onde começar' },
  { id: 'no', label: 'Ainda não invisto' },
  { id: 'yes', label: 'Sim, já invisto' },
  { id: 'skip', label: 'Pular por agora' },
] as const;

// Onboarding essencial: sem dados o app não tem utilidade.
// Coleta skills e investmentGoals (obrigatórios) — base do copiloto por fase.
export function Onboarding() {
  const { user, profile, authLoading, setProfile: setStoreProfile } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.name || '');
  const [income, setIncome] = useState(0);
  const [debt, setDebt] = useState({ name: '', balance: 0, payment: 0, rate: 0 });
  const [skills, setSkills] = useState<string[]>([]);
  const [dreams, setDreams] = useState<string[]>([]);
  const [invest, setInvest] = useState<'yes' | 'no' | 'no_idea' | 'skip'>('no_idea');
  const [busy, setBusy] = useState(false);

  if (!authLoading && !user) return <Navigate to="/login" replace />;
  if (profile?.onboardingDone) return <Navigate to="/dashboard" replace />;

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function finish() {
    setBusy(true);
    try {
      await setProfile({
        name,
        monthlyIncome: income,
        skills,
        investmentGoals: dreams,
        alreadyInvests: invest === 'skip' ? 'no_idea' : invest,
        riskProfile: 'conservative',
        onboardingDone: true,
      });

      if (debt.name && debt.balance > 0) {
        await addUserDoc('debts', {
          creditor: debt.name,
          type: 'Outros',
          totalBalance: debt.balance,
          monthlyPayment: debt.payment,
          remainingInstallments: 0,
          interestRateMonthly: debt.rate,
          dueDay: 10,
          status: 'active',
        });
      }

      setStoreProfile({ ...profile, name, monthlyIncome: income, skills, investmentGoals: dreams, onboardingDone: true, setupWizardDone: false });
      track(Events.ONBOARDING_COMPLETED, { skills: skills.length, dreams: dreams.length });
      // Solicitar push em background — não bloquear navegação
      if (user) registerForPushNotifications(user.uid).catch(() => {});
      navigate('/dashboard');
    } finally {
      setBusy(false);
    }
  }

  const STEPS = [
    { label: 'Você', emoji: '👤' },
    { label: 'Dívidas', emoji: '💳' },
    { label: 'Habilidades', emoji: '⚡' },
    { label: 'Sonhos', emoji: '🎯' },
    { label: 'Investimentos', emoji: '📈' },
  ];

  const STEP_DESCRIPTIONS = [
    'Vamos começar com o básico.',
    'Tem alguma dívida? (opcional)',
    'O que você sabe fazer bem?',
    'Qual é seu maior sonho financeiro?',
    'Você já investe em algo?',
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4 gap-6">
      <Link to="/"><Logo size="sm" /></Link>
      {/* Progress indicator */}
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div className={cn(
                'relative h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all duration-300',
                i < step ? 'bg-primary text-primary-foreground' :
                i === step ? 'bg-primary/15 ring-2 ring-primary text-primary' :
                'bg-secondary text-muted-foreground'
              )}>
                {i < step ? '✓' : s.emoji}
              </div>
              {i < STEPS.length - 1 && (
                <div className="absolute mt-4 ml-8" />
              )}
            </div>
          ))}
        </div>
        {/* Connecting line */}
        <div className="relative h-1 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          {STEPS.map((s, i) => (
            <span key={i} className={cn(
              'text-xs flex-1 text-center transition-colors',
              i === step ? 'text-primary font-medium' : 'text-muted-foreground'
            )}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vamos montar seu plano 👋</CardTitle>
          <CardDescription>
            {STEP_DESCRIPTIONS[step]}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-1">
                <Label>Como prefere ser chamado?</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
              </div>
              <CurrencyInput
                label="Renda mensal líquida"
                value={income}
                onChange={setIncome}
              />
              <Button className="w-full" onClick={() => setStep(1)} disabled={!name || !income}>
                Continuar
              </Button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-1">
                <Label>Credor</Label>
                <Input value={debt.name} onChange={(e) => setDebt({ ...debt, name: e.target.value })} placeholder="Ex: Cartão Nubank" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CurrencyInput label="Saldo" value={debt.balance} onChange={(v) => setDebt({ ...debt, balance: v })} />
                <CurrencyInput label="Parcela/mês" value={debt.payment} onChange={(v) => setDebt({ ...debt, payment: v })} />
              </div>
              <PercentInput label="Juros ao mês" value={debt.rate} onChange={(v) => setDebt({ ...debt, rate: v })} />
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5">
                <span className="text-lg">📤</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary">Tem extrato do banco?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Importe depois e o app detecta suas dívidas automaticamente.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Pular</Button>
                <Button className="flex-1" onClick={() => setStep(2)}>Continuar</Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Usamos isso para sugerir renda extra sob medida. Selecione pelo menos 1.
              </p>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {SKILL_CATEGORIES.map((cat) => (
                  <div key={cat.label}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{cat.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.skills.map((s) => (
                        <button
                          key={s}
                          onClick={() => toggle(skills, setSkills, s)}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-xs transition-colors',
                            skills.includes(s) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {skills.length > 0 && (
                <p className="text-xs text-primary font-medium">{skills.length} selecionada{skills.length > 1 ? 's' : ''}</p>
              )}
              <Button className="w-full" onClick={() => setStep(3)} disabled={skills.length === 0}>
                Continuar
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex flex-wrap gap-2">
                {DREAM_OPTIONS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => toggle(dreams, setDreams, d.id)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors',
                      dreams.includes(d.id) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <Button className="w-full" onClick={() => setStep(4)} disabled={dreams.length === 0}>
                Continuar
              </Button>
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2">
                {INVEST_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setInvest(o.id)}
                    className={cn(
                      'w-full rounded-md border p-3 text-left text-sm transition-colors',
                      invest === o.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <Button className="w-full" onClick={finish} disabled={busy}>
                {busy ? 'Salvando…' : 'Começar a usar'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
