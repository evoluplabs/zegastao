import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';

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
          ? 'bg-background/90 backdrop-blur-md border-b shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo size="sm" />

        <div className="hidden md:flex items-center gap-6">
          <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Como funciona
          </a>
          <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Preços
          </Link>
          <Link to="/empresas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Empresas
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="rounded-lg gap-1.5">
            <Link to="/login">
              Começar grátis
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
