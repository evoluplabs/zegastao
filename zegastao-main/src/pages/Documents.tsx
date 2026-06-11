import { useRef, useState, type ReactNode } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { FileText, Upload as UploadIcon, Download, AlertTriangle, Lightbulb, Handshake, Loader2, Camera } from 'lucide-react';
import { storage, db, auth } from '@/firebase';
import { useContracts, useDocuments } from '@/hooks/useDocuments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatPct } from '@/lib/utils';
import type { Contract } from '@/types';

const STATUS_LABEL: Record<Contract['status'], string> = {
  pending: 'Pendente',
  analyzing: 'Analisando…',
  analyzed: 'Analisado',
  error: 'Erro',
};

export function Documents() {
  const contractRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const { data: contracts } = useContracts();
  const { data: documents } = useDocuments();
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Upload de contrato → dispara a Cloud Function analyzeContract.
  async function uploadContract(file: File) {
    const user = auth.currentUser;
    if (!user) return;
    setUploading(true);
    try {
      const id = `${Date.now()}`;
      await setDoc(doc(db, 'users', user.uid, 'contracts', id), {
        filename: file.name,
        status: 'pending',
        uploadedAt: new Date(),
      });
      await uploadBytes(storageRef(storage, `contracts/${user.uid}/${id}`), file, {
        contentType: file.type || 'application/pdf',
      });
    } finally {
      setUploading(false);
    }
  }

  // Documento genérico → biblioteca (sem análise automática).
  async function uploadDocument(file: File) {
    const user = auth.currentUser;
    if (!user) return;
    setUploading(true);
    try {
      const id = `${Date.now()}`;
      const path = `documents/${user.uid}/${id}`;
      await uploadBytes(storageRef(storage, path), file, {
        contentType: file.type || 'application/octet-stream',
      });
      await setDoc(doc(db, 'users', user.uid, 'documents', id), {
        filename: file.name,
        type: 'other',
        storagePath: path,
        uploadedAt: new Date(),
      });
    } finally {
      setUploading(false);
    }
  }

  async function download(path?: string) {
    if (!path) return;
    const url = await getDownloadURL(storageRef(storage, path));
    window.open(url, '_blank');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Meus documentos</h2>
        {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="cursor-pointer hover:bg-accent/50" onClick={() => contractRef.current?.click()}>
          <CardContent className="flex items-center gap-3 py-5">
            <UploadIcon className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-medium">Analisar contrato (PDF)</p>
              <p className="text-xs text-muted-foreground">Empréstimo, financiamento, cartão…</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50" onClick={() => cameraRef.current?.click()}>
          <CardContent className="flex items-center gap-3 py-5">
            <Camera className="h-6 w-6 text-orange-500" />
            <div>
              <p className="text-sm font-medium">Fotografar contrato</p>
              <p className="text-xs text-muted-foreground">Tire uma foto com a câmera — a IA analisa</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50" onClick={() => docRef.current?.click()}>
          <CardContent className="flex items-center gap-3 py-5">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Guardar documento</p>
              <p className="text-xs text-muted-foreground">Comprovantes, recibos, qualquer arquivo</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <input ref={contractRef} type="file" accept=".pdf" className="hidden"
        onChange={(e) => e.target.files?.[0] && uploadContract(e.target.files[0])} />
      {/* capture="environment" abre câmera traseira no mobile */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files?.[0] && uploadContract(e.target.files[0])} />
      <input ref={docRef} type="file" className="hidden"
        onChange={(e) => e.target.files?.[0] && uploadDocument(e.target.files[0])} />

      {/* Contratos */}
      <h3 className="pt-2 text-sm font-semibold text-muted-foreground">Contratos ({contracts.length})</h3>
      {contracts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Envie um contrato e o copiloto extrai os termos reais — taxa, CET, multas e onde dá para negociar.
        </p>
      )}
      {contracts.map((c) => (
        <Card key={c.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> {c.filename}
              <Badge variant={c.status === 'analyzed' ? 'success' : c.status === 'error' ? 'destructive' : 'secondary'}>
                {STATUS_LABEL[c.status]}
              </Badge>
            </CardTitle>
            <div className="flex gap-1">
              {c.status === 'analyzed' && (
                <Button variant="ghost" size="sm" onClick={() => setOpenId(openId === c.id ? null : c.id)}>
                  {openId === c.id ? 'Fechar' : 'Ver análise'}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => download(c.storagePath)}>
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
          {openId === c.id && c.extracted && (
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Info label="Credor" value={c.extracted.creditor} />
                <Info label="Valor financiado" value={formatBRL(c.extracted.principalAmount)} />
                <Info label="Juros ao mês" value={formatPct(c.extracted.monthlyInterestRate * 100, 2)} />
                <Info label="CET anual" value={c.extracted.cetRate ? formatPct(c.extracted.cetRate * 100, 2) : '—'} />
                <Info label="Parcelas" value={`${c.extracted.totalInstallments}x ${formatBRL(c.extracted.installmentAmount)}`} />
                <Info label="Sistema" value={c.extracted.amortizationType.toUpperCase()} />
              </div>

              {c.extracted.keyClausesForUser?.length > 0 && (
                <Section icon={<Lightbulb className="h-4 w-4 text-amber-500" />} title="O que você precisa saber" items={c.extracted.keyClausesForUser} />
              )}
              {c.extracted.redFlags?.length > 0 && (
                <Section icon={<AlertTriangle className="h-4 w-4 text-destructive" />} title="Pontos de atenção" items={c.extracted.redFlags} />
              )}
              {c.extracted.negotiationOpportunities?.length > 0 && (
                <Section icon={<Handshake className="h-4 w-4 text-success" />} title="Onde negociar" items={c.extracted.negotiationOpportunities} />
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Outros documentos */}
      {documents.length > 0 && (
        <>
          <h3 className="pt-2 text-sm font-semibold text-muted-foreground">Outros documentos ({documents.length})</h3>
          {documents.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between py-3 text-sm">
                <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> {d.filename}</span>
                <Button variant="ghost" size="icon" onClick={() => download(d.storagePath)}>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Section({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-md border p-3">
      <p className="mb-1 flex items-center gap-2 font-medium">{icon} {title}</p>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}
