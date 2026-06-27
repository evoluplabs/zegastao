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
          ? 'bg-[#15110b]/95 backdrop-blur-md border-b border-[#3a2e1d] shadow-lg shadow-black/30'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20 border border-green-500/30 group-hover:bg-green-500/30 transition-colors">
            <Sword className="h-4 w-4 text-green-400" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-stone-100">
            Zé <span className="text-green-400">Gastão</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="#como-funciona" className="text-sm text-stone-400 hover:text-stone-100 transition-colors">
            O Jogo
          </a>
          <Link to="/pricing" className="text-sm text-stone-400 hover:text-stone-100 transition-colors">
            Classes
          </Link>
          <Link to="/empresas" className="text-sm text-stone-400 hover:text-stone-100 transition-colors">
            Guildas
          </Link>
          <Link to="/blog" className="text-sm text-stone-400 hover:text-stone-100 transition-colors">
            Diário
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-stone-300 hover:text-stone-100 hover:bg-stone-800">
            <Link to="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="rounded-lg gap-1.5 bg-green-500 hover:bg-green-400 text-stone-950 font-bold">
            <Link to="/login">
              ⚔️ Criar Personagem
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
