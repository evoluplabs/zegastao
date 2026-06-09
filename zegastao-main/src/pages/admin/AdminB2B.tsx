import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase';
import { Building2, Mail, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type LeadStatus = 'novo' | 'contatado' | 'em_negociacao' | 'fechado' | 'descartado';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  employees: string;
  message?: string;
  status?: LeadStatus;
  createdAt?: any;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  em_negociacao: 'Em negociação',
  fechado: 'Fechado ✓',
  descartado: 'Descartado',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-blue-100 text-blue-700',
  contatado: 'bg-amber-100 text-amber-700',
  em_negociacao: 'bg-violet-100 text-violet-700',
  fechado: 'bg-green-100 text-green-700',
  descartado: 'bg-secondary text-muted-foreground',
};

export function AdminB2B() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'b2b_leads'))
      .then((snap) => setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead))))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  async function setStatus(id: string, status: LeadStatus) {
    await updateDoc(doc(db, 'b2b_leads', id), { status });
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  if (loading) return <p className="text-muted-foreground text-sm p-4">Carregando leads...</p>;

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center space-y-2">
        <Building2 className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Nenhum lead B2B ainda. Eles aparecerão aqui após empresas preencherem o formulário em /empresas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{leads.length} lead{leads.length !== 1 ? 's' : ''} total</p>
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="divide-y">
          {leads.map((lead) => {
            const status = (lead.status ?? 'novo') as LeadStatus;
            return (
              <div key={lead.id} className="px-5 py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{lead.company || 'Empresa não informada'}</p>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_COLORS[status])}>
                        {STATUS_LABELS[status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{lead.employees}</span>
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                      <span>{lead.name}</span>
                    </div>
                    {lead.message && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{lead.message}"</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(lead.id, s)}
                      className={cn(
                        'text-[10px] px-2.5 py-1 rounded-full border transition-colors',
                        status === s ? STATUS_COLORS[s] + ' border-transparent' : 'hover:bg-accent'
                      )}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
