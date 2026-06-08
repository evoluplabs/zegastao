import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CtaSection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-primary via-primary to-blue-700 text-white relative overflow-hidden">
      {/* Dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Green accent blob */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-300/20 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-2xl px-4 text-center">
        <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-4">Comece agora</p>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-5 text-balance">
          Seu plano de quitação está a 3 minutos de distância.
        </h2>
        <p className="text-blue-100 text-lg mb-8">
          Gratuito para começar. Sem cartão de crédito.
        </p>

        <Button
          asChild
          size="lg"
          className="bg-white text-primary hover:bg-blue-50 rounded-xl gap-2 px-8 shadow-lg shadow-black/20 font-bold text-base mb-8"
        >
          <Link to="/login">
            Criar minha conta grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-blue-100">
          {[
            'Gratuito para sempre no básico',
            'Seus dados são seus',
            'Cancele quando quiser',
          ].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-300 shrink-0" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
