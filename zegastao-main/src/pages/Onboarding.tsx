import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { setProfile, addUserDoc } from '@/lib/firestore';
import { registerForPushNotifications } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';
import { track, Events } from '@/lib/analytics';

const SKILL_OPTIONS = [
  'Programação', 'Design', 'Redação', 'Idiomas', 'Aulas particulares',
  'Culinária', 'Marcenaria', 'Elétrica', 'Vendas', 'Marketing',
  'Fotografia', 'Edição de vídeo', 'Costura', 'Beleza',
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
] as const;

// Onboarding essencial: sem dados o app não tem utilidade.
// Coleta skills e investmentGoals (obrigatórios) — base do copiloto por fase.
export function Onboarding() {
  const { user, profile, authLoading, setProfile: setStoreProfile } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.name || '');
  const [income, setIncome] = useState('');
  const [debt, setDebt] = useState({ name: '', balance: '', payment: '', rate: '' });
  const [skills, setSkills] = useState<string[]>([]);
  const [dreams, setDreams] = useState<string[]>([]);
  const [invest, setInvest] = useState<'yes' | 'no' | 'no_idea'>('no_idea');
  const [busy, setBusy] = useState(false);

  if (!authLoading && !user) return <Navigate to="/login" replace />;
  if (profile?.onboardingDone) return <Navigate to="/dashboard" replace />;

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function finish() {
    setBusy(true);
    try {
      const monthlyIncome = parseFloat(income.replace(',', '.')) || 0;
      await setProfile({
        name,
        monthlyIncome,
        skills,
        investmentGoals: dreams,
        alreadyInvests: invest,
        riskProfile: 'conservative',
        onboardingDone: true,
      });

      const balance = parseFloat(debt.balance.replace(',', '.')) || 0;
      if (debt.name && balance > 0) {
        await addUserDoc('debts', {
          creditor: debt.name,
          type: 'Outros',
          totalBalance: balance,
          monthlyPayment: parseFloat(debt.payment.replace(',', '.')) || 0,
          remainingInstallments: 0,
          interestRateMonthly: (parseFloat(debt.rate.replace(',', '.')) || 0) / 100,
          dueDay: 10,
          status: 'active',
        });
      }

      setStoreProfile({ ...profile, name, monthlyIncome, skills, investmentGoals: dreams, onboardingDone: true, setupWizardDone: false });
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
              <div className="space-y-1">
                <Label>Renda mensal líquida (R$)</Label>
                <Input inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="Ex: 4500" />
              </div>
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
                <div className="space-y-1">
                  <Label>Saldo (R$)</Label>
                  <Input inputMode="decimal" value={debt.balance} onChange={(e) => setDebt({ ...debt, balance: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Parcela/mês</Label>
                  <Input inputMode="decimal" value={debt.payment} onChange={(e) => setDebt({ ...debt, payment: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Juros ao mês (%)</Label>
                <Input inputMode="decimal" value={debt.rate} onChange={(e) => setDebt({ ...debt, rate: e.target.value })} placeholder="Ex: 12" />
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
                Usamos isso para sugerir tarefas de renda extra sob medida.
              </p>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggle(skills, setSkills, s)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors',
                      skills.includes(s) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
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
