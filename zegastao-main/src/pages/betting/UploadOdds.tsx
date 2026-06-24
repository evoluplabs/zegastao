// "Fotografa a Betano": o usuário manda o print, a gente lê as odds (OCR grátis
// primeiro, Claude Vision só no fallback) e mostra os mercados extraídos.
// Reforça o "usuário é sensor" + alimenta o Waze das Odds (cache da comunidade).
import { useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { prepareImage, tryOcr } from '@/lib/imagePrep';
import { Camera, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExtractedMarket { market: string; selection: string; odd: number; }
interface ExtractedSlip {
  homeTeam?: string; awayTeam?: string; league?: string;
  markets: ExtractedMarket[]; confidence: number; superOdds?: boolean;
}
type ExtractResult = { slip: ExtractedSlip; source: 'ocr' | 'vision' };

const zeExtractOdds = httpsCallable<
  { ocrText?: string; imageBase64?: string; mediaType?: string },
  ExtractResult
>(functions, 'zeExtractOdds');

const MARKET_PT: Record<string, string> = {
  h2h: 'Resultado', totals: 'Total de Gols', btts: 'Ambas Marcam',
  corners: 'Escanteios', cards: 'Cartões', shots: 'Finalizações', fouls: 'Faltas', other: 'Outro',
};

interface Props {
  onExtracted?: (slip: ExtractedSlip) => void;
}

export function UploadOdds({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setBusy(true); setError(''); setResult(null);
    try {
      setPhase('Deixando o print levinho…');
      const { base64, mediaType } = await prepareImage(file);
      setPhase('Tentando ler de graça (OCR)…');
      const ocrText = await tryOcr(base64);
      setPhase(ocrText ? 'Conferindo as odds…' : 'Lendo o print com o Zé…');
      const res = await zeExtractOdds({ ocrText, imageBase64: base64, mediaType });
      setResult(res.data);
      onExtracted?.(res.data.slip);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não consegui ler esse print. Tenta um mais nítido.');
    } finally {
      setBusy(false); setPhase('');
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-100">Manda o print da Betano</h3>
        <p className="text-sm text-slate-400">Tira um print da tela do jogo na Betano. O Zé lê as odds — de todos os mercados.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 py-8 text-emerald-300 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
        <span className="font-semibold">{busy ? phase || 'Lendo…' : 'Escolher / tirar foto'}</span>
      </button>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-100">
              {result.slip.homeTeam || 'Jogo'} {result.slip.awayTeam ? `x ${result.slip.awayTeam}` : ''}
            </div>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold',
              result.source === 'ocr' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-sky-500/15 text-sky-300')}>
              {result.source === 'ocr' ? 'Lido de graça (OCR)' : 'Lido pelo Zé (Vision)'}
            </span>
          </div>
          {result.slip.league && <p className="text-xs text-slate-500">{result.slip.league}</p>}
          {result.slip.superOdds && (
            <p className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
              <Sparkles className="h-3 w-3" /> Tem SuperOdds nesse print — odd turbinada (sinal forte, mas não garantia).
            </p>
          )}
          <ul className="space-y-1.5">
            {result.slip.markets.map((m, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2 text-sm">
                <span className="text-slate-300"><span className="text-slate-500">{MARKET_PT[m.market] || m.market}:</span> {m.selection}</span>
                <span className="font-bold text-emerald-400">{m.odd.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Guardado no Waze das Odds — outro da turma reaproveita sem printar de novo.
          </p>
        </div>
      )}
    </div>
  );
}
