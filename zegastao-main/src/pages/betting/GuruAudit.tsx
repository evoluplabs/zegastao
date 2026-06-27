// Desmascarador de Guru: o usuário manda o print do bilhete de um tipster e o Zé
// calcula a chance real e quanto a casa lucra com aquela múltipla. Honesto e viral.
import { useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { prepareImage, tryOcr } from '@/lib/imagePrep';
import { Search, Loader2, AlertTriangle } from 'lucide-react';

interface GuruResult { legs: number; combinedOdd: number; realChancePct: number; houseEdgePct: number; }

const zeGuruAudit = httpsCallable<
  { ocrText?: string; imageBase64?: string; mediaType?: string },
  GuruResult
>(functions, 'zeGuruAudit');

export function GuruAudit() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GuruResult | null>(null);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setBusy(true); setError(''); setResult(null);
    try {
      const { base64, mediaType } = await prepareImage(file);
      const ocrText = await tryOcr(base64);
      const res = await zeGuruAudit({ ocrText, imageBase64: base64, mediaType });
      setResult(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não consegui ler esse bilhete. Manda um print mais nítido.');
    } finally {
      setBusy(false);
    }
  }

  const verdict = result
    ? result.realChancePct < 5
      ? 'É praticamente bilhete de rifa. 🎟️'
      : result.realChancePct < 20
      ? 'A chance real é bem baixa. A casa adora esse tipo de aposta.'
      : 'Tem alguma chance, mas a margem da casa pesa.'
    : '';

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-stone-100">Desmascarador de Guru</h3>
        <p className="text-sm text-stone-400">Recebeu um bilhete "premiado" de algum tipster? Manda o print que o Zé mostra a real.</p>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      <button onClick={() => inputRef.current?.click()} disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-8 text-amber-300 disabled:opacity-60">
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-6 w-6" />}
        <span className="font-semibold">{busy ? 'Analisando o bilhete…' : 'Mandar print do bilhete'}</span>
      </button>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Pernas" value={String(result.legs)} />
            <Stat label="Odd total" value={result.combinedOdd.toFixed(2)} />
            <Stat label="Chance real" value={`${result.realChancePct.toFixed(1)}%`} highlight />
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <AlertTriangle className="h-4 w-4" /> Margem da casa: ~{result.houseEdgePct}%
            </div>
            <p className="mt-1 text-sm text-stone-300">{verdict}</p>
          </div>
          <p className="text-[11px] text-stone-500">
            Estimativa honesta: a "chance real" tira a margem embutida nas odds. Quanto mais pernas, mais a casa lucra.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-stone-800/60 p-2">
      <div className={highlight ? 'text-xl font-extrabold text-amber-400' : 'text-xl font-bold text-stone-100'}>{value}</div>
      <div className="text-[10px] text-stone-500">{label}</div>
    </div>
  );
}
