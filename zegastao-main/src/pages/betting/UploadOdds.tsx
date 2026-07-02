import { useRef, useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { functionsUsEast, db } from '@/firebase';
import { prepareImage, tryOcr } from '@/lib/imagePrep';
import { Camera, FolderOpen, PlusCircle, Loader2, Sparkles, CheckCircle2, Users, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExtractedMarket { market: string; selection: string; odd: number; }
interface ExtractedSlip {
  homeTeam?: string; awayTeam?: string; league?: string; matchDate?: string;
  markets: ExtractedMarket[]; confidence: number; superOdds?: boolean;
}
interface GamePreview {
  homeTeam: string; awayTeam: string; league?: string; matchDate?: string;
  markets: ExtractedMarket[];
}
type ExtractResult = { slip: ExtractedSlip; source: 'ocr' | 'vision'; allGames?: GamePreview[] };
interface CachedGame { id: string; payload: ExtractedSlip; source: string; fetchedAt: Timestamp; }

const zeExtractOdds = httpsCallable<
  { ocrText?: string; imageBase64?: string; mediaType?: string },
  ExtractResult
>(functionsUsEast, 'zeExtractOdds');

const MARKET_PT: Record<string, string> = {
  h2h: 'Resultado', totals: 'Total de Gols', btts: 'Ambas Marcam',
  corners: 'Escanteios', cards: 'Cartões', shots: 'Finalizações', fouls: 'Faltas',
};

// Agrupa mercados 1/X/2 consecutivos num bloco compacto.
// Limita a UM bloco h2h (um jogo tem exatamente um conjunto 1X2 — múltiplos indicam
// print de lista que passou pelo OCR incorretamente; Vision corrige isso na raiz).
type H2HGroup = { type: 'h2h'; home: ExtractedMarket; draw: ExtractedMarket; away: ExtractedMarket };
type MarketGroup = H2HGroup | { type: 'single'; m: ExtractedMarket };

function groupMarkets(markets: ExtractedMarket[]): MarketGroup[] {
  const result: MarketGroup[] = [];
  let h2hBlocks = 0;
  let i = 0;
  while (i < markets.length) {
    const sel = markets[i].selection.toLowerCase().trim();
    if (sel === '1' && i + 2 < markets.length) {
      const s1 = markets[i + 1].selection.toLowerCase().trim();
      const s2 = markets[i + 2].selection.toLowerCase().trim();
      if ((s1 === 'x' || s1 === 'empate') && s2 === '2') {
        if (h2hBlocks === 0) {
          // Só mostra o primeiro bloco h2h (o do jogo selecionado)
          result.push({ type: 'h2h', home: markets[i], draw: markets[i + 1], away: markets[i + 2] });
          h2hBlocks += 1;
        }
        i += 3;
        continue;
      }
    }
    // Mercados não-h2h: mostra normalmente
    if (markets[i].market !== 'h2h') {
      result.push({ type: 'single', m: markets[i] });
    }
    i++;
  }
  return result;
}

function daysSince(ts: Timestamp): string {
  const diff = Math.floor((Date.now() - ts.toMillis()) / 60000);
  if (diff < 60) return `${diff}min atrás`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`;
  return `${Math.floor(diff / 1440)}d atrás`;
}

interface Props {
  onExtracted?: (slip: ExtractedSlip) => void;
}

function mergeMarkets(base: ExtractedMarket[], incoming: ExtractedMarket[]): ExtractedMarket[] {
  const key = (m: ExtractedMarket) => `${m.market}:${m.selection.toLowerCase()}`;
  const seen = new Set(base.map(key));
  return [...base, ...incoming.filter((m) => !seen.has(key(m)))];
}

export function UploadOdds({ onExtracted }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);
  // Guardado para eventual retry com Vision sem pedir o arquivo de novo
  const pendingImageRef = useRef<{ base64: string; mediaType: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState('');
  const [community, setCommunity] = useState<CachedGame[]>([]);
  const [loadingComm, setLoadingComm] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  // Seletor de jogo: quando Vision encontra múltiplos jogos num print de lista
  const [pendingGames, setPendingGames] = useState<GamePreview[]>([]);
  const [wazeExpanded, setWazeExpanded] = useState(false);
  // Confirmação de nomes: quando OCR retorna nome truncado, usuário confirma/corrige antes de prosseguir
  const [confirmNames, setConfirmNames] = useState<{ home: string; away: string; slip: ExtractedSlip } | null>(null);

  const fetchCommunity = useCallback(async () => {
    setLoadingComm(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'betting_cache'), orderBy('fetchedAt', 'desc'), limit(10))
      );
      const cutoff = Date.now() - 4 * 60 * 60 * 1000; // 4h — descarta extrações velhas/incorretas
      setCommunity(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as CachedGame))
          .filter((g) => {
            if (!g.payload?.homeTeam || !g.payload?.awayTeam) return false;
            if (g.fetchedAt?.toMillis() < cutoff) return false;
            // Nomes truncados pelo OCR começam com minúscula (ex: "ósnia" em vez de "Bósnia")
            const startsUpper = (s: string) => s.length > 0 && s[0] === s[0].toUpperCase() && s[0] !== s[0].toLowerCase();
            return startsUpper(g.payload.homeTeam) && startsUpper(g.payload.awayTeam);
          })
      );
    } catch { /* best-effort */ } finally {
      setLoadingComm(false);
    }
  }, []);

  useEffect(() => { fetchCommunity(); }, [fetchCommunity]);

  // Retorna true se o nome do time parece correto (começa com maiúscula).
  // OCR de lista da Betano às vezes dropa a primeira letra (ex: "ósnia" em vez de "Bósnia").
  function nameOk(s?: string): boolean {
    if (!s || s.length === 0) return true; // ausente é ok, string vazia não bloqueia
    return s[0] === s[0].toUpperCase() && s[0] !== s[0].toLowerCase();
  }

  async function handleFile(file: File) {
    setBusy(true); setError(''); setResult(null); setSelected(null); setPendingGames([]); setConfirmNames(null);
    try {
      setPhase('Comprimindo imagem…');
      const { base64, mediaType } = await prepareImage(file);
      pendingImageRef.current = { base64, mediaType };
      setPhase('Lendo as odds (OCR)…');
      const ocrText = await tryOcr(base64);
      setPhase(ocrText ? 'Conferindo as odds…' : 'Lendo com o Zé (Vision)…');
      const res = await zeExtractOdds({ ocrText, imageBase64: base64, mediaType });
      const slip = res.data.slip;

      // Se OCR retornou nome truncado (inicia em minúscula, ex: "ósnia"),
      // para e pede confirmação ao usuário em vez de reprocessar silenciosamente.
      if (!nameOk(slip.homeTeam) || !nameOk(slip.awayTeam)) {
        setConfirmNames({ home: slip.homeTeam || '', away: slip.awayTeam || '', slip });
        setBusy(false); setPhase('');
        return;
      }

      setResult(res.data);
      setSelected('upload');
      const games = res.data.allGames ?? [];
      if (games.length > 1) {
        setPendingGames(games);
      } else {
        onExtracted?.(slip);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não consegui ler esse print. Tenta um mais nítido.');
    } finally {
      setBusy(false); setPhase('');
    }
  }

  // Usuário confirmou (ou corrigiu) os nomes → usa os mercados do OCR com nomes corrigidos
  function handleConfirmNames(home: string, away: string) {
    if (!confirmNames) return;
    const correctedSlip: ExtractedSlip = { ...confirmNames.slip, homeTeam: home.trim(), awayTeam: away.trim() };
    setResult({ slip: correctedSlip, source: 'ocr' });
    setSelected('upload');
    setConfirmNames(null);
    onExtracted?.(correctedSlip);
  }

  // Usuário pediu releitura com Vision — usa a imagem salva, sem pedir de novo
  async function handleVisionRetry() {
    if (!pendingImageRef.current) return;
    setConfirmNames(null);
    setBusy(true); setError('');
    try {
      setPhase('Lendo com Vision…');
      const { base64, mediaType } = pendingImageRef.current;
      const res = await zeExtractOdds({ imageBase64: base64, mediaType });
      setResult(res.data);
      setSelected('upload');
      const games = res.data.allGames ?? [];
      if (games.length > 1) {
        setPendingGames(games);
      } else {
        onExtracted?.(res.data.slip);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no Vision. Tenta um print mais nítido.');
    } finally {
      setBusy(false); setPhase('');
    }
  }

  async function handleAdditionalFile(file: File) {
    setBusy(true); setError('');
    try {
      setPhase('Lendo mercados adicionais…');
      const { base64, mediaType } = await prepareImage(file);
      const ocrText = await tryOcr(base64);
      setPhase('Extraindo com o Zé…');
      const res = await zeExtractOdds({ ocrText, imageBase64: base64, mediaType });
      const newMarkets = res.data.slip.markets;
      setResult((prev) => {
        if (!prev) return null;
        const merged = mergeMarkets(prev.slip.markets, newMarkets);
        const updatedSlip = { ...prev.slip, markets: merged };
        onExtracted?.(updatedSlip);
        return { ...prev, slip: updatedSlip };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não consegui ler esse print adicional.');
    } finally {
      setBusy(false); setPhase('');
    }
  }

  function pickGame(game: GamePreview) {
    setPendingGames([]);
    const slip: ExtractedSlip = {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      league: game.league,
      matchDate: game.matchDate,
      markets: game.markets,
      confidence: 0.9,
    };
    setResult((prev) => prev ? { ...prev, slip } : null);
    onExtracted?.(slip);
  }

  function useCached(game: CachedGame) {
    setSelected(game.id);
    setResult({ slip: game.payload, source: game.source as 'ocr' | 'vision' });
    onExtracted?.(game.payload);
  }

  const groups = result ? groupMarkets(result.slip.markets.filter(m => typeof m.odd === 'number' && m.odd > 0)) : [];

  return (
    <div className="space-y-5">
      {/* Upload */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground">📸 Manda o print da Betano</h3>
          <p className="text-xs text-muted-foreground">
            Para mais mercados (escanteios, cartões, gols), abra o jogo específico na Betano e tire um print da página do jogo — não só da lista.
          </p>
        </div>

        {/* Camera input (mobile: opens camera directly) */}
        <input
          ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
        {/* Gallery/files input (no capture — shows file picker + gallery on mobile) */}
        <input
          ref={galleryInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
        {/* Additional markets input */}
        <input
          ref={additionalInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAdditionalFile(f); e.target.value = ''; }}
        />

        {busy ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/40 px-4 py-6 text-sm font-semibold text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {phase || 'Lendo…'}
          </div>
        ) : (
          <div className={cn('grid gap-2', result ? 'grid-cols-2' : 'grid-cols-2')}>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-sm font-semibold transition-colors',
                result ? 'border-border bg-secondary/40 text-muted-foreground' : 'border-green-500/40 bg-green-500/5 text-green-300'
              )}
            >
              <Camera className="h-4 w-4" />
              {result ? 'Nova câmera' : 'Câmera'}
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-sm font-semibold transition-colors',
                result ? 'border-border bg-secondary/40 text-muted-foreground' : 'border-green-500/40 bg-green-500/5 text-green-300'
              )}
            >
              <FolderOpen className="h-4 w-4" />
              {result ? 'Nova galeria' : 'Galeria'}
            </button>
          </div>
        )}

        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      </div>

      {/* Confirmação de nomes — OCR pode ter cortado a primeira letra */}
      {confirmNames && (
        <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-300">
            ⚠️ OCR pode ter cortado os nomes — confira e corrija se necessário:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Time da casa</label>
              <input
                value={confirmNames.home}
                onChange={(e) => setConfirmNames((p) => p ? { ...p, home: e.target.value } : null)}
                className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Time de fora</label>
              <input
                value={confirmNames.away}
                onChange={(e) => setConfirmNames((p) => p ? { ...p, away: e.target.value } : null)}
                className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleConfirmNames(confirmNames.home, confirmNames.away)}
              disabled={!confirmNames.home.trim() || !confirmNames.away.trim()}
              className="flex-1 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-40"
            >
              Confirmar e analisar
            </button>
            <button
              onClick={handleVisionRetry}
              className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-border/70 hover:text-foreground/90"
            >
              Ler com Vision
            </button>
          </div>
        </div>
      )}

      {/* Seletor de jogo — quando Vision encontra múltiplos jogos num print de lista */}
      {pendingGames.length > 1 && (
        <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-300">
            📋 {pendingGames.length} jogos encontrados — qual você quer analisar?
          </p>
          <p className="text-xs text-muted-foreground/70">
            Dica: para mais mercados (escanteios, cartões, gols), abra o jogo na Betano e tire um print da página do jogo.
          </p>
          <div className="grid gap-2">
            {pendingGames.map((g, i) => {
              const h2h = g.markets.filter(m => typeof m.odd === 'number' && m.odd > 0).slice(0, 3);
              return (
                <button
                  key={i}
                  onClick={() => pickGame(g)}
                  className="w-full rounded-xl border border-border bg-card/60 p-3 text-left hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors"
                >
                  <p className="text-sm font-semibold text-foreground">{g.homeTeam} <span className="text-muted-foreground/70">x</span> {g.awayTeam}</p>
                  {g.league && <p className="text-[11px] text-muted-foreground/70">{g.league}</p>}
                  {h2h.length >= 3 && (
                    <div className="mt-2 flex gap-2">
                      {h2h.map((m, j) => (
                        <div key={j} className="flex-1 rounded-lg bg-secondary/60 py-1 text-center">
                          <div className="text-[9px] text-muted-foreground/70">{['1', 'X', '2'][j]}</div>
                          <div className="text-xs font-bold text-green-400">{m.odd.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Resultado do upload */}
      {result && selected === 'upload' && pendingGames.length === 0 && (
        <>
          <OddsCard slip={result.slip} groups={groups} source={result.source} />
          <button
            onClick={() => additionalInputRef.current?.click()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground hover:border-green-500/40 hover:text-green-300 transition-colors disabled:opacity-50"
          >
            <PlusCircle className="h-4 w-4" />
            Adicionar mais mercados (escanteios, cartões…)
          </button>
        </>
      )}

      {/* Waze das Odds — feed compacto da comunidade */}
      <div className="rounded-xl border border-border bg-card/40">
        <button
          onClick={() => setWazeExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Waze das Odds
            {community.length > 0 && (
              <span className="rounded-full bg-secondary/80 px-1.5 py-0.5 text-[10px] text-foreground/80">{community.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); fetchCommunity(); }} className="text-muted-foreground/50 hover:text-muted-foreground">
              <RefreshCw className={cn('h-3 w-3', loadingComm && 'animate-spin')} />
            </button>
            {wazeExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/70" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />}
          </div>
        </button>

        {wazeExpanded && (
          <div className="border-t border-border px-3 pb-3 pt-2">
            {loadingComm ? (
              <div className="flex h-16 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
              </div>
            ) : community.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground/50">Nenhum jogo ainda. Seja o primeiro!</p>
            ) : (
              <div className="space-y-1">
                {community.slice(0, 6).map((g) => {
                  const h2h = g.payload.markets
                    .filter(m => (m.market === 'h2h' || m.market === 'other') && typeof m.odd === 'number' && m.odd > 0)
                    .slice(0, 3);
                  const isSelected = selected === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => useCached(g)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                        isSelected ? 'bg-green-500/10' : 'hover:bg-secondary/60'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground/90">
                          {g.payload.homeTeam} <span className="text-muted-foreground/70">x</span> {g.payload.awayTeam}
                          {g.payload.superOdds && <Sparkles className="ml-1 inline h-2.5 w-2.5 text-amber-400" />}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50">{daysSince(g.fetchedAt)}</p>
                      </div>
                      {h2h.length >= 3 && (
                        <div className="flex shrink-0 gap-1.5 text-[11px]">
                          {h2h.map((m, i) => (
                            <span key={i} className={cn('font-bold', isSelected ? 'text-green-400' : 'text-muted-foreground')}>
                              {m.odd.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      )}
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Corrige o ano quando Vision extrai data sem ano explícito do print (ex: 2025-07-01 → 2026-07-01).
// Segurança adicional no frontend; a correção principal está no backend (fixYear em zeVision.ts).
function fixDateYear(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const curYear = new Date().getFullYear();
  if (y < curYear && !isNaN(m) && !isNaN(d)) {
    const candidate = new Date(curYear, m - 1, d);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (candidate >= yesterday) return `${curYear}-${parts[1]}-${parts[2]}`;
  }
  return dateStr;
}

function OddsCard({ slip, groups, source }: { slip: ExtractedSlip; groups: MarketGroup[]; source: 'ocr' | 'vision' }) {
  const displayDate = slip.matchDate ? fixDateYear(slip.matchDate) : undefined;
  const isPastGame = displayDate ? new Date(`${displayDate}T23:59:59Z`) < new Date(Date.now() - 24 * 60 * 60 * 1000) : false;
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
      {isPastGame && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300">
          ⚠️ Jogo já realizado ({displayDate}) — você pode ver as odds mas não é possível analisar.
        </p>
      )}
      {/* Header do jogo */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            {slip.homeTeam || 'Jogo'} {slip.awayTeam ? `x ${slip.awayTeam}` : ''}
          </p>
          {slip.league && <p className="text-[11px] text-muted-foreground/70">{slip.league}</p>}
          {displayDate && <p className="text-[11px] text-muted-foreground/70">{new Date(displayDate + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>}
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
          source === 'ocr' ? 'bg-green-500/15 text-green-300' : 'bg-sky-500/15 text-sky-300')}>
          {source === 'ocr' ? '⚡ OCR grátis' : '🧠 Vision'}
        </span>
      </div>

      {slip.superOdds && (
        <p className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-300">
          <Sparkles className="h-3 w-3" /> SuperOdds detectado — odd turbinada (pode mudar até a hora do jogo)
        </p>
      )}

      {/* Mercados agrupados */}
      <div className="space-y-2">
        {groups.map((g, i) => {
          if (g.type === 'h2h') {
            return (
              <div key={i} className="rounded-xl border border-border/60 bg-secondary/40 p-2.5">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Resultado</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <OddChip label="1 (Casa)" odd={g.home.odd} />
                  <OddChip label="X (Empate)" odd={g.draw.odd} />
                  <OddChip label="2 (Fora)" odd={g.away.odd} />
                </div>
              </div>
            );
          }
          const m = g.m;
          const label = MARKET_PT[m.market] || (m.market !== 'other' ? m.market : null);
          return (
            <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
              <span className="text-foreground/80">
                {label && <span className="mr-1 text-muted-foreground/70">{label}:</span>}
                {m.selection}
              </span>
              <span className="font-bold text-green-400">{m.odd.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
        <CheckCircle2 className="h-3 w-3 text-green-500" />
        Salvo no Waze das Odds — a comunidade reaproveita sem precisar printar de novo
      </p>
    </div>
  );
}

function OddChip({ label, odd }: { label: string; odd: number }) {
  return (
    <div className="rounded-lg bg-card py-2 text-center">
      <div className="text-[9px] text-muted-foreground/70 truncate px-1">{label}</div>
      <div className="text-sm font-extrabold text-green-400">{odd.toFixed(2)}</div>
    </div>
  );
}
