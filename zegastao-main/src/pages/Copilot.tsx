import { useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Send, Zap, Bot, User, Lock } from 'lucide-react';
import { functions } from '@/firebase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const chat = httpsCallable<
  { message: string; history: ChatMessage[] },
  { response: string; impulse?: boolean; remainingMessages?: number; dailyLimit?: number }
>(functions, 'copilotChat');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  impulse?: boolean;
}

const SUGGESTIONS = [
  'Qual dívida devo pagar primeiro?',
  'Quando vou quitar minhas dívidas no ritmo atual?',
  'Tô pensando em comprar um tênis de R$400, posso?',
  'Me cria uma regra para guardar 30% de toda renda extra',
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-secondary px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}

export function Copilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number>(10);
  const [limitHit, setLimitHit] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || busy || limitHit) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await chat({ message: text, history: messages });
      const data = res.data;
      if (data.remainingMessages !== undefined) setRemaining(data.remainingMessages);
      if (data.dailyLimit !== undefined) setDailyLimit(data.dailyLimit);
      setMessages([
        ...next,
        { role: 'assistant', content: data.response, impulse: data.impulse },
      ]);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || '';
      if (msg.includes('resource-exhausted') || msg.includes('Limite')) {
        setLimitHit(true);
        setRemaining(0);
        setMessages([
          ...next,
          {
            role: 'assistant',
            content: `Você atingiu o limite de ${dailyLimit} mensagens hoje. Volte amanhã ou assine o plano Copiloto para 50 mensagens por dia. 🚀`,
          },
        ]);
      } else {
        setMessages([
          ...next,
          { role: 'assistant', content: 'Tive um problema para responder agora. Tenta de novo daqui a pouco?' },
        ]);
      }
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const usedMessages = remaining !== null ? dailyLimit - remaining : null;
  const limitPct = usedMessages !== null ? (usedMessages / dailyLimit) * 100 : 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-2xl flex-col gap-0">
      {/* Header com contador */}
      <div className="flex items-center justify-between border-b pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Copiloto Financeiro</p>
            <p className="text-xs text-muted-foreground">Powered by Claude Sonnet</p>
          </div>
        </div>
        {remaining !== null && (
          <div className="flex flex-col items-end gap-1">
            <span className={cn(
              'text-xs font-medium',
              remaining <= 2 ? 'text-destructive' : remaining <= 5 ? 'text-amber-500' : 'text-muted-foreground'
            )}>
              {remaining} mensagens restantes hoje
            </span>
            <div className="h-1 w-24 rounded-full bg-secondary overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  limitPct > 80 ? 'bg-destructive' : limitPct > 50 ? 'bg-amber-500' : 'bg-primary'
                )}
                style={{ width: `${limitPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mensagens */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm">
              <p className="font-medium text-foreground">Olá! Sou seu copiloto financeiro. 👋</p>
              <p className="mt-1 text-muted-foreground text-xs">Pergunte qualquer coisa sobre suas finanças. Sou direto, honesto e estou aqui pra te ajudar a sair das dívidas.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Sugestões</p>
              <div className="grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={limitHit}
                    className="group rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-all hover:border-primary/40 hover:bg-accent disabled:opacity-40"
                  >
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex items-end gap-2', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            {m.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            {m.role === 'user' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'rounded-br-sm bg-primary text-primary-foreground'
                  : cn(
                      'rounded-bl-sm bg-secondary text-secondary-foreground',
                      m.impulse && 'border border-amber-500/30 bg-amber-500/5'
                    )
              )}
            >
              {m.impulse && (
                <div className="mb-1 flex items-center gap-1 text-amber-500">
                  <Zap className="h-3 w-3" />
                  <span className="text-xs font-semibold">Modo Impulso</span>
                </div>
              )}
              {m.content}
            </div>
          </div>
        ))}

        {busy && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-3">
        {limitHit ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <Lock className="h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Limite diário atingido.{' '}
              <a href="/pricing" className="underline font-medium">Assine o Copiloto</a>
              {' '}para 50 mensagens/dia.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte ao copiloto…"
              disabled={busy}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy || !input.trim()}
              className="h-8 w-8 shrink-0 rounded-lg"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
