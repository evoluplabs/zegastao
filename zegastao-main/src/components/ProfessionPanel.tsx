import { cn } from '@/lib/utils';
import { professionLevel, PROFESSION_ICONS, PROFESSION_LABELS } from '@/lib/xp';
import type { Profession } from '@/lib/xp';

interface ProfessionPanelProps {
  professionXP?: Partial<Record<Profession, number>>;
  className?: string;
}

const PROFESSIONS: Profession[] = ['poupador', 'quitador', 'freelancer', 'investidor'];

const PROFESSION_DESCRIPTIONS: Record<Profession, string> = {
  poupador:   'Depósitos na Caixinha',
  quitador:   'Dívidas atacadas',
  freelancer: 'Renda extra gerada',
  investidor: 'Patrimônio construído',
};

export function ProfessionPanel({ professionXP = {}, className }: ProfessionPanelProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {PROFESSIONS.map((prof) => {
        const xp = professionXP[prof] ?? 0;
        const lv = professionLevel(xp);
        const maxXP = (lv + 1) * 50;
        const pct = lv >= 10 ? 100 : Math.round(((xp - lv * 50) / 50) * 100);

        return (
          <div key={prof} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{PROFESSION_ICONS[prof]}</span>
                <div>
                  <p className="text-xs font-bold text-foreground">{PROFESSION_LABELS[prof]}</p>
                  <p className="text-[10px] text-muted-foreground">Lv {lv}</p>
                </div>
              </div>
              {lv >= 5 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                  ⭐ {lv >= 8 ? 'Elite' : 'Pro'}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">{PROFESSION_DESCRIPTIONS[prof]}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
