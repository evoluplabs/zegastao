// Pré-processamento de print da Betano ANTES de mandar pro servidor.
// Reduz drasticamente o tamanho (de ~5MB para ~45KB): tons de cinza, corta as
// faixas de topo/rodapé (relógio/barra de navegação) e reescala para ≤1024px.
// Tudo no navegador, custo zero. Depois (best-effort) tenta OCR grátis no cliente.

export interface PreparedImage {
  base64: string;                 // sem o prefixo data:
  mediaType: 'image/jpeg';
}

const MAX_WIDTH = 1024;
const CROP_TOP = 0.06;    // corta 6% do topo (relógio/status)
const CROP_BOTTOM = 0.06; // corta 6% do rodapé (barra de navegação)

export async function prepareImage(file: Blob): Promise<PreparedImage> {
  const bitmap = await loadBitmap(file);
  const cropY = Math.round(bitmap.height * CROP_TOP);
  const cropH = Math.round(bitmap.height * (1 - CROP_TOP - CROP_BOTTOM));
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const outW = Math.round(bitmap.width * scale);
  const outH = Math.round(cropH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.drawImage(bitmap, 0, cropY, bitmap.width, cropH, 0, 0, outW, outH);

  // Tons de cinza (ajuda o OCR e reduz o peso)
  const img = ctx.getImageData(0, 0, outW, outH);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
  return { base64: dataUrl.split(',')[1] || '', mediaType: 'image/jpeg' };
}

function loadBitmap(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem')); };
    img.src = url;
  });
}

// OCR grátis no cliente (Tier 1). Carrega o tesseract.js do CDN sob demanda — não
// entra no bundle. É best-effort: qualquer falha retorna '' e o fluxo cai pro Vision.
interface TesseractGlobal {
  recognize: (image: string, lang: string) => Promise<{ data: { text: string } }>;
}

let tesseractLoading: Promise<TesseractGlobal | null> | null = null;

function loadTesseract(): Promise<TesseractGlobal | null> {
  if (tesseractLoading) return tesseractLoading;
  tesseractLoading = new Promise((resolve) => {
    const w = window as unknown as { Tesseract?: TesseractGlobal };
    if (w.Tesseract) return resolve(w.Tesseract);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => resolve((window as unknown as { Tesseract?: TesseractGlobal }).Tesseract ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return tesseractLoading;
}

/** Tenta extrair texto do print no próprio navegador. Retorna '' se não rolar. */
export async function tryOcr(base64Jpeg: string): Promise<string> {
  try {
    const t = await loadTesseract();
    if (!t) return '';
    const res = await t.recognize(`data:image/jpeg;base64,${base64Jpeg}`, 'por');
    return res?.data?.text || '';
  } catch {
    return '';
  }
}
