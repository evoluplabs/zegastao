// Painel de vinculação do WhatsApp no perfil do usuário.
// Gera um PIN de 6 dígitos → usuário envia "vincular XXXXXX" para o Zé no WhatsApp.
import { useState } from 'react';
import { MessageCircle, Check, Copy, RefreshCw } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '5511999999999';
const APP_URL = 'https://zegastao.com.br';

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function WhatsAppLink() {
  const profile = useStore((s) => s.profile);
  const [pin, setPin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const isLinked = !!profile?.whatsappPhone && !!profile?.whatsappVerified;

  async function handleGeneratePin() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true);
    try {
      const newPin = generatePin();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await setDoc(doc(db, 'whatsapp_pins', newPin), {
        uid,
        createdAt: new Date().toISOString(),
        expiresAt,
      });
      setPin(newPin);
    } catch (e) {
      console.error('Erro ao gerar PIN:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!pin) return;
    navigator.clipboard.writeText(`vincular ${pin}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`vincular ${pin ?? ''}`)}`;

  if (isLinked) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-green-500/15 flex items-center justify-center">
            <Check className="h-4 w-4 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-green-300">WhatsApp vinculado!</p>
            <p className="text-xs text-muted-foreground">
              +{profile?.whatsappPhone?.slice(0, 4)}••••••••• · Pronto para registrar gastos
            </p>
          </div>
          <MessageCircle className="h-4 w-4 text-green-500 shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold">💬 Registre gastos no WhatsApp</p>
          <p className="text-xs text-muted-foreground">
            Vincule seu número e mande mensagens como "gastei R$50 no mercado"
          </p>
        </div>
      </div>

      {!pin ? (
        <button
          onClick={handleGeneratePin}
          disabled={loading}
          className={cn(
            'w-full rounded-xl border border-primary/30 bg-primary/10 py-2.5 text-sm font-bold text-primary transition-colors',
            loading ? 'opacity-50' : 'hover:bg-primary/20',
          )}
        >
          {loading ? 'Gerando código...' : 'Gerar código de vinculação'}
        </button>
      ) : (
        <div className="space-y-2.5">
          {/* PIN */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1.5">
              Seu código (válido por 10 min)
            </p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-2xl font-black tracking-[0.3em] text-stone-100 flex-1">
                {pin}
              </p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Instruções */}
          <ol className="space-y-1.5">
            {[
              'Abra o WhatsApp e salve o número do Zé Gastão',
              <>Envie a mensagem: <code className="rounded bg-secondary px-1 py-0.5 text-[11px] font-mono">vincular {pin}</code></>,
              'Pronto! Você pode registrar gastos direto no WhatsApp.',
            ].map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 h-4 w-4 rounded-full bg-primary/20 text-primary font-bold text-[9px] flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {/* Botão WhatsApp */}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-green-500/30 bg-green-500/10 py-2.5 text-sm font-bold text-green-400 hover:bg-green-500/20 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Abrir WhatsApp e enviar código
          </a>

          {/* Regenerar */}
          <button
            onClick={handleGeneratePin}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mx-auto"
          >
            <RefreshCw className="h-3 w-3" /> Gerar novo código
          </button>
        </div>
      )}

      {/* Comandos rápidos */}
      {pin && (
        <div className="border-t border-[hsl(var(--border))] pt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Comandos após vincular
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { cmd: '"gastei R$X em Y"', label: '⚔️ Gasto' },
              { cmd: '"recebi R$X de Y"', label: '💰 Receita' },
              { cmd: '"paguei parcela de Y"', label: '💥 Boss' },
              { cmd: '"saldo" / "resumo"', label: '📊 Status' },
            ].map((c) => (
              <div key={c.cmd} className="rounded-lg bg-secondary/50 px-2.5 py-2">
                <p className="text-[9px] font-bold text-primary">{c.label}</p>
                <p className="text-[9px] text-muted-foreground font-mono">{c.cmd}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
