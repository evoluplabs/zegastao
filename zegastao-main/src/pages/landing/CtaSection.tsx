import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Sword, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CtaSection() {
  return (
    <section className="py-20 md:py-28 bg-[#0f1117] border-b border-[#2a2d3e] relative overflow-hidden">
      {/* Grid glow */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'radial-gradient(circle, #10b98120 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-2xl px-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 mb-6">
          <Sword className="h-3 w-3" /> Sua aventura começa agora
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-5 text-slate-100 text-balance">
          ⚔️ Pronto para derrotar seus Bosses financeiros?
        </h2>
        <p className="text-slate-400 text-lg mb-8">
          Crie seu personagem, mapeie seus inimigos e suba de nível — comece grátis agora. Assine quando quiser.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Button
            asChild
            size="lg"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl gap-2 px-8 shadow-lg shadow-emerald-500/20 w-full sm:w-auto"
          >
            <Link to="/login">
              ⚔️ Criar Personagem — Grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-slate-100 rounded-xl gap-2 px-8 w-full sm:w-auto"
          >
            <Link to="/pricing">
              <Users className="h-4 w-4" />
              Ver Classes — a partir de R$ 19,90/mês
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500">
          {[
            'Personagem grátis, sem cartão',
            'Cancele quando quiser',
            'Seus dados são seus (LGPD)',
          ].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
