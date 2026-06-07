import { useRef, useState } from 'react';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { doc, onSnapshot, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { UploadCloud, FileText, Loader2, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { storage, db, auth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useSubscription } from '@/hooks/useSubscription';
import { track, Events } from '@/lib/analytics';
import type { Upload } from '@/types';
import { cn } from '@/lib/utils';

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

export function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Upload['status'] | null>(null);
  const [result, setResult] = useState<Upload | null>(null);
  const [error, setError] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { limits, isPaid } = useSubscription();

  async function handleFile(file: File) {
    setError('');
    setResult(null);
    const user = auth.currentUser;
    if (!user) return;

    // Verificar limite de uploads do plano gratuito
    if (!isPaid) {
      const count = await countUploadsThisMonth(user.uid);
      if (count >= limits.uploadsPerMonth) {
        setShowUpgrade(true);
        track(Events.UPGRADE_MODAL_SHOWN, { reason: 'upload_limit' });
        return;
      }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'csv', 'xlsx', 'xls', 'txt'].includes(ext)) {
      setError('Formato não suportado. Envie PDF, CSV ou XLSX.');
      return;
    }

    const uploadId = `${Date.now()}`;
    setStatus('uploading');

    const uploadDocRef = doc(db, 'users', user.uid, 'uploads', uploadId);
    await setDoc(uploadDocRef, {
      filename: file.name,
      fileType: ext,
      status: 'uploading',
      uploadedAt: new Date(),
    });

    const unsub = onSnapshot(uploadDocRef, (snap) => {
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() } as Upload;
      setStatus(data.status);
      if (data.status === 'done') {
        setResult(data);
        track(Events.UPLOAD_COMPLETED, { fileType: ext });
        unsub();
      }
      if (data.status === 'error') {
        setResult(data);
        setError(data.errorMessage || 'Erro ao processar.');
        unsub();
      }
    });

    await uploadBytes(storageRef(storage, `uploads/${user.uid}/${uploadId}`), file, {
      contentType: file.type || 'application/octet-stream',
    });
    track(Events.FIRST_UPLOAD);
  }

  const busy = status === 'uploading' || status === 'processing';

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {showUpgrade && (
        <UpgradeModal reason="upload_limit" onClose={() => setShowUpgrade(false)} />
      )}

      {/* Banner de limite para plano gratuito */}
      {!isPaid && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-amber-700 dark:text-amber-400">
              Plano gratuito: {limits.uploadsPerMonth} uploads por mês
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Importar extrato bancário</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-all duration-200',
              dragging ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-border hover:border-primary/40 hover:bg-accent/30'
            )}
          >
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl mb-4 transition-colors',
              dragging ? 'bg-primary/15' : 'bg-secondary'
            )}>
              <UploadCloud className={cn(
                'h-7 w-7 transition-colors',
                dragging ? 'text-primary' : 'text-muted-foreground'
              )} />
            </div>
            <p className="font-semibold mb-1">Arraste seu extrato aqui</p>
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

          {status && (
            <div className={cn(
              'mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all',
              status === 'done' ? 'border-success/30 bg-success/5' :
              status === 'error' ? 'border-destructive/30 bg-destructive/5' :
              'border-primary/20 bg-primary/5'
            )}>
              {busy && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
              {status === 'done' && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
              {status === 'error' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
              <span className={cn(
                status === 'done' ? 'text-success' :
                status === 'error' ? 'text-destructive' :
                'text-muted-foreground'
              )}>
                {status === 'uploading' && 'Enviando arquivo…'}
                {status === 'processing' && 'Lendo e categorizando transações com IA…'}
                {status === 'done' && `Pronto! ${result?.totalTransactions ?? 0} transações importadas.`}
                {status === 'error' && error}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {result?.status === 'done' && (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="text-sm">
              <p className="font-medium">{result.filename}</p>
              <p className="text-muted-foreground">
                Confira e corrija categorias na aba Transações — o app aprende com suas correções.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          🔒 Seu extrato é processado e apagado do servidor logo após a importação.
        </p>
        <p className="text-xs text-muted-foreground">
          Bancos suportados: Nubank, Inter, Itaú, Bradesco, Santander, Caixa, BB, C6, PicPay
        </p>
      </div>
    </div>
  );
}
