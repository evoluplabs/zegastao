// E4 — Árvore de Skills por profissão
import { Lock, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { professionLevel, PROFESSION_LABELS, PROFESSION_ICONS, type Profession } from '@/lib/xp';
import { getSkillsForProfession, isSkillUnlocked } from '@/lib/rpg/skills';
import { cn } from '@/lib/utils';

const PROFESSIONS: Profession[] = ['poupador', 'quitador', 'freelancer', 'investidor'];

const PROFESSION_ACCENT: Record<Profession, string> = {
  poupador:   'text-primary border-primary/30 bg-primary/5',
  quitador:   'text-boss border-boss/30 bg-boss/5',
  freelancer: 'text-gold border-gold/30 bg-gold/5',
  investidor: 'text-info border-info/30 bg-info/5',
};

const PROFESSION_HEADER: Record<Profession, string> = {
  poupador:   'bg-primary/10',
  quitador:   'bg-boss/10',
  freelancer: 'bg-gold/10',
  investidor: 'bg-info/10',
};

export function SkillTree() {
  const profile = useStore((s) => s.profile);
  const profXP = (profile?.professionXP ?? {}) as Record<string, number>;

  return (
    <div className="space-y-4">
      {PROFESSIONS.map((prof) => {
        const xp = profXP[prof] ?? 0;
        const level = professionLevel(xp);
        const skills = getSkillsForProfession(prof);
        const unlocked = skills.filter((s) => isSkillUnlocked(s, level)).length;

        return (
          <div key={prof} className="rounded-2xl border overflow-hidden">
            {/* Header */}
            <div className={cn('flex items-center gap-3 px-4 py-3', PROFESSION_HEADER[prof])}>
              <span className="text-xl">{PROFESSION_ICONS[prof]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{PROFESSION_LABELS[prof]}</p>
                <p className="text-xs text-muted-foreground">Lv {level} · {xp} XP</p>
              </div>
              <div className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold border', PROFESSION_ACCENT[prof])}>
                {unlocked}/{skills.length} skills
              </div>
            </div>

            {/* XP bar */}
            <div className="px-4 py-2 border-b">
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-current transition-all"
                  style={{ width: `${Math.min(100, (xp % 50) * 2)}%` }}
                />
              </div>
            </div>

            {/* Skills */}
            <ul className="divide-y">
              {skills.map((skill) => {
                const unlocked = isSkillUnlocked(skill, level);
                return (
                  <li key={skill.id} className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-colors',
                    unlocked ? '' : 'opacity-50'
                  )}>
                    <div className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0',
                      unlocked ? PROFESSION_HEADER[prof] : 'bg-secondary'
                    )}>
                      {unlocked ? skill.emoji : <Lock className="h-4 w-4 text-muted-foreground/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-semibold',
                        unlocked ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {skill.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{skill.desc}</p>
                    </div>
                    {unlocked
                      ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      : (
                        <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                          Lv {skill.unlockLevel}
                        </span>
                      )
                    }
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
