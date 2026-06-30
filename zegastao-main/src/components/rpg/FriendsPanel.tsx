// E6 — Aliados (amigos) — MVP via referrals existentes
// Privacidade: mostra apenas alias, classe, nível, XP, streak.
// Sem dados financeiros.
import { useState } from 'react';
import { Users, UserPlus, Copy } from 'lucide-react';
import { useReferral } from '@/hooks/useReferral';
import { useToast } from '@/components/ui/Toast';
import { getAvatar, getClass } from '@/lib/rpg/character';
import { cn } from '@/lib/utils';
import type { SocialStats } from '@/lib/rpg/social';

// MVP: amigos exibidos a partir de mock/placeholder.
// Em V2, ler 'users/{uid}/friends' + buscar social_stats/{friendUid}.
const MOCK_FRIENDS: SocialStats[] = []; // será populado via Firestore quando amigos existirem

export function FriendsPanel() {
  const { referralUrl, share } = useReferral();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    const result = await share('friends_panel');
    if (result === 'copied') {
      setCopied(true);
      toast('Link copiado! Cole no WhatsApp para chamar seu aliado. 🎉');
      setTimeout(() => setCopied(false), 3000);
    } else if (result === 'shared') {
      toast('Convite enviado! 🎉');
    }
  }

  const hasFriends = MOCK_FRIENDS.length > 0;

  return (
    <div className="space-y-4">
      {/* Convite */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm">Chame um Aliado</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Indique um amigo para a aventura — ele recebe orientação e você sobe no ranking de aliados.
        </p>
        {referralUrl && (
          <div className="flex items-center gap-2 rounded-lg bg-background border px-3 py-2">
            <p className="text-xs text-muted-foreground truncate flex-1">{referralUrl}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralUrl);
                toast('Link copiado!');
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button
          onClick={handleInvite}
          className={cn(
            'w-full py-2.5 rounded-xl text-sm font-bold transition-colors',
            copied
              ? 'bg-primary/20 text-primary'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {copied ? '✓ Link copiado!' : '⚔️ Convocar aliado'}
        </button>
      </div>

      {/* Lista de aliados */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Meus Aliados
          </p>
        </div>

        {!hasFriends ? (
          <div className="rounded-xl border bg-card p-6 text-center space-y-2">
            <div className="text-3xl">🏰</div>
            <p className="text-sm font-semibold">Sua guilda está vazia</p>
            <p className="text-xs text-muted-foreground">
              Convide amigos para a jornada. Quando eles entrarem pelo seu link, aparecem aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {MOCK_FRIENDS.map((friend) => {
              const avatar = getAvatar(friend.avatarId);
              const cls = getClass(friend.characterClass);
              return (
                <div key={friend.uid} className="rounded-xl border bg-card p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-xl shrink-0">
                    {avatar.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{friend.alias}</p>
                    <p className="text-xs text-muted-foreground">{cls.emoji} {cls.name} · Lv {friend.level}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-gold">{friend.xp} XP</p>
                    <p className="text-[10px] text-muted-foreground">🔥 {friend.dailyStreak}d</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
