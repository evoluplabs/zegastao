import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Crown, LogOut, HelpCircle, Shield,
  ChevronRight, Brain, Zap, Trophy,
  MessageSquarePlus, FileText, Pencil, Sun, Moon, Monitor,
  Users, LinkIcon, Unlink,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useSharedFinances } from '@/hooks/useSharedFinances';
import type { AppTheme } from '@/types';
import { useStore } from '@/store/useStore';
import { authActions } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useDebts } from '@/hooks/useDebts';
import { useGoals } from '@/hooks/useGoals';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/utils';
import { PHASE_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { PersonalContext } from './PersonalContext';
import { FinancialSetupWizard } from '@/components/flows/FinancialSetupWizard';

function Avatar({ name }: { name?: string }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('')
    : '?';
  return (
    <div className="h-16 w-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center shrink-0">
      <span className="text-2xl font-bold text-primary">{initials}</span>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border bg-secondary/40 px-3 py-2.5 text-center">
      <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">{label}</p>
      <p className={cn('text-sm font-bold mt-0.5', color || 'text-foreground')}>{value}</p>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  sub,
  to,
  onClick,
  danger,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  sub?: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
  badge?: string;
}) {
  const cls = cn(
    'flex items-center gap-3 w-full rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-accent',
    danger && 'hover:bg-destructive/5 text-destructive'
  );

  const inner = (
    <>
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
        danger ? 'bg-destructive/10' : 'bg-secondary'
      )}>
        <Icon className={cn('h-4 w-4', danger ? 'text-destructive' : 'text-muted-foreground')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {badge && <Badge variant="outline" className="shrink-0 text-xs">{badge}</Badge>}
      {!danger && <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
    </>
  );

  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button className={cls} onClick={onClick}>{inner}</button>;
}

export function Profile() {
  const profile = useStore((s) => s.profile);
  const user = useStore((s) => s.user);
  const { plan, isPaid } = useSubscription();
  const { data: debts } = useDebts();
  const { data: goals } = useGoals();
  const navigate = useNavigate();
  const [showContext, setShowContext] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const { theme, setTheme } = useTheme();
  const { isLinked, loading: partnerLoading, error: partnerError, linkPartner, unlinkPartner } = useSharedFinances();
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);

  const THEMES: { value: AppTheme; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Escuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ];

  const activeDebts = debts.filter((d) => d.status === 'active');
  const activeGoals = goals.filter((g) => g.status === 'active');
  const totalDebt = activeDebts.reduce((s, d) => s + d.totalBalance, 0);
  const income = profile?.monthlyIncome || 0;

  const planLabel: Record<string, string> = {
    free: 'Gratuito',
    copiloto: 'Copiloto',
    copiloto_annual: 'Copiloto Anual',
  };

  if (showContext) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowContext(false)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar ao perfil
          </button>
        </div>
        <PersonalContext />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">

      {/* Header do perfil */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          <Avatar name={profile?.name} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{profile?.name || 'Usuário'}</h2>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {isPaid ? (
                <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                  <Crown className="h-3 w-3" /> {planLabel[plan] || plan}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Plano gratuito</Badge>
              )}
              {profile?.financialPhase && (
                <Badge variant="outline" className="text-xs">
                  {PHASE_LABELS[profile.financialPhase]}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Situação financeira</p>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Renda" value={income > 0 ? formatBRL(income) : '—'} color="text-success" />
          <StatPill
            label="Dívidas"
            value={activeDebts.length === 0 ? 'Nenhuma 🎉' : formatBRL(totalDebt)}
            color={activeDebts.length === 0 ? 'text-success' : 'text-destructive'}
          />
          <StatPill
            label="Metas"
            value={activeGoals.length === 0 ? '—' : `${activeGoals.length} ativa${activeGoals.length > 1 ? 's' : ''}`}
            color="text-primary"
          />
        </div>
      </div>

      {showWizard && <FinancialSetupWizard onClose={() => setShowWizard(false)} />}

      {/* Plano */}
      {!isPaid && (
        <Link
          to="/pricing"
          className="flex items-center gap-3 rounded-2xl border border-amber-300/50 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/20 px-4 py-4 hover:bg-amber-100/50 dark:hover:bg-amber-500/10 transition-colors"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20">
            <Crown className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Assinar o Copiloto</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70">50 mensagens/dia, tarefas diárias e análises avançadas</p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-500/60 shrink-0" />
        </Link>
      )}

      {/* Persona & Contexto */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meu perfil pessoal</p>
        </div>
        <div className="divide-y">
          <MenuRow
            icon={Brain}
            label="Persona & Contexto"
            sub="Habilidades, sentimentos, impulsos e análises do Copiloto"
            onClick={() => setShowContext(true)}
          />
          <MenuRow
            icon={Zap}
            label="Sugestões de renda extra"
            sub="Tarefas personalizadas para suas habilidades"
            onClick={() => setShowContext(true)}
          />
          <MenuRow
            icon={Trophy}
            label="Minha trilha"
            sub="Marcos da jornada financeira"
            to="/journey"
          />
        </div>
      </div>

      {/* Modo Casal / Família */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modo Casal / Família</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          {isLinked ? (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-3 py-2.5">
                <LinkIcon className="h-4 w-4 text-success shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-success">Conta vinculada</p>
                  <p className="text-xs text-muted-foreground">
                    {partnerName ? `Parceiro: ${partnerName}` : 'Você e seu parceiro(a) têm visão compartilhada.'}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => { await unlinkPartner(); setPartnerName(null); }}
                disabled={partnerLoading}
                className="flex items-center gap-2 text-xs text-destructive hover:underline disabled:opacity-50"
              >
                <Unlink className="h-3.5 w-3.5" />
                {partnerLoading ? 'Desvinculando…' : 'Desvincular conta'}
              </button>
            </>
          ) : showPartnerForm ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Digite o e-mail cadastrado do seu parceiro(a). Ambas as contas passarão a ter visão compartilhada dos dados financeiros.
              </p>
              <Input
                type="email"
                placeholder="email@parceiro.com"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
              />
              {partnerError && <p className="text-xs text-destructive">{partnerError}</p>}
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  disabled={partnerLoading || !partnerEmail}
                  onClick={async () => {
                    const name = await linkPartner(partnerEmail);
                    if (name) { setPartnerName(name); setShowPartnerForm(false); setPartnerEmail(''); }
                  }}
                >
                  <LinkIcon className="h-4 w-4" />
                  {partnerLoading ? 'Vinculando…' : 'Vincular'}
                </Button>
                <Button variant="ghost" onClick={() => setShowPartnerForm(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Compartilhe suas finanças com seu parceiro(a) ou cônjuge. Cada um mantém sua conta separada, mas ambos podem ver os dados juntos.
              </p>
              <button
                onClick={() => setShowPartnerForm(true)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Users className="h-4 w-4" /> Vincular com parceiro(a)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Aparência */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aparência</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm font-medium mb-3">Tema do aplicativo</p>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors',
                  theme === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* App */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aplicativo</p>
        </div>
        <div className="divide-y">
          <MenuRow
            icon={FileText}
            label="Documentos e contratos"
            sub="Análise de PDFs de crédito e extratos"
            to="/copilot?tab=documentos"
          />
          <MenuRow
            icon={HelpCircle}
            label="Ajuda"
            sub="FAQ e suporte"
            to="/ajuda"
          />
          <MenuRow
            icon={MessageSquarePlus}
            label="Enviar feedback"
            sub="Sua opinião melhora o app"
            to="/ajuda"
          />
          <MenuRow
            icon={Shield}
            label="Privacidade"
            sub="Termos e política de dados"
            to="/privacidade"
          />
        </div>
      </div>

      {/* Sair */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="divide-y">
          <MenuRow
            icon={LogOut}
            label="Sair da conta"
            onClick={() => authActions.logout().then(() => navigate('/'))}
            danger
          />
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground pb-4">
        Zé Gastão · {new Date().getFullYear()} · v1.0
      </p>
    </div>
  );
}
