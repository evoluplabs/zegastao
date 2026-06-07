import { useEffect, useState, type TextareaHTMLAttributes } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { Brain, Save, Bot, PenLine } from 'lucide-react';
import { db } from '@/firebase';
import { useStore } from '@/store/useStore';
import { useCopilotNotes } from '@/hooks/useDocuments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatBRL } from '@/lib/utils';
import type { UserWrittenContext, ImpulseItem } from '@/types';

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

export function PersonalContext() {
  const user = useStore((s) => s.user);
  const notes = useCopilotNotes();
  const [form, setForm] = useState<UserWrittenContext>({});
  const [impulses, setImpulses] = useState<ImpulseItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'personal_context', 'user_written');
    const unsubDoc = onSnapshot(ref, (snap) => {
      if (snap.exists()) setForm(snap.data() as UserWrittenContext);
    });
    const itemsRef = query(
      collection(db, 'users', user.uid, 'personal_context', 'impulse_history', 'items'),
      orderBy('recordedAt', 'desc')
    );
    const unsubItems = onSnapshot(itemsRef, (snap) => {
      setImpulses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ImpulseItem));
    });
    return () => {
      unsubDoc();
      unsubItems();
    };
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'personal_context', 'user_written'),
        { ...form, updatedAt: new Date() },
        { merge: true }
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Brain className="h-5 w-5" /> Meu contexto pessoal
      </h2>
      <p className="text-sm text-muted-foreground">
        Um diário financeiro vivo, escrito em parceria com o copiloto.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Coluna do usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine className="h-4 w-4" /> O que eu escrevi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Meus objetivos de vida</Label>
              <Textarea
                placeholder="O que você quer conquistar?"
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Como estou me sentindo / meus medos</Label>
              <Textarea
                placeholder="O que te tira o sono?"
                value={form.currentFeelings || ''}
                onChange={(e) => setForm({ ...form, currentFeelings: e.target.value })}
              />
            </div>
            <Button onClick={save} disabled={saving} className="w-full">
              <Save className="h-4 w-4" /> {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </CardContent>
        </Card>

        {/* Coluna do copiloto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" /> O que o copiloto anotou
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!notes && (
              <p className="text-muted-foreground">
                As anotações aparecem após o primeiro processamento noturno.
              </p>
            )}
            {notes?.suggestedFocus && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary">Foco desta semana</p>
                <p>{notes.suggestedFocus}</p>
              </div>
            )}
            <NoteList title="Padrões observados" items={notes?.behaviorPatterns} />
            <NoteList title="Seus pontos fortes" items={notes?.strengths} />
            <NoteList title="Áreas de atenção" items={notes?.riskAreas} />
            {notes?.lastAnalysis && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Última análise</p>
                <p>{notes.lastAnalysis}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Histórico de impulsos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de impulsos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {impulses.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Quando você conversar sobre uma vontade de compra no Copiloto, ela aparece aqui.
            </p>
          )}
          {impulses.map((it) => (
            <div key={it.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{it.impulse}</p>
              {it.impactIfActed ? (
                <p className="text-xs text-muted-foreground">Impacto estimado: {formatBRL(it.impactIfActed)}</p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function NoteList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="list-disc space-y-0.5 pl-5">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}
