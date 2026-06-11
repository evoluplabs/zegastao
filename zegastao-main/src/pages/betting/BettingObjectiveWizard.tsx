import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles, Trophy, Wallet, CalendarDays, Target } from 'lucide-react';
import { cn, formatBRL } from '@/lib/utils';
import { BETTING_LEAGUES, BettingProfile } from '@/types';

export interface ObjectiveParams {
  leagueSportKeys: string[];
  sessionBudget: number;
  date: string;
  teamPreferences: string[];
}

interface Props {
  profile: BettingProfile;
  remainingBudget: number;
  onAnalyze: (params: ObjectiveParams) => void;
  onCancel: () => void;
}

const STEPS = [
  { icon: Trophy, title: 'Campeonatos' },
  { icon: Wallet, title: 'Orçamento' },
  { icon: CalendarDays, title: 'Data' },
  { icon: Target, title: 'Times' },
];

export function BettingObjectiveWizard({ profile, remainingBudget, onAnalyze, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [leagues, setLeagues] = useState<string[]>([BETTING_LEAGUES[0].key]);
  const maxBudget = Math.max(5, Math.floor(remainingBudget || profile.weeklyBudget));
  const [budget, setBudget] = useState<number>(Math.max(5, Math.round((remainingBudget || profile.weeklyBudget) * 0.4)));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [teamsText, setTeamsText] = useState('');

  function toggleLeague(key: string) {
    setLeagues((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const canAdvance = step === 0 ? leagues.length > 0 : step === 1 ? budget > 0 : true;

  function finish() {
    const teamPreferences = teamsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onAnalyze({ leagueSportKeys: leagues, sessionBudget: budget, date, teamPreferences });
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={s.title} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                  done ? 'border-emerald-500 bg-emerald-500 text-white'
                    : active ? 'border-emerald-400 text-emerald-400'
                    : 'border-slate-700 text-slate-500'
                )}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn('text-[10px]', active ? 'text-emerald-400' : 'text-slate-500')}>{s.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('mx-1 h-0.5 flex-1', i < step ? 'bg-emerald-500' : 'bg-slate-700')} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-52 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Quais campeonatos?</h3>
              <p className="text-sm text-slate-400">Escolha um ou mais. Vamos buscar os jogos do dia.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {BETTING_LEAGUES.map((l) => {
                const sel = leagues.includes(l.key);
                return (
                  <button
                    key={l.key}
                    onClick={() => toggleLeague(l.key)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      sel ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500'
                    )}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Orçamento desta sessão</h3>
              <p className="text-sm text-slate-400">Disponível esta semana: {formatBRL(remainingBudget)}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-extrabold text-emerald-400">{formatBRL(budget)}</span>
              </div>
              <input
                type="range"
                min={5}
                max={maxBudget}
                step={1}
                value={Math.min(budget, maxBudget)}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>R$ 5</span>
                <span>{formatBRL(maxBudget)}</span>
              </div>
              <p className="rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-400">
                Distribuímos esse valor entre os jogos com maior confiança. Você nunca aposta mais que o definido aqui.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Qual dia?</h3>
              <p className="text-sm text-slate-400">Buscamos os jogos dos campeonatos nessa data.</p>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Times de preferência</h3>
              <p className="text-sm text-slate-400">Opcional. Separe por vírgula, ou deixe vazio para todos os jogos do dia.</p>
            </div>
            <input
              type="text"
              value={teamsText}
              onChange={(e) => setTeamsText(e.target.value)}
              placeholder="Ex: Flamengo, Palmeiras"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={() => setTeamsText('')}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                !teamsText ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-slate-700 text-slate-300'
              )}
            >
              Analisar todos os jogos do dia
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}
          className="flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:border-slate-500"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 0 ? 'Cancelar' : 'Voltar'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => canAdvance && setStep(step + 1)}
            disabled={!canAdvance}
            className="flex items-center gap-1 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
          >
            Continuar
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={finish}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            <Sparkles className="h-4 w-4" />
            Analisar agora
          </button>
        )}
      </div>
    </div>
  );
}
