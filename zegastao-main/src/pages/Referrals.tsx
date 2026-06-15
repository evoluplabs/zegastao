import { Users, Copy, Check, UserCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useReferral } from '@/hooks/useReferral';
import { useReferrals } from '@/hooks/useReferrals';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';

export function Referrals() {
  const { referralUrl, share } = useReferral();
  const { referrals, loading } = useReferrals();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const totalSignups = referrals.length;
  const totalPaid = referrals.filter((r) => r.plan === 'paid').length;

  async function copyLink() {
    const result = await share('referrals_page');
    if (result === 'copied') {
      setCopied(true);
      toast('Link copiado! Compartilhe com seus amigos 🎉');
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Seus indicados</h1>
      </div>

      {/* Link de indicação */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <p className="text-sm font-semibold">Seu link de indicação</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground font-mono truncate">
            {referralUrl ?? 'Carregando…'}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 shrink-0"
            onClick={copyLink}
            disabled={!referralUrl}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Compartilhe seu link. Quando alguém se cadastrar pelo seu link, você verá aqui.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-muted-foreground">
            <UserPlus className="h-4 w-4" />
            <p className="text-xs font-medium">Cadastrados</p>
          </div>
          <p className="text-2xl font-bold">{totalSignups}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-primary">
            <UserCheck className="h-4 w-4" />
            <p className="text-xs font-medium">Assinantes</p>
          </div>
          <p className="text-2xl font-bold text-primary">{totalPaid}</p>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b">
          <p className="text-sm font-semibold">Histórico de indicações</p>
        </div>

        {loading ? (
          <div className="p-5 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : referrals.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Users className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-semibold">Nenhuma indicação ainda</p>
            <p className="text-xs text-muted-foreground">
              Compartilhe seu link com amigos e acompanhe o progresso deles aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {referrals.map((r) => (
              <div key={r.uid} className="flex items-center gap-3 px-5 py-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold shrink-0">
                  {(r.name || r.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name || r.email || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground">
                    Entrou em {r.joinedAt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  r.plan === 'paid'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {r.plan === 'paid' ? '✅ Assinante' : '🆓 Gratuito'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
