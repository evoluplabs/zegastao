import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sword } from 'lucide-react';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0f1117]/95 backdrop-blur-md border-b border-[#2a2d3e] shadow-lg shadow-black/30'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30 group-hover:bg-emerald-500/30 transition-colors">
            <Sword className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-100">
            Zé <span className="text-emerald-400">Gastão</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="#como-funciona" className="text-sm text-slate-400 hover:text-slate-100 transition-colors">
            O Jogo
          </a>
          <Link to="/pricing" className="text-sm text-slate-400 hover:text-slate-100 transition-colors">
            Classes
          </Link>
          <Link to="/empresas" className="text-sm text-slate-400 hover:text-slate-100 transition-colors">
            Guildas
          </Link>
          <Link to="/blog" className="text-sm text-slate-400 hover:text-slate-100 transition-colors">
            Diário
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-slate-100 hover:bg-slate-800">
            <Link to="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="rounded-lg gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">
            <Link to="/login">
              ⚔️ Criar Personagem
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
