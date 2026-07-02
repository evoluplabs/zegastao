import { useRef, useState } from 'react';
import { Share2, Check, MessageCircle, Download } from 'lucide-react';
import { shareNodeAsImage, shareViaWhatsApp } from '@/lib/shareImage';
import { track, Events } from '@/lib/analytics';
import { formatBRL } from '@/lib/utils';

interface Props {
  homeTeam: string;
  awayTeam: string;
  selection: string;
  odd: number;
  profit: number;       // lucro do green
  referralCode?: string;
}

// Card de "green" para o usuário postar no WhatsApp/stories. Sem dados sensíveis
// (nada de saldo, CPF). Reaproveita shareImage (html-to-image) — custo zero.
// Member-to-member: o texto carrega o referralCode do usuário.
export function ShareableBetCard({ homeTeam, awayTeam, selection, odd, profit, referralCode }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle');

  const shareText =
    `Green com o Zé Apostador! 🟢 ${homeTeam} x ${awayTeam} me pagou ${formatBRL(profit)}. Fézinha consciente, aposta com cabeça.` +
    (referralCode ? `\n\nEntra com meu convite: ze.gastao/r/${referralCode}` : '');

  async function handleShareImage() {
    if (!cardRef.current) return;
    setState('working');
    const result = await shareNodeAsImage(cardRef.current, { fileName: 'green-ze-apostador.png', text: shareText });
    track(Events.WIN_SHARED, { result, feature: 'ze_apostador' });
    setState(result === 'error' ? 'idle' : 'done');
    if (result !== 'error') setTimeout(() => setState('idle'), 2500);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={cardRef}
        className="relative w-full max-w-[300px] overflow-hidden rounded-3xl text-white"
        style={{ aspectRatio: '4 / 5', background: 'linear-gradient(150deg, #064e3b 0%, #059669 50%, #10b981 100%)' }}
      >
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #ffffff55 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="relative flex h-full flex-col items-center justify-between p-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest opacity-90">Zé Apostador · Green 🟢</span>
          <div className="flex flex-col items-center">
            <div className="mb-2 text-[56px] leading-none">🤑</div>
            <h3 className="text-lg font-extrabold leading-tight">{homeTeam} x {awayTeam}</h3>
            <p className="mt-1 text-sm opacity-90">{selection} @{odd}</p>
            <div className="mt-3 rounded-xl bg-white/20 px-4 py-2 text-2xl font-black backdrop-blur-sm">+{formatBRL(profit)}</div>
          </div>
          <span className="text-xs font-semibold opacity-90">Aposta com cabeça 💪</span>
        </div>
      </div>

      <button onClick={handleShareImage} disabled={state === 'working'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-stone-950 hover:bg-green-400 disabled:opacity-50">
        {state === 'done' ? <><Check className="h-4 w-4" /> Pronto!</> : state === 'working' ? 'Gerando imagem…' : <><Share2 className="h-4 w-4" /> Compartilhar green</>}
      </button>
      <button
        onClick={() => { shareViaWhatsApp(shareText); track(Events.REFERRAL_SHARED, { feature: 'ze_apostador' }); }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/40 bg-green-500/5 py-2 text-sm font-medium text-green-400 hover:bg-green-500/10"
      >
        <MessageCircle className="h-4 w-4" /> Mandar no WhatsApp
      </button>
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground/70"><Download className="h-3 w-3" /> Imagem ideal pra status e stories</p>
    </div>
  );
}
