import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

export function LandingFooter() {
  return (
    <footer className="border-t bg-secondary/20">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Logo size="sm" className="mb-3" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
              Seu copiloto financeiro pessoal — do endividamento à liberdade.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3">Produto</p>
            <div className="space-y-2">
              {[
                { label: 'Preços', to: '/pricing' },
                { label: 'Para empresas', to: '/empresas' },
                { label: 'Entrar', to: '/login' },
              ].map((l) => (
                <div key={l.label}>
                  <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3">Legal</p>
            <div className="space-y-2">
              <div>
                <a href="mailto:suporte@zegastao.com.br" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contato
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-t pt-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Zé Gastão. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Orientação educacional · Não é consultoria financeira regulamentada pela CVM
          </p>
        </div>
      </div>
    </footer>
  );
}
