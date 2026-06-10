import { useRef, useState } from 'react';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { doc, onSnapshot, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import {
  UploadCloud, FileText, Loader2, CheckCircle2, XCircle, Lock,
  ArrowLeft, ArrowRight, Calendar, FileDown, ShieldCheck, RotateCcw, Eye,
} from 'lucide-react';
import { storage, db, auth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useSubscription } from '@/hooks/useSubscription';
import { track, Events } from '@/lib/analytics';
import type { Upload, StatementType } from '@/types';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { DocTypeStep } from '@/components/upload/DocTypeStep';
import { BankPicker } from '@/components/upload/BankPicker';
import { PhoneMockup } from '@/components/upload/PhoneMockup';
import { getBankGuide, getBankInfo, DOC_TYPE_INFO } from '@/lib/bankGuides';

async function countUploadsThisMonth(userId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const snap = await getDocs(
    query(
      collection(db, 'users', userId, 'uploads'),
      orderBy('uploadedAt', 'desc'),
      limit(20)
    )
  );
  return snap.docs.filter((d) => {
    const date = d.data().uploadedAt?.toDate?.() || new Date(d.data().uploadedAt);
    return date >= start;
  }).length;
}

type Step = 'type' | 'bank' | 'how' | 'send';

const STEP_ORDER: Step[] = ['type', 'bank', 'how', 'send'];
const STEP_LABELS = ['Tipo', 'Banco', 'Como exportar', 'Enviar'];

const ERROR_MESSAGES: Record<string, string> = {
  password: 'Esse PDF está protegido por senha. Remova a senha (ou exporte em CSV) e tente de novo.',
  unreadable: 'Não consegui ler esse arquivo. Tente exportar de novo em CSV — costuma funcionar melhor.',
  unsupported: 'Formato não suportado. Envie PDF, CSV ou XLSX.',
  generic: 'Algo deu errado ao processar. Confira as instruções e tente novamente.',
};

export function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { limits, isPaid } = useSubscription();

  // Wizard
  const [step, setStep] = useState<Step>('type');
  const [docType, setDocType] = useState<StatementType | null>(null);
  const [bankKey, setBankKey] = useState<string | null>(null);
  const [mockStep, setMockStep] = useState(0);

  // Upload
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Upload['status'] | null>(null);
  const [result, setResult] = useState<Upload | null>(null);
  const [error, setError] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);

  const stepIndex = STEP_ORDER.indexOf(step);

  function goNext() {
    const next = STEP_ORDER[stepIndex + 1];
    if (next) { setStep(next); setMockStep(0); }
  }
  function goBack() {
    const prev = STEP_ORDER[stepIndex - 1];
    if (prev) setStep(prev);
  }

  function resetWizard() {
    setStatus(null);
    setResult(null);
    setError('');
    setMockStep(0);
    setStep('type');
    setDocType(null);
    setBankKey(null);
  }

  async function handleFile(file: File) {
    setError('');
    setResult(null);
    const user = auth.currentUser;
    if (!user) return;

    if (!isPaid) {
      // Free tier: check total uploads (not just this month)
      const count = await countUploadsThisMonth(user.uid);
      const uploadLimit = limits.uploadsTotal ?? limits.uploadsPerMonth;
      if (count >= uploadLimit) {
        setShowUpgrade(true);
        track(Events.UPGRADE_MODAL_SHOWN, { reason: 'upload_limit' });
        return;
      }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'csv', 'xlsx', 'xls', 'txt'].includes(ext)) {
      setError(ERROR_MESSAGES.unsupported);
      return;
    }

    const uploadId = `${Date.now()}`;
    setStatus('uploading');

    const uploadDocRef = doc(db, 'users', user.uid, 'uploads', uploadId);
    await setDoc(uploadDocRef, {
      filename: file.name,
      fileType: ext,
      bank: bankKey || 'generico',
      statementType: docType || 'checking',
      status: 'uploading',
      uploadedAt: new Date(),
    });

    const unsub = onSnapshot(uploadDocRef, (snap) => {
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() } as Upload;
      setStatus(data.status);
      if (data.status === 'done') {
        setResult(data);
        track(Events.UPLOAD_COMPLETED, { fileType: ext, statementType: docType });
        unsub();
      }
      if (data.status === 'error') {
        setResult(data);
        setError(ERROR_MESSAGES[data.errorCode || 'generic'] || data.errorMessage || ERROR_MESSAGES.generic);
        unsub();
      }
    });

    await uploadBytes(storageRef(storage, `uploads/${user.uid}/${uploadId}`), file, {
      contentType: file.type || 'application/octet-stream',
    });
    track(Events.FIRST_UPLOAD);
  }

  const busy = status === 'uploading' || status === 'processing';
  const guide = bankKey && docType ? getBankGuide(bankKey, docType) : null;

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-12">
      {showUpgrade && (
        <UpgradeModal reason="upload_limit" onClose={() => setShowUpgrade(false)} />
      )}

      {/* Banner de limite para plano gratuito */}
      {!isPaid && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-amber-700 dark:text-amber-400">
              Plano gratuito: {limits.uploadsTotal ?? limits.uploadsPerMonth} upload para testar
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
            onClick={() => { setShowUpgrade(true); track(Events.UPGRADE_MODAL_SHOWN, { reason: 'upload_limit' }); }}
          >
            Desbloquear
          </Button>
        </div>
      )}

      {/* Progress stepper */}
      <div className="flex items-center gap-1.5">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={cn(
              'h-1 rounded-full transition-all duration-300',
              i <= stepIndex ? 'bg-primary' : 'bg-secondary'
            )} />
            <span className={cn(
              'mt-1 block text-[10px] font-medium transition-colors',
              i === stepIndex ? 'text-primary' : 'text-muted-foreground'
            )}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-5 min-h-[340px]">
        {/* Etapa 1: Tipo de documento */}
        {step === 'type' && (
          <DocTypeStep selected={docType} onSelect={(t) => { setDocType(t); }} />
        )}

        {/* Etapa 2: Banco */}
        {step === 'bank' && (
          <BankPicker selected={bankKey} onSelect={(b) => { setBankKey(b); }} />
        )}

        {/* Etapa 3: Como exportar */}
        {step === 'how' && guide && bankKey && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold">Como exportar no {getBankInfo(bankKey).name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {docType === 'credit_card' ? 'Fatura do cartão' : 'Extrato da conta'}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 items-start">
              <PhoneMockup
                steps={guide.steps}
                bank={getBankInfo(bankKey)}
                activeStep={mockStep}
                onStepChange={setMockStep}
              />

              <div className="space-y-2">
                {guide.steps.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setMockStep(i)}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all',
                      i === mockStep ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-accent/40'
                    )}
                  >
                    <span className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold shrink-0',
                      i === mockStep ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    )}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{s.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{s.detail}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dicas de período e formato */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
                <Calendar className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-snug">
                  <strong>Qual mês enviar?</strong> {guide.whichMonth}
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-green-50 border border-green-100 px-3 py-2.5">
                <FileDown className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-green-800 leading-snug">
                  <strong>Formato:</strong> {guide.format}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 4: Enviar */}
        {step === 'send' && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold">Envie seu arquivo</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {bankKey && `${getBankInfo(bankKey).name} · `}
                {docType && DOC_TYPE_INFO[docType].tagline}
              </p>
            </div>

            {!result && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => !busy && inputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200',
                  dragging ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-border hover:border-primary/40 hover:bg-accent/30',
                  busy && 'pointer-events-none opacity-60'
                )}
              >
                <div className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-2xl mb-4 transition-colors',
                  dragging ? 'bg-primary/15' : 'bg-secondary'
                )}>
                  <UploadCloud className={cn('h-7 w-7 transition-colors', dragging ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <p className="font-semibold mb-1">Arraste o arquivo aqui</p>
                <p className="text-sm text-muted-foreground mb-3">ou clique para escolher</p>
                <div className="flex gap-2">
                  {['PDF', 'CSV', 'XLSX'].map((f) => (
                    <span key={f} className="rounded-md border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {f}
                    </span>
                  ))}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            )}

            {/* Status */}
            {status && status !== 'done' && (
              <div className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all',
                status === 'error' ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5'
              )}>
                {busy && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                {status === 'error' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                <span className={status === 'error' ? 'text-destructive' : 'text-muted-foreground'}>
                  {status === 'uploading' && 'Enviando arquivo…'}
                  {status === 'processing' && 'Lendo e categorizando com IA… costuma levar alguns segundos.'}
                  {status === 'error' && error}
                </span>
              </div>
            )}

            {/* Erro: ações de recuperação */}
            {status === 'error' && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { setStatus(null); setStep('how'); }}>
                  <Eye className="h-4 w-4" /> Ver instruções
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { setStatus(null); setResult(null); setError(''); }}>
                  <RotateCcw className="h-4 w-4" /> Tentar de novo
                </Button>
              </div>
            )}

            {/* Sucesso */}
            {result?.status === 'done' && (
              <div className="space-y-3">
                <div className="flex flex-col items-center text-center gap-2 rounded-2xl border border-success/30 bg-success/5 p-5">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                  <p className="font-bold text-lg">Pronto! 🎉</p>
                  <p className="text-sm text-muted-foreground">
                    {result.totalTransactions ?? 0} transações importadas de {result.filename}.
                  </p>
                </div>

                {/* CTA para copilot com contexto pré-preenchido */}
                <button
                  onClick={() => navigate(`/copilot?prompt=${encodeURIComponent(`Analisei meu extrato do ${bankKey ? bankKey : 'banco'}. O que isso revela sobre meus gastos e como posso melhorar?`)}`)}
                  className="w-full rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 text-left hover:bg-primary/10 transition-colors"
                >
                  <p className="text-sm font-semibold text-primary">Perguntar ao Copiloto sobre este extrato →</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Ele já tem o contexto das suas transações importadas</p>
                </button>

                <Button className="w-full gap-2" onClick={() => navigate('/transactions')}>
                  <FileText className="h-4 w-4" /> Ver minhas transações
                </Button>

                {/* Sugerir importar o outro tipo */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => resetWizard()}
                >
                  Importar {docType === 'checking' ? 'fatura do cartão' : 'extrato da conta'} agora
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navegação do wizard */}
      {!(step === 'send' && (busy || result?.status === 'done')) && (
        <div className="flex items-center gap-3">
          {stepIndex > 0 && (
            <Button variant="outline" className="gap-2" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          )}
          {step !== 'send' && (
            <Button
              className="flex-1 gap-2"
              onClick={goNext}
              disabled={
                (step === 'type' && !docType) ||
                (step === 'bank' && !bankKey)
              }
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Selo de privacidade — sempre visível */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        Seu extrato é processado e apagado do servidor logo após a importação.
      </div>
    </div>
  );
}
