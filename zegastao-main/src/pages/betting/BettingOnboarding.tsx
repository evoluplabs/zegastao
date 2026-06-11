import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { formatBRL } from '@/lib/utils';

const saveBettingProfile = httpsCallable<unknown, { success: boolean }>(functions, 'bettingProfile');
const suggestBudgetFn = httpsCallable<unknown, { budget: number; reasoning: string }>(functions, 'bettingProfile');

interface Props {
  onComplete: () => void;
}

const CLAUSES = [
  'Entendo que apostas esportivas envolvem risco de perda total do valor apostado.',
  'Entendo que a análise da IA é educacional e não garante resultados.',
  'Entendo que posso desenvolver comportamento compulsivo e aceito ser alertado pelo Copiloto.',
  'Meu limite semanal é definido pela IA com base nos meus gastos reais e posso revisá-lo a qualquer momento.',
  'Nunca apostei (nem apostarei) dinheiro que não posso perder.',
];

export function BettingOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState<'intro' | 'budget' | 'clauses' | 'saving'>('intro');
  const [suggestedBudget, setSuggestedBudget] = useState<number | null>(null);
  const [budgetReasoning, setBudgetReasoning] = useState('');
  const [finalBudget, setFinalBudget] = useState<number>(10);
  const [accepted, setAccepted] = useState<boolean[]>(CLAUSES.map(() => false));
  const [loading, setLoading] = useState(false);

  async function loadSuggestion() {
    setLoading(true);
    try {
      const res = await suggestBudgetFn({ action: 'suggest_budget' });
      setSuggestedBudget(res.data.budget);
      setFinalBudget(res.data.budget);
      setBudgetReasoning(res.data.reasoning);
    } catch {
      setSuggestedBudget(10);
      setFinalBudget(10);
      setBudgetReasoning('Valor sugerido com base no seu perfil financeiro.');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setStep('saving');
    try {
      await saveBettingProfile({
        action: 'accept_and_save',
        weeklyBudget: finalBudget,
      });
      onComplete();
    } catch {
      setStep('clauses');
    }
  }

  const allAccepted = accepted.every(Boolean);

  if (step === 'intro') {
    return (
      <div className="max-w-md mx-auto space-y-6 p-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary mb-4">
            <Sparkles className="h-3 w-3" />
            Zé Apostador — Beta
          </div>
          <h2 className="text-2xl font-bold mb-2">Apostas com cabeça</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Antes de começar, o Copiloto vai analisar seus gastos e sugerir um limite semanal que <strong>não vai pesar no seu bolso</strong>.
          </p>
        </div>

        <div className="rounded-2xl border bg-amber-50 border-amber-100 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4" />
            Leia antes de continuar
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Apostas esportivas envolvem risco real de perda. O Zé Apostador oferece <strong>análise inteligente</strong>, não garantia de resultado. Você é o único responsável pelas suas decisões.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-green-700 text-xs font-bold">1</span>
            </div>
            <p><strong>Limite personalizado:</strong> O Copiloto analisa seus vazamentos financeiros e sugere um valor que você já desperdiçaria de qualquer forma.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-green-700 text-xs font-bold">2</span>
            </div>
            <p><strong>9 agentes de IA:</strong> Cada aposta é analisada por agentes especializados em forma, H2H, odds, lesões e muito mais.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-green-700 text-xs font-bold">3</span>
            </div>
            <p><strong>Você decide:</strong> O app recomenda. A decisão final é sempre sua. Nunca executa apostas automaticamente.</p>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => { setStep('budget'); loadSuggestion(); }}
        >
          Entender meu limite semanal
        </Button>
      </div>
    );
  }

  if (step === 'budget') {
    return (
      <div className="max-w-md mx-auto space-y-6 p-4">
        <h2 className="text-xl font-bold">Seu limite semanal</h2>

        {loading ? (
          <div className="rounded-2xl border bg-card p-6 text-center space-y-2">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">O Copiloto está analisando seus gastos…</p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">{budgetReasoning}</p>
            <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-100 px-4 py-3">
              <span className="text-sm font-medium">Sugestão do Copiloto</span>
              <span className="text-2xl font-bold text-green-700">{formatBRL(suggestedBudget ?? finalBudget)}<span className="text-sm font-normal text-muted-foreground">/semana</span></span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Quer ajustar?</p>
          <div className="flex gap-2 flex-wrap">
            {[5, 10, 15, 20, 30, 50].map((v) => (
              <button
                key={v}
                onClick={() => setFinalBudget(v)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                  finalBudget === v
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-accent'
                )}
              >
                {formatBRL(v)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Limite máximo: R$50/semana. Você pode alterar conversando com o Copiloto.</p>
        </div>

        <Button className="w-full" onClick={() => setStep('clauses')} disabled={loading}>
          Continuar com {formatBRL(finalBudget)}/semana
        </Button>
      </div>
    );
  }

  if (step === 'clauses') {
    return (
      <div className="max-w-md mx-auto space-y-6 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Termos de uso responsável</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Marque cada item para confirmar que você leu e entendeu:
        </p>

        <div className="space-y-3">
          {CLAUSES.map((clause, i) => (
            <label
              key={i}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
                accepted[i] ? 'bg-green-50 border-green-200' : 'hover:bg-accent/50'
              )}
            >
              <input
                type="checkbox"
                checked={accepted[i]}
                onChange={(e) => {
                  const next = [...accepted];
                  next[i] = e.target.checked;
                  setAccepted(next);
                }}
                className="mt-0.5 h-4 w-4 accent-green-600"
              />
              <span className="text-sm leading-relaxed">{clause}</span>
            </label>
          ))}
        </div>

        <Button
          className="w-full"
          onClick={save}
          disabled={!allAccepted}
        >
          Confirmar e ativar Zé Apostador
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-40">
      <div className="text-center space-y-2">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground">Ativando seu perfil…</p>
      </div>
    </div>
  );
}
