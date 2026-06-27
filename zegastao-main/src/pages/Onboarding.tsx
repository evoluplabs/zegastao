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
import type { AccountType } from '@/types';

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

const ACCOUNT_SHORTCUTS = [
  { name: 'Nubank', emoji: '💜', type: 'checking' as AccountType },
  { name: 'Itaú', emoji: '🟠', type: 'checking' as AccountType },
  { name: 'Bradesco', emoji: '🔴', type: 'checking' as AccountType },
  { name: 'Caixa', emoji: '🔵', type: 'checking' as AccountType },
  { name: 'Inter', emoji: '🟡', type: 'checking' as AccountType },
  { name: 'Carteira', emoji: '💵', type: 'wallet' as AccountType },
];

interface OnboardingAccount {
  name: string;
  type: AccountType;
  balance: number;
  emoji: string;
}

// Onboarding essencial: sem dados o app não tem utilidade.
// Coleta skills e investmentGoals (obrigatórios) — base do copiloto por fase.
export function Onboarding() {
  const { user, profile, authLoading, setProfile: setStoreProfile } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.name || '');
  const [income, setIncome] = useState(0);
  // Contas bancárias (step 1)
  const [accounts, setAccounts] = useState<OnboardingAccount[]>([]);
  const [addingAccount, setAddingAccount] = useState<Partial<OnboardingAccount> | null>(null);
  const [debt, setDebt] = useState({ name: '', balance: 0, payment: 0, rate: 0 });
  const [skills, setSkills] = useState<string[]>([]);
  const [dreams, setDreams] = useState<string[]>([]);
  const [invest, setInvest] = useState<'yes' | 'no' | 'no_idea' | 'skip'>('no_idea');
  const [busy, setBusy] = useState(false);

  if (!authLoading && !user) return <Navigate to="/login" replace />;
  if (profile?.onboardingDone) return <Navigate to="/dashboard" replace />;

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  function startAddAccount(shortcut?: typeof ACCOUNT_SHORTCUTS[0]) {
    setAddingAccount(shortcut ? { name: shortcut.name, type: shortcut.type, emoji: shortcut.emoji, balance: 0 } : { name: '', type: 'checking', emoji: '🏦', balance: 0 });
  }

  function confirmAccount() {
    if (!addingAccount?.name) return;
    setAccounts((prev) => [...prev, {
      name: addingAccount.name!,
      type: addingAccount.type ?? 'checking',
      balance: addingAccount.balance ?? 0,
      emoji: addingAccount.emoji ?? '🏦',
    }]);
    setAddingAccount(null);
  }

  function removeAccount(i: number) {
    setAccounts((prev) => prev.filter((_, idx) => idx !== i));
  }

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

      // Salvar contas bancárias
      for (const acc of accounts) {
        await addUserDoc('accounts', acc as unknown as Record<string, unknown>);
      }

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
      track(Events.ONBOARDING_COMPLETED, { skills: skills.length, dreams: dreams.length, accounts: accounts.length });
      if (user) registerForPushNotifications(user.uid).catch(() => {});
      navigate('/dashboard?welcome=1');
    } finally {
      setBusy(false);
    }
  }

  const STEPS = [
    { label: 'Aventureiro', emoji: '⚔️' },
    { label: 'Equipamentos', emoji: '🛡️' },
    { label: 'Inimigos', emoji: '☠️' },
    { label: 'Habilidades', emoji: '⚡' },
    { label: 'Objetivos', emoji: '🏆' },
    { label: 'Estilo', emoji: '📈' },
  ];

  const STEP_TITLES = [
    'Criação de Personagem ⚔️',
    'Seus Equipamentos 🛡️',
    'Seus Inimigos ☠️',
    'Suas Habilidades ⚡',
    'Seus Objetivos 🏆',
    'Estilo de Combate 📈',
  ];

  const STEP_DESCRIPTIONS = [
    'Qual é o nome do seu aventureiro?',
    'Suas contas e armas financeiras (opcional)',
    'Os bosses que você precisa derrotar (opcional)',
    'O que você sabe fazer bem para ganhar ouro extra?',
    'Qual é o seu objetivo final nesta aventura?',
    'Como você prefere acumular ouro?',
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 dark:from-primary/10 dark:via-background dark:to-primary/5 p-4 gap-6">
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
          <CardTitle>{STEP_TITLES[step]}</CardTitle>
          <CardDescription>
            {STEP_DESCRIPTIONS[step]}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 0: Você */}
          {step === 0 && (
            <>
              <div className="space-y-1">
                <Label>Nome do seu aventureiro</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
              </div>
              <CurrencyInput
                label="Ouro mensal (renda líquida)"
                value={income}
                onChange={setIncome}
              />
              <Button className="w-full" onClick={() => setStep(1)} disabled={!name || !income}>
                Continuar
              </Button>
            </>
          )}

          {/* Step 1: Contas bancárias */}
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">
                Registre seus equipamentos (contas bancárias) para ver seu patrimônio total. 100% opcional.
              </p>

              {/* Lista de contas adicionadas */}
              {accounts.length > 0 && (
                <div className="space-y-2">
                  {accounts.map((acc, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border bg-card px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{acc.emoji}</span>
                        <div>
                          <p className="text-sm font-medium">{acc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => removeAccount(i)} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline form para adicionar conta */}
              {addingAccount ? (
                <div className="rounded-xl border bg-secondary/30 p-3 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      className="w-12 px-2 text-center"
                      value={addingAccount.emoji ?? '🏦'}
                      onChange={(e) => setAddingAccount((p) => ({ ...p, emoji: e.target.value }))}
                      maxLength={2}
                    />
                    <Input
                      className="flex-1"
                      placeholder="Nome da conta"
                      value={addingAccount.name ?? ''}
                      onChange={(e) => setAddingAccount((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <CurrencyInput
                    label="Saldo atual"
                    value={addingAccount.balance ?? 0}
                    onChange={(v) => setAddingAccount((p) => ({ ...p, balance: v }))}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setAddingAccount(null)}>Cancelar</Button>
                    <Button size="sm" className="flex-1" onClick={confirmAccount} disabled={!addingAccount.name}>Adicionar</Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Atalhos de bancos */}
                  <div className="flex flex-wrap gap-1.5">
                    {ACCOUNT_SHORTCUTS.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => startAddAccount(s)}
                        className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent transition-colors"
                      >
                        {s.emoji} {s.name}
                      </button>
                    ))}
                    <button
                      onClick={() => startAddAccount()}
                      className="rounded-full border border-dashed px-2.5 py-1 text-xs hover:bg-accent transition-colors text-muted-foreground"
                    >
                      + Outra conta
                    </button>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Pular</Button>
                <Button className="flex-1" onClick={() => setStep(2)}>
                  {accounts.length > 0 ? `Continuar (${accounts.length} conta${accounts.length > 1 ? 's' : ''})` : 'Continuar'}
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Dívidas */}
          {step === 2 && (
            <>
              <div className="space-y-1">
                <Label>Nome do inimigo (credor)</Label>
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
                  <p className="text-xs text-muted-foreground mt-0.5">Importe depois e o sistema detecta os bosses automaticamente.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Pular</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>Continuar</Button>
              </div>
            </>
          )}

          {/* Step 3: Habilidades */}
          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">
                Usamos isso para gerar bounties (missões de renda extra) sob medida. Selecione pelo menos 1.
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
              <Button className="w-full" onClick={() => setStep(4)} disabled={skills.length === 0}>
                Continuar
              </Button>
            </>
          )}

          {/* Step 4: Sonhos */}
          {step === 4 && (
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
              <Button className="w-full" onClick={() => setStep(5)} disabled={dreams.length === 0}>
                Continuar
              </Button>
            </>
          )}

          {/* Step 5: Investimentos */}
          {step === 5 && (
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
                {busy ? 'Criando personagem…' : '⚔️ Criar Personagem e Entrar'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
