import { useRef, useState } from 'react';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { UploadCloud, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { storage, db, auth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Upload } from '@/types';

export function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Upload['status'] | null>(null);
  const [result, setResult] = useState<Upload | null>(null);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setError('');
    setResult(null);
    const user = auth.currentUser;
    if (!user) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'csv', 'xlsx', 'xls', 'txt'].includes(ext)) {
      setError('Formato não suportado. Envie PDF, CSV ou XLSX.');
      return;
    }

    const uploadId = `${Date.now()}`;
    setStatus('uploading');

    // Cria o doc de upload primeiro para o listener pegar o progresso.
    const uploadDocRef = doc(db, 'users', user.uid, 'uploads', uploadId);
    await setDoc(uploadDocRef, {
      filename: file.name,
      fileType: ext,
      status: 'uploading',
      uploadedAt: new Date(),
    });

    // Listener em tempo real do progresso do processamento.
    const unsub = onSnapshot(uploadDocRef, (snap) => {
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() } as Upload;
      setStatus(data.status);
      if (data.status === 'done' || data.status === 'error') {
        setResult(data);
        if (data.status === 'error') setError(data.errorMessage || 'Erro ao processar.');
        unsub();
      }
    });

    // Upload para Storage → dispara a Cloud Function onStatementUpload.
    const path = `uploads/${user.uid}/${uploadId}`;
    await uploadBytes(storageRef(storage, path), file, {
      contentType: file.type || 'application/octet-stream',
    });
  }

  const busy = status === 'uploading' || status === 'processing';

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Importar extrato</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
              dragging ? 'border-primary bg-primary/5' : 'border-input'
            }`}
          >
            <UploadCloud className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Arraste seu extrato aqui</p>
            <p className="text-sm text-muted-foreground">ou clique para escolher (PDF, CSV, XLSX)</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {status && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              {busy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {status === 'done' && <CheckCircle2 className="h-4 w-4 text-success" />}
              {status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
              <span className="text-muted-foreground">
                {status === 'uploading' && 'Enviando arquivo…'}
                {status === 'processing' && 'Lendo e categorizando transações…'}
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
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium">{result.filename}</p>
              <p className="text-muted-foreground">
                Confira e corrija categorias na aba Transações — o app aprende com suas correções.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Seu extrato é processado e apagado do servidor logo após a importação. 🔒
      </p>
    </div>
  );
}
