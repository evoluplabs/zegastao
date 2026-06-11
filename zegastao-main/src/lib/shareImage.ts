// Gera um PNG de um nó do DOM e compartilha como imagem (Web Share API com
// arquivo, ideal para status do WhatsApp / stories). Fallback: download.
// Custo: zero — tudo no navegador.
import { toPng } from 'html-to-image';

/** Abre o WhatsApp com uma mensagem pré-formatada. Funciona em mobile e desktop (WhatsApp Web). */
export function shareViaWhatsApp(text: string): void {
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
}

export type ShareResult = 'shared' | 'downloaded' | 'error';

export async function shareNodeAsImage(
  node: HTMLElement,
  opts: { fileName?: string; text?: string; url?: string } = {},
): Promise<ShareResult> {
  const fileName = opts.fileName || 'ze-gastao.png';
  try {
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], fileName, { type: 'image/png' });

    // Mobile: compartilha a imagem direto (status, stories, DM…)
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: opts.text, url: opts.url });
      return 'shared';
    }

    // Desktop / sem suporte: baixa o PNG
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.click();
    return 'downloaded';
  } catch {
    return 'error';
  }
}
