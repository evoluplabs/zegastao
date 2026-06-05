import { useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Send, Loader2 } from 'lucide-react';
import { functions } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const chat = httpsCallable<
  { message: string; history: ChatMessage[] },
  { response: string; impulse?: boolean }
>(functions, 'copilotChat');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Qual dívida devo pagar primeiro?',
  'Quando vou quitar minhas dívidas no ritmo atual?',
  'Tô pensando em comprar um tênis de R$400, posso?',
  'Me cria uma regra para guardar 30% de toda renda extra',
];

export function Copilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await chat({ message: text, history: messages });
      setMessages([...next, { role: 'assistant', content: res.data.response }]);
    } catch {
      setMessages([
        ...next,
        { role: 'assistant', content: 'Tive um problema para responder agora. Tenta de novo daqui a pouco?' },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-2xl flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <Card>
              <CardContent className="py-4 text-sm text-muted-foreground">
                Oi! Sou seu copiloto financeiro. Pergunta o que quiser sobre suas finanças. 💬
              </CardContent>
            </Card>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border p-3 text-left text-sm hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> pensando…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t pt-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ao copiloto…"
        />
        <Button type="submit" size="icon" disabled={busy}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
