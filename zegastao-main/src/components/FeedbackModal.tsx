import { useState } from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';
import { addUserDoc } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'bug', label: '🐛 Bug', desc: 'Algo quebrado ou errado' },
  { id: 'suggestion', label: '💡 Sugestão', desc: 'Ideia de melhoria' },
  { id: 'question', label: '❓ Dúvida', desc: 'Não entendi algo' },
  { id: 'other', label: '💬 Outro', desc: 'Qualquer coisa' },
];

export function FeedbackModal({ onClose }: Props) {
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function send() {
    if (!category || !message.trim()) return;
    setSending(true);
    try {
      await addUserDoc('feedback', {
        category,
        message: message.trim(),
        url: window.location.pathname,
        userAgent: navigator.userAgent,
      });
      setDone(true);
      setTimeout(onClose, 2000);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
          <div>
            <h2 className="font-semibold text-base">Enviar feedback</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Sua opinião melhora o produto</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="font-medium text-sm">Feedback enviado! Obrigado 🙏</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tipo de feedback</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-all',
                        category === c.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/30'
                      )}
                    >
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Mensagem *</p>
                <textarea
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  rows={4}
                  placeholder="Descreva com detalhes..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={!category || !message.trim() || sending}
                  onClick={send}
                >
                  <Send className="h-4 w-4" />
                  {sending ? 'Enviando…' : 'Enviar'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
