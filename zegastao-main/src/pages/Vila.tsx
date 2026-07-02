// E7 — A Vila (hub da comunidade)
// Reúne: Loja da Guilda P2P, NPCs (Sábio, Feirante), recompensa diária,
// aliados, ranking e desbloqueio de companions extras.
import { Link } from 'react-router-dom';
import {
  Package, ShoppingBag, MapPin,
  Infinity as InfinityIcon, Lock,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { setProfile } from '@/lib/firestore';
import { useMilestones } from '@/hooks/useJourney';
import { DailyRewardCard } from '@/components/rpg/DailyRewardCard';
import { FriendsPanel } from '@/components/rpg/FriendsPanel';
import { Leaderboard } from '@/components/rpg/Leaderboard';
import { FarmPanel } from '@/components/rpg/FarmPanel';
import { getSpecies } from '@/lib/rpg/character';
import { levelFromXP } from '@/lib/xp';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type VilaTab = 'vila' | 'fazenda' | 'aliados' | 'ranking';

// Companions desbloqueáveis por metas de caixinha concluídas
const COMPANION_UNLOCKS: { speciesId: string; requiredCaixinhas: number; label: string }[] = [
  { speciesId: 'dragon',  requiredCaixinhas: 0, label: 'Inicial' },
  { speciesId: 'fox',     requiredCaixinhas: 1, label: '1 meta concluída' },
  { speciesId: 'owl',     requiredCaixinhas: 2, label: '2 metas concluídas' },
  { speciesId: 'cat',     requiredCaixinhas: 3, label: '3 metas concluídas' },
  { speciesId: 'dog',     requiredCaixinhas: 4, label: '4 metas concluídas' },
  { speciesId: 'chick',   requiredCaixinhas: 5, label: '5 metas concluídas' },
];

function CompanionUnlockPanel() {
  const profile = useStore((s) => s.profile);
  const setStoreProfile = useStore((s) => s.setProfile);
  const xp = profile?.xp ?? 0;
  const level = levelFromXP(xp);
  const completedCaixinhas = profile?.completedCaixinhasCount ?? 0;
  const currentSpeciesId = profile?.companionSpeciesId ?? 'dragon';

  // Equipa um companion desbloqueado: grava no perfil (Firestore + store).
  // O listener em tempo real propaga para Dashboard, tour e demais telas.
  function equip(speciesId: string) {
    if (!profile || speciesId === currentSpeciesId) return;
    setStoreProfile({ ...profile, companionSpeciesId: speciesId });
    setProfile({ companionSpeciesId: speciesId }).catch(() => {});
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <span className="text-xl">🥚</span>
        <div>
          <p className="font-display font-bold text-sm">Companions</p>
          <p className="text-xs text-muted-foreground">Toque para equipar — desbloqueie concluindo metas</p>
        </div>
        <div className="ml-auto">
          <p className="text-xs font-bold text-gold">{xp.toLocaleString('pt-BR')} XP · Lv {level}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {COMPANION_UNLOCKS.map(({ speciesId, requiredCaixinhas, label }) => {
          const species = getSpecies(speciesId);
          const unlocked = completedCaixinhas >= requiredCaixinhas;
          const isActive = speciesId === currentSpeciesId;
          return (
            <button
              key={speciesId}
              type="button"
              disabled={!unlocked}
              onClick={() => equip(speciesId)}
              className={cn(
                'rounded-xl border p-3 flex flex-col items-center gap-1 text-center transition-all',
                isActive ? 'border-gold/40 bg-gold/10 ring-2 ring-gold/30'
                  : unlocked ? 'border-primary/20 bg-primary/5 hover:border-gold/40 hover:bg-gold/5 active:scale-95 cursor-pointer'
                  : 'border-border opacity-50 cursor-not-allowed'
              )}
            >
              <div className={cn(
                'h-12 w-12 rounded-xl flex items-center justify-center text-2xl',
                unlocked ? 'bg-background' : 'bg-secondary grayscale'
              )}>
                {unlocked ? (
                  <span className="companion-idle">{species.emoji}</span>
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground/30" />
                )}
              </div>
              <p className={cn(
                'text-[10px] font-semibold truncate max-w-full w-full',
                isActive ? 'text-gold' : unlocked ? 'text-foreground' : 'text-muted-foreground/40'
              )}>
                {species.name}
              </p>
              <p className="text-[9px] text-muted-foreground">{label}</p>
              {isActive
                ? <span className="text-[9px] text-gold font-bold">✓ ativo</span>
                : unlocked && <span className="text-[9px] text-primary font-bold">equipar</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Hub da Vila — NPCs e locais
function VilaHub() {
  const milestones = useMilestones();
  const achievedCount = milestones.length;

  const NPCS = [
    {
      id: 'sabio',
      emoji: '🧙',
      name: 'Sábio',
      desc: 'Conselheiro de finanças com IA. Tenda sempre aberta.',
      to: '/copilot',
      cta: 'Falar com o Sábio',
    },
    {
      id: 'feirante',
      emoji: '🪙',
      name: 'Feirante',
      desc: 'Missões de venda e Loja da Guilda P2P.',
      to: '/inventario',
      cta: 'Visitar o Mercado',
    },
    {
      id: 'cofre',
      emoji: '🐷',
      name: 'Guardião do Cofre',
      desc: 'Cuida das suas caixinhas de meta com carinho.',
      to: '/caixinha',
      cta: 'Ver Cofres',
    },
    {
      id: 'quest',
      emoji: '📜',
      name: 'Mestre das Missões',
      desc: 'Trilha da Saga, Caçada e conquistas da jornada.',
      to: '/journey',
      cta: 'Quest Log',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Banner da Vila */}
      <div className="rpg-panel rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-background flex items-center justify-center text-2xl">🏘️</div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold text-foreground leading-tight">A Vila</h2>
            <p className="text-xs text-muted-foreground">Centro da comunidade de aventureiros.</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">Conquistas</p>
            <p className="font-display font-bold text-gold">{achievedCount}</p>
          </div>
        </div>
      </div>

      {/* Check-in diário */}
      <DailyRewardCard />

      {/* NPCs */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Locais da Vila
        </p>
        <div className="grid grid-cols-2 gap-2">
          {NPCS.map((npc) => (
            <Link
              key={npc.id}
              to={npc.to}
              className="rounded-xl border bg-card p-3 flex flex-col gap-2 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-95"
            >
              <span className="text-3xl">{npc.emoji}</span>
              <div>
                <p className="font-bold text-sm">{npc.name}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{npc.desc}</p>
              </div>
              <span className="text-[10px] font-bold text-primary">{npc.cta} →</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Companions */}
      <CompanionUnlockPanel />

      {/* Loja da Guilda quick-link */}
      <Link
        to="/inventario"
        className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-gold/5 p-4 hover:border-gold/40 transition-colors"
      >
        <ShoppingBag className="h-8 w-8 text-gold shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm">Loja da Guilda</p>
          <p className="text-xs text-muted-foreground">Itens à venda pela comunidade</p>
        </div>
        <span className="text-gold font-bold text-sm shrink-0">→</span>
      </Link>
    </div>
  );
}

export function Vila() {
  const [tab, setTab] = useState<VilaTab>('vila');

  const TABS: { id: VilaTab; label: string; icon: typeof MapPin }[] = [
    { id: 'vila',    label: 'Vila',    icon: MapPin },
    { id: 'fazenda', label: 'Fazenda', icon: ShoppingBag },
    { id: 'aliados', label: 'Aliados', icon: Package },
    { id: 'ranking', label: 'Ranking', icon: InfinityIcon },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          🏘️ A Vila
        </h2>
      </div>

      {/* Abas */}
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-secondary p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors',
                tab === t.id ? 'bg-gold text-gold-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'vila' && <VilaHub />}
      {tab === 'fazenda' && <FarmPanel />}
      {tab === 'aliados' && <FriendsPanel />}
      {tab === 'ranking' && <Leaderboard />}
    </div>
  );
}
