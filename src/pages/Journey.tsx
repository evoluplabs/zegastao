import { CheckCircle2, Circle, Trophy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useMilestones, useDailyTasks } from '@/hooks/useJourney';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MILESTONE_ORDER, PHASE_LABELS } from '@/types';

const DIFFICULTY: Record<string, string> = { easy: 'fácil', medium: 'média', hard: 'difícil' };

export function Journey() {
  const profile = useStore((s) => s.profile);
  const milestones = useMilestones();
  const tasks = useDailyTasks();
  const achieved = new Set(milestones.map((m) => m.id));
  const phase = profile?.financialPhase;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sua trilha</h2>
        {phase && <Badge variant="success">Fase: {PHASE_LABELS[phase]}</Badge>}
      </div>

      {/* Tarefas de hoje */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações de hoje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Suas tarefas personalizadas aparecem aqui após o processamento noturno.
            </p>
          )}
          {tasks.map((t, i) => (
            <div key={i} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t.title}</p>
                <Badge variant="outline">{DIFFICULTY[t.difficulty] || t.difficulty}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                ⏱ {t.estimatedTime}
                {t.estimatedReturn ? ` · 💰 ${t.estimatedReturn}` : ''}
                {t.platform ? ` · ${t.platform}` : ''}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trilha de marcos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-500" /> Marcos da jornada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {MILESTONE_ORDER.map((m, i) => {
              const done = achieved.has(m.id);
              return (
                <li key={m.id} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                  <span className={done ? 'text-sm font-medium' : 'text-sm text-muted-foreground'}>
                    {i + 1}. {m.name}
                  </span>
                  {done && <Badge variant="success">conquistado</Badge>}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
