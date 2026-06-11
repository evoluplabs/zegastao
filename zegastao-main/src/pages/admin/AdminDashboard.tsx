import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase';
import { Users, TrendingUp, DollarSign, FileText } from 'lucide-react';
import { formatBRL } from '@/lib/utils';

interface Stats {
  totalUsers: number;
  paidUsers: number;
  b2bLeads: number;
  mrr: number;
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className={`text-2xl font-bold ${color || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        // Count users
        const usersSnap = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnap.size;

        // Count paid subscriptions
        let paidUsers = 0;
        for (const userDoc of usersSnap.docs) {
          const subSnap = await getDocs(collection(db, 'users', userDoc.id, 'subscription'));
          subSnap.forEach((s) => {
            const d = s.data();
            if (d.plan && d.plan !== 'free') paidUsers++;
          });
        }

        // B2B leads
        const leadsSnap = await getDocs(collection(db, 'b2b_leads'));
        const b2bLeads = leadsSnap.size;
        const leads = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(0, 5);
        setRecentLeads(leads);

        setStats({
          totalUsers,
          paidUsers,
          b2bLeads,
          mrr: paidUsers * 19.9,
        });
      } catch {
        // Firestore rules might block — show zeros
        setStats({ totalUsers: 0, paidUsers: 0, b2bLeads: 0, mrr: 0 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm p-4">Carregando métricas...</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Usuários totais" value={String(stats?.totalUsers ?? 0)} />
        <StatCard icon={TrendingUp} label="Pagantes" value={String(stats?.paidUsers ?? 0)} color="text-success" sub={`${stats?.totalUsers ? ((stats.paidUsers / stats.totalUsers) * 100).toFixed(1) : 0}% conversão`} />
        <StatCard icon={DollarSign} label="MRR" value={formatBRL(stats?.mrr ?? 0)} color="text-primary" sub={`ARR: ${formatBRL((stats?.mrr ?? 0) * 12)}`} />
        <StatCard icon={FileText} label="Leads B2B" value={String(stats?.b2bLeads ?? 0)} />
      </div>

      {recentLeads.length > 0 && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b">
            <p className="text-sm font-semibold">Leads B2B recentes</p>
          </div>
          <div className="divide-y">
            {recentLeads.map((lead: any) => (
              <div key={lead.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{lead.company || '—'}</p>
                  <p className="text-xs text-muted-foreground">{lead.name} · {lead.email}</p>
                </div>
                <span className="text-xs text-muted-foreground">{lead.employees}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
