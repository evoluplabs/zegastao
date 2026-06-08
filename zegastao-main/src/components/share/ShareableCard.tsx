import { useRef, useState } from 'react';
import { Share2, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shareNodeAsImage } from '@/lib/shareImage';
import { track, Events } from '@/lib/analytics';

export interface ShareableCardProps {
  emoji: string;
  title: string;        // ex: "Quitei minha dívida mais cara!"
  metric?: string;      // ex: "R$ 1.240 economizados"
  subtitle?: string;    // ex: "3 semanas no azul"
  /** texto/URL incluídos no compartilhamento nativo */
  shareText?: string;
  shareUrl?: string;
  /** evento de analytics ao compartilhar */
  analyticsId?: string;
}

// Card visual com a marca Zé Gastão, renderizado como imagem (PNG) para o
// usuário postar no status do WhatsApp / stories. Proporção ~4:5 (ótima p/ feed
// e status). Sem imagens externas — só CSS/emoji — para a captura não quebrar.
export function ShareableCard(props: ShareableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle');

  async function handleShare() {
    if (!cardRef.current) return;
    setState('working');
    const result = await shareNodeAsImage(cardRef.current, {
      fileName: 'minha-conquista-ze-gastao.png',
      text: props.shareText,
      url: props.shareUrl,
    });
    if (props.analyticsId) track(props.analyticsId, { result });
    setState(result === 'error' ? 'idle' : 'done');
    if (result !== 'error') setTimeout(() => setState('idle'), 2500);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Card que vira imagem */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[300px] overflow-hidden rounded-3xl text-white"
        style={{
          aspectRatio: '4 / 5',
          background: 'linear-gradient(150deg, #1d4ed8 0%, #2563eb 45%, #16a34a 100%)',
        }}
      >
        {/* textura de pontos */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff55 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative flex h-full flex-col items-center justify-between p-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest opacity-90">
            Zé Gastão · Copiloto Financeiro
          </span>

          <div className="flex flex-col items-center">
            <div className="mb-3 text-[64px] leading-none">{props.emoji}</div>
            <h3 className="text-xl font-extrabold leading-tight">{props.title}</h3>
            {props.metric && (
              <div className="mt-3 rounded-xl bg-white/20 px-4 py-2 text-2xl font-black backdrop-blur-sm">
                {props.metric}
              </div>
            )}
            {props.subtitle && (
              <p className="mt-2 text-sm font-medium opacity-90">{props.subtitle}</p>
            )}
          </div>

          <span className="text-xs font-semibold opacity-90">
            Do vermelho à liberdade 💪
          </span>
        </div>
      </div>

      {/* Botão de ação */}
      <Button className="w-full gap-2" onClick={handleShare} disabled={state === 'working'}>
        {state === 'done' ? (
          <><Check className="h-4 w-4" /> Pronto!</>
        ) : state === 'working' ? (
          <>Gerando imagem…</>
        ) : (
          <><Share2 className="h-4 w-4" /> Compartilhar imagem</>
        )}
      </Button>
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Download className="h-3 w-3" /> Vira imagem para o status do WhatsApp e stories
      </p>
    </div>
  );
}
