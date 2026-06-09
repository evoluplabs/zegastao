import { getPosts } from '@/lib/blog';
import { TrendingUp, Users, DollarSign, Target, Share2, BookOpen } from 'lucide-react';

const METRICS = [
  {
    group: 'Monetização',
    icon: DollarSign,
    items: [
      { label: 'MRR', description: 'Receita recorrente mensal', formula: 'Usuários pagantes × R$19,90', howTo: 'Admin Dashboard > Pagantes' },
      { label: 'ARR', description: 'Receita recorrente anual', formula: 'MRR × 12', howTo: 'Calculado automaticamente' },
      { label: 'ARPU', description: 'Receita por usuário', formula: 'MRR ÷ total de usuários ativos', howTo: 'MRR ÷ MAU' },
      { label: 'LTV', description: 'Valor de vida útil do cliente', formula: 'ARPU ÷ churn mensal (%)', howTo: 'ARPU / taxa de cancelamento' },
    ],
  },
  {
    group: 'Crescimento',
    icon: TrendingUp,
    items: [
      { label: 'CAC', description: 'Custo de aquisição de cliente', formula: 'Total gasto em marketing ÷ novos clientes', howTo: 'R$0 (canal orgânico) — documentar isso!' },
      { label: 'Churn mensal', description: 'Taxa de cancelamento', formula: 'Cancelamentos ÷ base pagante', howTo: 'Firestore: subscription status changes' },
      { label: 'MoM Growth', description: 'Crescimento mês a mês', formula: '(Usuários mês atual − anterior) ÷ anterior × 100', howTo: 'Dashboard > Novos usuários por período' },
    ],
  },
  {
    group: 'Engajamento',
    icon: Users,
    items: [
      { label: 'DAU/MAU', description: 'Stickiness do produto', formula: 'Usuários ativos hoje ÷ usuários ativos no mês × 100', howTo: 'Mixpanel > Cohort analysis' },
      { label: 'Time to Value', description: 'Tempo até primeiro uso real', formula: 'Tempo entre cadastro e primeiro upload/transação', howTo: 'Mixpanel > Funnel: signup → first_upload' },
      { label: 'Uploads/usuário', description: 'Profundidade de uso', formula: 'Total uploads ÷ usuários com ≥1 upload', howTo: 'Firestore aggregate sobre uploads collection' },
    ],
  },
  {
    group: 'Produto',
    icon: Target,
    items: [
      { label: 'Avanço de fase', description: '% que saiu da Sobrevivência', formula: 'Usuários em fase ≥ Reorganização ÷ total', howTo: 'Firestore: profile.financialPhase ≠ survival' },
      { label: 'NPS proxy', description: 'Satisfação implícita', formula: '% de usuários que compartilharam conquista', howTo: 'Mixpanel > WIN_SHARED events' },
      { label: 'Conversão free→paid', description: 'Taxa de conversão', formula: 'Pagantes ÷ total cadastros × 100', howTo: 'Admin Dashboard' },
    ],
  },
  {
    group: 'Conteúdo',
    icon: BookOpen,
    items: [
      { label: 'Posts publicados', description: 'Volume do blog', formula: `${getPosts().length} posts ativos`, howTo: 'Admin > Blog' },
      { label: 'Orgânico SEO', description: 'Tráfego de busca', formula: 'Sessions from google / total sessions', howTo: 'Google Search Console + Analytics' },
    ],
  },
  {
    group: 'Referral',
    icon: Share2,
    items: [
      { label: 'Referral rate', description: 'Cadastros via indicação', formula: 'Cadastros com ref_code ÷ total cadastros', howTo: 'Mixpanel > REFERRAL_CONVERTED' },
      { label: 'K-Factor', description: 'Coeficiente viral', formula: 'Média de convites enviados × taxa de conversão', howTo: 'REFERRAL_SHARED ÷ REFERRAL_CONVERTED' },
    ],
  },
];

export function AdminMetrics() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20 p-4 text-sm text-amber-800 dark:text-amber-300">
        <strong>Pitch deck:</strong> Este painel lista as métricas que investidores e aceleradoras vão perguntar. Configure o Mixpanel (<code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded text-xs">VITE_MIXPANEL_TOKEN</code>) para coleta automática.
      </div>

      {METRICS.map(({ group, icon: Icon, items }) => (
        <div key={group} className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">{group}</p>
          </div>
          <div className="divide-y">
            {items.map((m) => (
              <div key={m.label} className="px-5 py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                <div>
                  <p className="text-sm font-semibold">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <p className="text-xs font-mono bg-secondary px-2 py-1 rounded">{m.formula}</p>
                  <p className="text-xs text-muted-foreground">Como medir: {m.howTo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
