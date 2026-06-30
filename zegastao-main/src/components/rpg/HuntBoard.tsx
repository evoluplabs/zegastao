// E2/E7 — Caçada de Renda Extra
// Bounty board com gestão real: aceitar → acompanhar → concluir (gera renda + XP)
// ou abandonar. Caçadas persistidas em users/{uid}/hunts. Zero IA.
import { useState } from 'react';
import { Swords, Zap, CheckCircle2, Plus, Play, Trophy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useDebts } from '@/hooks/useDebts';
import { useUserCollection } from '@/hooks/useCollection';
import { addUserDoc, updateUserDoc, deleteUserDoc, awardProfessionXp } from '@/lib/firestore';
import { Badge } from '@/components/ui/badge';
import { cn, formatBRL } from '@/lib/utils';
import {
  generateHuntEncounters, freelancerPower, maxEncountersByPower,
  TIER_CONFIG, type HuntTier, type HuntEncounter,
} from '@/lib/rpg/hunt';
import type { Hunt } from '@/types';

const TIERS: HuntTier[] = ['T1', 'T2', 'T3'];

// ── Card de caçada ativa (aceita / em progresso) ──
function ActiveHuntCard({ hunt, onProgress, onComplete, onAbandon }: {
  hunt: Hunt;
  onProgress: (h: Hunt) => void;
  onComplete: (h: Hunt, earned: number) => void;
  onAbandon: (h: Hunt) => void;
}) {
  const cfg = TIER_CONFIG[hunt.tier];
  const [completing, setCompleting] = useState(false);
  const [earned, setEarned] = useState(String(hunt.estimatedReturnValue || ''));
  const inProgress = hunt.status === 'in_progress';

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', inProgress ? 'border-gold/40 bg-gold/5' : 'border-border bg-card')}>
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0', cfg.bg)}>
          {cfg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm leading-snug">{hunt.title}</p>
            {inProgress && <span className="text-[9px] font-bold uppercase tracking-wide text-gold">em progresso</span>}
            {hunt.source === 'custom' && <Badge variant="outline" className="text-[9px] h-4 px-1.5">própria</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            💰 {hunt.estimatedReturn || formatBRL(hunt.estimatedReturnValue)}
            {hunt.estimatedTime && ` · ⏱ ${hunt.estimatedTime}`}
            {hunt.platform && ` · ${hunt.platform}`}
          </p>
          {hunt.drop && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Drop: <span className="text-gold font-semibold">{hunt.drop}</span>
            </p>
          )}
        </div>
        <span className={cn('text-xs font-bold shrink-0', cfg.color)}>+{hunt.xpReward} XP</span>
      </div>

      {!completing ? (
        <div className="flex items-center gap-2">
          {!inProgress && (
            <button
              onClick={() => onProgress(hunt)}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
            >
              <Play className="h-3 w-3" /> Iniciar
            </button>
          )}
          <button
            onClick={() => setCompleting(true)}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/25 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
          </button>
          <button
            onClick={() => onAbandon(hunt)}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-boss hover:border-boss/30 transition-colors"
          >
            Abandonar
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary">Quanto você recebeu nesta caçada?</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">R$</span>
            <input
              value={earned}
              onChange={(e) => setEarned(e.target.value)}
              inputMode="decimal"
              autoFocus
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Vamos registrar como renda extra e creditar +{hunt.xpReward} XP de Freelancer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const v = parseFloat(earned.replace(',', '.'));
                onComplete(hunt, isNaN(v) || v < 0 ? 0 : v);
              }}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
            >
              🎉 Confirmar conclusão
            </button>
            <button onClick={() => setCompleting(false)} className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Card de encontro disponível (catálogo) ──
function EncounterCard({ enc, onAccept }: { enc: HuntEncounter; onAccept: (enc: HuntEncounter) => void }) {
  const cfg = TIER_CONFIG[enc.tier];
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 hover:border-primary/30 transition-colors">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0', cfg.bg)}>
        {cfg.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-snug">{enc.title}</p>
        {enc.debtContext && <p className="text-[11px] font-semibold text-primary mt-0.5">{enc.debtContext}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">
          💰 {enc.estimatedReturn} · ⏱ {enc.estimatedTime}
          {enc.platform && ` · ${enc.platform}`}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Drop: <span className="text-gold font-semibold">{enc.drop}</span>
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={cn('text-xs font-bold', cfg.color)}>+{enc.xpReward} XP</span>
        <button
          onClick={() => onAccept(enc)}
          className="flex items-center gap-1 rounded-lg bg-gold/15 px-2.5 py-1 text-[10px] font-bold text-gold hover:bg-gold/25 transition-colors"
        >
          <Plus className="h-3 w-3" /> Aceitar
        </button>
      </div>
    </div>
  );
}

// ── Formulário de caçada personalizada ──
function CustomHuntForm({ onCreate, onCancel }: { onCreate: (h: Omit<Hunt, 'id'>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [tier, setTier] = useState<HuntTier>('T1');

  function submit() {
    const v = parseFloat(value.replace(',', '.')) || 0;
    if (!title.trim()) return;
    const hunt: Omit<Hunt, 'id'> = {
      title: title.trim(),
      tier,
      xpReward: TIER_CONFIG[tier].xp,
      estimatedReturnValue: v,
      status: 'accepted',
      source: 'custom',
      acceptedAt: new Date().toISOString(),
    };
    if (v > 0) hunt.estimatedReturn = formatBRL(v);
    onCreate(hunt);
  }

  return (
    <div className="rounded-xl border border-gold/30 bg-card p-4 space-y-3">
      <p className="font-bold text-sm">⚔️ Nova caçada personalizada</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex: Vender bolos por encomenda no fim de semana"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
      />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">R$</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="decimal"
          placeholder="retorno estimado"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
        />
      </div>
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-secondary p-1">
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={cn(
              'flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-colors',
              tier === t ? 'bg-gold text-gold-foreground' : 'text-muted-foreground'
            )}
          >
            {TIER_CONFIG[t].emoji} {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={!title.trim()} className="flex-1 py-2 rounded-lg bg-gold text-gold-foreground text-xs font-bold disabled:opacity-50">
          Criar caçada
        </button>
        <button onClick={onCancel} className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function HuntBoard() {
  const profile = useStore((s) => s.profile);
  const { data: debts } = useDebts();
  const { data: hunts = [] } = useUserCollection<Hunt>('hunts');
  const [activeTier, setActiveTier] = useState<HuntTier>('T1');
  const [showCustom, setShowCustom] = useState(false);

  const skills = profile?.skills ?? [];
  const freelancerXP = (profile?.professionXP as Record<string, number> | undefined)?.freelancer ?? 0;
  const power = freelancerPower(freelancerXP);
  const maxEnc = maxEncountersByPower(power);

  const activeHunts = hunts.filter((h) => h.status === 'accepted' || h.status === 'in_progress');
  const completedCount = hunts.filter((h) => h.status === 'completed').length;
  const totalEarned = hunts
    .filter((h) => h.status === 'completed')
    .reduce((s, h) => s + (h.earnedValue ?? 0), 0);
  const activeTitles = new Set(activeHunts.map((h) => h.title));

  // Encontros do catálogo ainda não aceitos.
  const encounters = generateHuntEncounters(skills, debts, activeTier)
    .filter((e) => !activeTitles.has(e.title))
    .slice(0, maxEnc);

  async function acceptHunt(enc: HuntEncounter) {
    await addUserDoc('hunts', {
      title: enc.title,
      detail: enc.detail ?? null,
      tier: enc.tier,
      xpReward: enc.xpReward,
      estimatedReturnValue: enc.estimatedReturnValue ?? 0,
      estimatedReturn: enc.estimatedReturn ?? null,
      estimatedTime: enc.estimatedTime ?? null,
      platform: enc.platform ?? null,
      drop: enc.drop ?? null,
      status: 'accepted',
      source: 'catalog',
      acceptedAt: new Date().toISOString(),
    });
  }

  async function createCustom(h: Omit<Hunt, 'id'>) {
    await addUserDoc('hunts', { ...h });
    setShowCustom(false);
  }

  async function setProgress(h: Hunt) {
    await updateUserDoc('hunts', h.id, { status: 'in_progress' });
  }

  async function abandonHunt(h: Hunt) {
    await deleteUserDoc('hunts', h.id);
  }

  // Concluir = renda real + XP persistente de Freelancer.
  async function completeHunt(h: Hunt, earned: number) {
    if (earned > 0) {
      await addUserDoc('transactions', {
        date: new Date().toISOString().slice(0, 10),
        description: `Caçada: ${h.title}`,
        amount: Math.abs(earned),
        type: 'in',
        category: 'Renda extra',
        aiConfidence: 1,
        aiCategorized: false,
        userCorrected: true,
        source: 'hunt',
      });
    }
    await awardProfessionXp('freelancer', h.xpReward).catch(() => {});
    await updateUserDoc('hunts', h.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      earnedValue: earned,
    });
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho — Seu Poder */}
      <div className="rounded-2xl border bg-card p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gold/10 flex items-center justify-center text-2xl shrink-0">⚔️</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seu Poder</p>
          <p className="font-display font-bold text-foreground">Lv {power} Freelancer</p>
          <p className="text-xs text-muted-foreground">{freelancerXP.toLocaleString('pt-BR')} XP · vê até {maxEnc} encontros</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end"><Trophy className="h-3 w-3" /> Concluídas</p>
          <p className="font-display font-bold text-gold">{completedCount}</p>
          {totalEarned > 0 && <p className="text-[10px] text-success">{formatBRL(totalEarned)}</p>}
        </div>
      </div>

      {/* Caçadas ativas */}
      {activeHunts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Swords className="h-3.5 w-3.5" /> Caçadas ativas ({activeHunts.length})
          </p>
          {activeHunts.map((h) => (
            <ActiveHuntCard key={h.id} hunt={h} onProgress={setProgress} onComplete={completeHunt} onAbandon={abandonHunt} />
          ))}
        </div>
      )}

      {/* Caçada personalizada */}
      {showCustom ? (
        <CustomHuntForm onCreate={createCustom} onCancel={() => setShowCustom(false)} />
      ) : (
        <button
          onClick={() => setShowCustom(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gold/20 py-3 text-sm font-semibold text-gold hover:border-gold/40 hover:bg-gold/5 transition-colors"
        >
          <Plus className="h-4 w-4" /> Criar caçada personalizada
        </button>
      )}

      {/* Disponíveis — seletor de tier */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Caçadas disponíveis</p>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-secondary p-1">
          {TIERS.map((tier) => {
            const cfg = TIER_CONFIG[tier];
            const isActive = tier === activeTier;
            return (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors',
                  isActive ? 'bg-gold text-gold-foreground' : 'text-muted-foreground'
                )}
              >
                <span>{cfg.emoji}</span><span>{tier}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tier info */}
      <div className={cn('rounded-xl border p-3 text-sm', TIER_CONFIG[activeTier].bg)}>
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="font-semibold">{TIER_CONFIG[activeTier].label}</p>
          <Badge variant="outline" className={cn('text-[10px]', TIER_CONFIG[activeTier].color)}>
            +{TIER_CONFIG[activeTier].xp} XP
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{TIER_CONFIG[activeTier].desc}</p>
      </div>

      {/* Encontros disponíveis */}
      {encounters.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {activeTitles.size > 0 ? 'Você já aceitou as caçadas deste tier.' : 'Nenhum encontro disponível para este tier com suas habilidades.'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione habilidades no perfil ou crie uma caçada personalizada.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {encounters.map((enc) => (
            <EncounterCard key={enc.id} enc={enc} onAccept={acceptHunt} />
          ))}
        </div>
      )}
    </div>
  );
}
