import { Link } from 'react-router-dom';
import { Sword } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-[#3a2e1d] bg-[#100c07]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/20 border border-green-500/30">
                <Sword className="h-3.5 w-3.5 text-green-400" />
              </div>
              <span className="font-extrabold text-sm text-stone-100">
                Zé <span className="text-green-400">Gastão</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed max-w-[220px]">
              O Idle MMO de finanças pessoais. Evolua seu personagem enquanto organiza sua vida.
            </p>
          </div>

          {/* O Jogo */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-3">— O Jogo —</p>
            <div className="space-y-2">
              {[
                { label: 'Classes & Preços', to: '/pricing' },
                { label: 'Guildas (Empresas)', to: '/empresas' },
                { label: 'Diário (Blog)', to: '/blog' },
                { label: 'Ajuda & FAQ', to: '/ajuda' },
                { label: 'Entrar no Realm', to: '/login' },
              ].map((l) => (
                <div key={l.label}>
                  <Link to={l.to} className="text-sm text-stone-500 hover:text-stone-200 transition-colors">
                    {l.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Guilda / Suporte */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-3">— Guilda —</p>
            <div className="space-y-2">
              <div>
                <a href="mailto:suporte@zegastao.com.br" className="text-sm text-stone-500 hover:text-stone-200 transition-colors">
                  suporte@zegastao.com.br
                </a>
              </div>
              <div>
                <Link to="/ajuda" className="text-sm text-stone-500 hover:text-stone-200 transition-colors">
                  Central de ajuda
                </Link>
              </div>
            </div>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-3">— Legal —</p>
            <div className="space-y-2">
              <div>
                <Link to="/termos" className="text-sm text-stone-500 hover:text-stone-200 transition-colors">
                  Termos de Uso
                </Link>
              </div>
              <div>
                <Link to="/privacidade" className="text-sm text-stone-500 hover:text-stone-200 transition-colors">
                  Política de Privacidade
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-t border-[#3a2e1d] pt-6">
          <p className="text-xs text-stone-600">
            © {new Date().getFullYear()} Zé Gastão. Todos os direitos reservados.
          </p>
          <p className="text-xs text-stone-600 text-center">
            Orientação educacional · Não é consultoria financeira regulamentada pela CVM
          </p>
        </div>
      </div>
    </footer>
  );
}
