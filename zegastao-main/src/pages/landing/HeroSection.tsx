import { Link } from 'react-router-dom';
import { ArrowRight, Sword, Shield, Coins, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CharacterPreviewMockup() {
  return (
    <div className="relative mx-auto max-w-sm">
      {/* Floating XP badge */}
      <div className="absolute -top-4 -right-2 z-10 flex items-center gap-1 rounded-full border border-amber-500/40 bg-[#1a1d27] px-3 py-1.5 text-xs font-bold text-amber-400 shadow-lg shadow-black/40 animate-bounce" style={{ animationDuration: '3s' }}>
        <Zap className="h-3 w-3" /> +50 XP · Boss derrotado!
      </div>

      {/* Character Card */}
      <div className="rounded-2xl border border-[#2a2d3e] bg-[#1a1d27] shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#2a2d3e] bg-[#141720] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-sm font-bold text-emerald-400">
                M
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-slate-950">
                5
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">Marcos</p>
              <p className="text-[10px] text-emerald-400">Guardião Estável · Lv 5</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
            🪙 R$ 4.210
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* HP financeiro */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Shield className="h-2.5 w-2.5 text-emerald-400" /> HP Financeiro
              </span>
              <span className="text-[10px] font-bold text-emerald-400">78%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all" style={{ width: '78%' }} />
            </div>
          </div>

          {/* XP bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Zap className="h-2.5 w-2.5 text-amber-400" /> Experiência
              </span>
              <span className="text-[10px] font-bold text-amber-400">650 / 1.000 XP</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400" style={{ width: '65%' }} />
            </div>
          </div>

          {/* Boss section */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                ☠️ Boss: Nubank Fatura
              </span>
              <span className="text-[10px] text-red-300">Lv 3 · 18%/mês</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-1.5">
              <div className="h-full rounded-full bg-gradient-to-r from-red-800 to-red-500" style={{ width: '34%' }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500">❤️ R$ 1.200 / R$ 3.500</span>
              <span className="text-[9px] font-bold text-emerald-400">⚔️ -66% de HP!</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Sword, label: 'ATK', value: '⚔️ 218', color: 'text-red-400' },
              { icon: Shield, label: 'DEF', value: '🛡️ R$400', color: 'text-sky-400' },
              { icon: Coins, label: 'XP', value: '⭐ 650', color: 'text-amber-400' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-[#2a2d3e] bg-[#141720] p-2 text-center">
                <p className="text-[8px] uppercase tracking-wide text-slate-500 mb-0.5">{s.label}</p>
                <p className={`text-[10px] font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Quest em destaque */}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
            <span className="text-base shrink-0">🎯</span>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wide text-emerald-500 font-bold">Quest ativa</p>
              <p className="text-[10px] text-slate-300 font-medium truncate">Atacar Boss Nubank · +30 XP</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating level-up badge */}
      <div className="absolute -bottom-3 -left-3 z-10 rounded-xl border border-amber-500/30 bg-[#1a1d27] px-3 py-2 shadow-lg shadow-black/40">
        <p className="text-[10px] font-black text-amber-400">🏆 LEVEL UP!</p>
        <p className="text-[9px] text-slate-400">Guardião Estável · Lv 5</p>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#0f1117]">
      {/* Atmospheric grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #10b98120 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-sky-500/5 pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 mb-6 shadow-sm">
              <Sword className="h-3 w-3" />
              Idle MMO de Finanças Pessoais · Feito no Brasil
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">
              ⚔️ Sua vida financeira virou um RPG
            </p>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5 text-slate-100">
              Derrote suas dívidas.<br />Suba de nível.<br />
              <span className="text-emerald-400">Construa liberdade.</span>
            </h1>

            <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg">
              Crie seu personagem, cadastre suas dívidas como bosses e evolua profissões
              enquanto organiza sua vida financeira —{' '}
              <strong className="text-slate-200">de graça pra começar.</strong>
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3 mb-5">
              <Button asChild size="lg" className="rounded-xl gap-2 px-7 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                <Link to="/login">
                  ⚔️ Criar Personagem — Grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-slate-100">
                <a href="#como-funciona">Ver o Jogo</a>
              </Button>
            </div>

            {/* Raid callout */}
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 mb-6">
              <span className="text-xl shrink-0">⚔️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-400">Raid: Zé Apostador · Copa 2026</p>
                <p className="text-xs text-slate-500 leading-snug">Fotografa o jogo na Betano. A IA lê as odds e monta a melhor aposta. Sem achismo.</p>
              </div>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-6">
              <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> Gratuito pra sempre</span>
              <span className="flex items-center gap-1"><span>🔒</span> Dados criptografados</span>
              <span className="flex items-center gap-1"><span>⭐</span> Sem cartão de crédito</span>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {['#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6'].map((c, i) => (
                  <div
                    key={i}
                    className="h-7 w-7 rounded-full border-2 border-[#0f1117] flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ backgroundColor: c }}
                  >
                    {['A', 'M', 'J', 'C', 'R'][i]}
                  </div>
                ))}
              </div>
              <div>
                <span><strong className="text-slate-200">+2.000 aventureiros ativos</strong></span>
                <div className="flex items-center gap-0.5 text-amber-400">
                  {'★★★★★'.split('').map((s, i) => <span key={i} className="text-xs">{s}</span>)}
                  <span className="text-xs text-slate-500 ml-1">4.9</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — character preview */}
          <div className="relative">
            <CharacterPreviewMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
