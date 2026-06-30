import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CHARACTER_CLASSES, AVATARS, COMPANION_SPECIES,
  getClass, getAvatar, getSpecies,
  type CharacterClassId,
} from '@/lib/rpg/character';

const ACCENT_RING: Record<string, string> = {
  green: 'border-primary ring-primary/30',
  red: 'border-boss ring-boss/30',
  gold: 'border-gold ring-gold/30',
  sky: 'border-info ring-info/30',
};
const ACCENT_TEXT: Record<string, string> = {
  green: 'text-primary',
  red: 'text-boss',
  gold: 'text-gold',
  sky: 'text-info',
};

export interface CharacterDraft {
  name: string;
  classId: CharacterClassId;
  avatarId: string;
  companionSpeciesId: string;
  companionName: string;
}

interface Props {
  value: CharacterDraft;
  onChange: (v: CharacterDraft) => void;
}

/**
 * Criação de personagem em 3 micro-passos (classe → avatar → companion),
 * estilo MMORPG. Mobile-first: cards grandes, toque fácil, preview vivo.
 */
export function CharacterCreation({ value, onChange }: Props) {
  const [sub, setSub] = useState<0 | 1 | 2>(0);
  const set = (patch: Partial<CharacterDraft>) => onChange({ ...value, ...patch });

  const cls = getClass(value.classId);
  const avatar = getAvatar(value.avatarId);
  const species = getSpecies(value.companionSpeciesId);

  return (
    <div className="space-y-5">
      {/* Preview vivo do personagem */}
      <div className="rpg-panel rpg-panel-gold rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              'h-20 w-20 rounded-2xl flex items-center justify-center text-4xl bg-secondary border-2',
              ACCENT_RING[cls.accent].split(' ')[0]
            )}>
              {avatar.emoji}
            </div>
            {/* Companion espiando */}
            <div className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center text-lg companion-idle">
              {species.emoji}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{cls.title}</p>
            <p className="font-display text-lg font-bold text-foreground truncate">
              {value.name?.trim() || 'Seu aventureiro'}
            </p>
            <p className={cn('text-xs font-semibold', ACCENT_TEXT[cls.accent])}>
              {cls.emoji} {cls.name} · ao lado de {value.companionName?.trim() || species.suggestedName} {species.emoji}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs dos micro-passos */}
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-secondary p-1">
        {['Classe', 'Avatar', 'Companion'].map((t, i) => (
          <button
            key={t}
            onClick={() => setSub(i as 0 | 1 | 2)}
            className={cn(
              'py-2 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-colors truncate',
              sub === i ? 'bg-gold text-gold-foreground' : 'text-muted-foreground'
            )}
          >
            {i + 1}. {t}
          </button>
        ))}
      </div>

      {/* Passo 0 — Classe */}
      {sub === 0 && (
        <div className="space-y-2.5">
          <p className="text-sm text-muted-foreground">Escolha sua classe — ela define seu foco na jornada (dá pra mudar depois).</p>
          <div className="grid gap-2.5">
            {CHARACTER_CLASSES.map((c) => {
              const active = value.classId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => { set({ classId: c.id }); }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all',
                    active
                      ? `bg-secondary ${ACCENT_RING[c.accent]} ring-2`
                      : 'border-border bg-card hover:border-muted-foreground/30'
                  )}
                >
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-background flex items-center justify-center text-2xl">
                    {c.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('font-bold text-sm', active ? ACCENT_TEXT[c.accent] : 'text-foreground')}>
                      {c.name} <span className="text-muted-foreground font-normal">· {c.title}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{c.tagline}</p>
                    <p className={cn('text-[11px] font-semibold mt-0.5', ACCENT_TEXT[c.accent])}>{c.perk}</p>
                  </div>
                  {active && <span className="text-gold text-lg shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setSub(1)}
            className="w-full mt-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
          >
            Próximo: escolher avatar →
          </button>
        </div>
      )}

      {/* Passo 1 — Avatar */}
      {sub === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Escolha a aparência do seu aventureiro.</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {AVATARS.map((a) => {
              const active = value.avatarId === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => set({ avatarId: a.id })}
                  className={cn(
                    'aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 px-1 transition-all min-w-0',
                    active ? 'border-gold ring-2 ring-gold/30 bg-secondary' : 'border-border bg-card hover:border-muted-foreground/30'
                  )}
                >
                  <span className="text-2xl">{a.emoji}</span>
                  <span className="text-[8px] sm:text-[9px] text-muted-foreground truncate max-w-full w-full text-center">{a.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setSub(2)}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
          >
            Próximo: seu companion →
          </button>
        </div>
      )}

      {/* Passo 2 — Companion */}
      {sub === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Todo aventureiro tem um companheiro. Ele fica feliz quando suas finanças vão bem — e pede ajuda quando apertam.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {COMPANION_SPECIES.map((s) => {
              const active = value.companionSpeciesId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => set({
                    companionSpeciesId: s.id,
                    companionName: value.companionName?.trim() ? value.companionName : s.suggestedName,
                  })}
                  className={cn(
                    'rounded-xl border-2 p-2.5 flex flex-col items-center gap-1 transition-all min-w-0',
                    active ? 'border-gold ring-2 ring-gold/30 bg-secondary' : 'border-border bg-card hover:border-muted-foreground/30'
                  )}
                >
                  <span className={cn('text-3xl', active && 'companion-happy')}>{s.emoji}</span>
                  <span className="text-[10px] font-bold text-foreground truncate max-w-full w-full text-center">{s.name}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">{species.blurb}</p>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Dê um nome ao seu companion</label>
            <input
              value={value.companionName}
              onChange={(e) => set({ companionName: e.target.value })}
              placeholder={species.suggestedName}
              maxLength={18}
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}
