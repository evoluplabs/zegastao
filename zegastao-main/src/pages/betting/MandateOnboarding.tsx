import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { Button } from '@/components/ui/button';
import { cn, formatBRL } from '@/lib/utils';
import { BETTING_LEAGUES, ZE_RISK_LEVELS, ZeRiskLevel } from '@/types';
import { ShieldCheck, AlertTriangle, Sparkles, Target, Wallet, Trophy, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const zeMandate = httpsCallable<unknown, { success: boolean }>(functions, 'zeMandate');

interface Props {
  onComplete: () => void;
}

const CLAUSES = [
  'Entendo que apostas esportivas envolvem risco de perda total do valor apostado.',
  'Entendo que o Zé Apostador faz análise inteligente, não garante resultado nenhum.',
  'Entendo que múltiplas grandes (fézinha de sorte) têm a matemática contra mim e a casa lucra mais com elas.',
  'Só aposto dinheiro que eu posso perder sem fazer falta no mês.',
  'Aceito ser alertado e pausado pelo Zé se eu começar a exagerar.',
];

const STEPS = ['Orçamento', 'Meta', 'Campeonatos', 'Risco', 'Termos'];

export function MandateOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState(10);
  const [growth, setGrowth] = useState(50);
  const [stopLoss, setStopLoss] = useState(50);
  const [leagues, setLeagues] = useState<string[]>([BETTING_LEAGUES[0].key]);
  const [teamsText, setTeamsText] = useState('');
  const [riskLevel, setRiskLevel] = useState<ZeRiskLevel>(1);
  const [accepted, setAccepted] = useState<boolean[]>(CLAUSES.map(() => false));
  const [saving, setSaving] = useState(false);

  const allAccepted = accepted.every(Boolean);

  function toggleLeague(key: string) {
    setLeagues((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function save() {
    setSaving(true);
    try {
      await zeMandate({
        action: 'save',
        cycleBudget: budget,
        growthTargetPct: growth,
        stopLossPct: stopLoss,
        preferredLeagues: leagues,
        preferredTeams: teamsText.split(',').map((t) => t.trim()).filter(Boolean),
        blockedTeams: [],
        maxAutoRiskLevel: riskLevel,
        allowMultiples: true,
        acceptedRiskDisclaimer: true,
      });
      onComplete();
    } catch {
      setSaving(false);
    }
  }

  const canAdvance = step === 2 ? leagues.length > 0 : step === 4 ? allAccepted : true;
  const target = budget * (1 + growth / 100);

  return (
    <div className="mx-auto max-w-md space-y-6 p-4">
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          <Sparkles className="h-3 w-3" /> Zé Apostador 2.0
        </div>
        <h2 className="text-2xl font-bold text-slate-100">Monte seu mandato</h2>
        <p className="text-sm text-slate-400">Defina as regras uma vez. Depois o Zé trabalha por você.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs',
                i < step ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                  : i === step ? 'border-emerald-400 text-emerald-400' : 'border-slate-700 text-slate-500')}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('text-[9px]', i === step ? 'text-emerald-400' : 'text-slate-500')}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cn('mx-1 h-0.5 flex-1', i < step ? 'bg-emerald-500' : 'bg-slate-700')} />}
          </div>
        ))}
      </div>

      <div className="min-h-56 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-100"><Wallet className="h-5 w-5 text-emerald-400" /><h3 className="text-lg font-bold">Orçamento do ciclo</h3></div>
            <p className="text-sm text-slate-400">Quanto você topa colocar neste ciclo? É o teto — o Zé nunca passa disso.</p>
            <div className="text-3xl font-extrabold text-emerald-400">{formatBRL(budget)}</div>
            <input type="range" min={2} max={100} step={1} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full accent-emerald-500" />
            <div className="flex justify-between text-xs text-slate-500"><span>R$ 2</span><span>R$ 100</span></div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-100"><Target className="h-5 w-5 text-emerald-400" /><h3 className="text-lg font-bold">Meta do ciclo</h3></div>
            <p className="text-sm text-slate-400">Quanto você quer fazer a banca crescer antes de sacar?</p>
            <div className="flex gap-2 flex-wrap">
              {[20, 50, 100, 200].map((v) => (
                <button key={v} onClick={() => setGrowth(v)} className={cn('rounded-full border px-3 py-1.5 text-sm', growth === v ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-slate-700 text-slate-300')}>+{v}%</button>
              ))}
            </div>
            <p className="rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-400">
              Sai de {formatBRL(budget)} mirando {formatBRL(target)}. Stop-loss em {stopLoss}%: se a banca cair pra {formatBRL(budget * (1 - stopLoss / 100))}, o Zé encerra pra te proteger.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-100"><Trophy className="h-5 w-5 text-emerald-400" /><h3 className="text-lg font-bold">Onde apostar</h3></div>
            <div className="flex flex-wrap gap-2">
              {BETTING_LEAGUES.map((l) => (
                <button key={l.key} onClick={() => toggleLeague(l.key)} className={cn('rounded-full border px-3 py-1.5 text-sm', leagues.includes(l.key) ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-slate-700 text-slate-300')}>{l.label}</button>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Times de preferência (opcional, separe por vírgula)</p>
              <input value={teamsText} onChange={(e) => setTeamsText(e.target.value)} placeholder="Ex: Brasil, Argentina" className="h-10 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-100">Quanto controle dar ao Zé?</h3>
            <p className="text-sm text-slate-400">Você sempre confirma antes de apostar. Isso define o estilo das sugestões.</p>
            {ZE_RISK_LEVELS.map((r) => (
              <button key={r.level} onClick={() => setRiskLevel(r.level)} className={cn('w-full rounded-xl border p-3 text-left transition-colors', riskLevel === r.level ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-700 hover:border-slate-600')}>
                <div className="flex items-center gap-2 font-semibold text-slate-100">{r.emoji} {r.label}</div>
                <p className="text-xs text-slate-400">{r.desc}</p>
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-400" /><h3 className="text-lg font-bold text-slate-100">Jogo responsável</h3></div>
            {CLAUSES.map((clause, i) => (
              <label key={i} className={cn('flex items-start gap-3 rounded-xl border p-3 cursor-pointer', accepted[i] ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-700')}>
                <input type="checkbox" checked={accepted[i]} onChange={(e) => { const n = [...accepted]; n[i] = e.target.checked; setAccepted(n); }} className="mt-0.5 h-4 w-4 accent-emerald-500" />
                <span className="text-sm leading-relaxed text-slate-300">{clause}</span>
              </label>
            ))}
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300/90">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Aposta é diversão, não fonte de renda. Jogue com cabeça.
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /> Voltar</button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => canAdvance && setStep(step + 1)} disabled={!canAdvance} className="flex items-center gap-1 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40">Continuar <ChevronRight className="h-4 w-4" /></button>
        ) : (
          <Button onClick={save} loading={saving} disabled={!allAccepted} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400">Ativar Zé Apostador</Button>
        )}
      </div>
    </div>
  );
}
