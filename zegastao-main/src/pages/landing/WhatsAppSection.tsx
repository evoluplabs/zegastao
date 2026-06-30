// Seção da landing page: Zé Gastão no WhatsApp — registro de gastos por conversa.
import { MessageCircle, Mic, FileText, Camera, Shield } from 'lucide-react';

const MESSAGES = [
  {
    side: 'user',
    text: 'gastei 68 na farmácia',
    time: '14:22',
  },
  {
    side: 'ze',
    text: '💊 *Gasto registrado!*\n🏥 Saúde · R$ 68,00\n☠️ Boss Nubank: HP 71% ▓▓▓▓▓░░░\n\n+10 XP · Lv 4 ████░░░░\n🔥 Streak: 8 dias!',
    time: '14:22',
  },
  {
    side: 'user',
    text: 'paguei parcela do nubank',
    time: '14:35',
  },
  {
    side: 'ze',
    text: '💥 *Golpe no Boss!*\n⚔️ Fatura Nubank · R$ 450,00\n☠️ HP: 54% ▓▓▓▓░░░░\n💸 R$ 1.890 restante\n\n+50 XP · Quitador Lv 3',
    time: '14:35',
  },
  {
    side: 'user',
    text: 'resumo',
    time: '18:01',
  },
  {
    side: 'ze',
    text: '📜 *Relatório de Batalha*\n\n🗡️ Nível 4 · 850 XP\n❤️ HP Financeiro: 68% ▓▓▓▓▓░░░\n💰 Mês: -R$ 1.240\n☠️ Boss: Nubank · HP 54%\n🔥 Streak: 8 dias\n\n_Ver painel completo: zegastao.com.br_',
    time: '18:01',
  },
];

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'Registre por texto',
    desc: '"gastei R$50 no mercado" → transação categorizada, XP ganho e boss atualizado.',
  },
  {
    icon: Mic,
    title: 'Mande áudio',
    desc: 'Fale rápido no WhatsApp. O Zé transcreve e registra sem você digitar nada.',
    badge: 'Em breve',
  },
  {
    icon: Camera,
    title: 'Foto de nota fiscal',
    desc: 'Fotografe o cupom. A IA extrai o valor, categoriza e registra na sua jornada.',
  },
  {
    icon: FileText,
    title: 'Guarda documentos',
    desc: 'Contrato, boleto, comprovante — manda no WhatsApp e fica salvo na Guilda com busca inteligente.',
  },
];

function ChatBubble({ msg }: { msg: typeof MESSAGES[0] }) {
  const isUser = msg.side === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xs font-bold text-green-400 shrink-0 mr-2 mt-0.5">
          Zé
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
          isUser
            ? 'bg-[#005c4b] text-stone-100 rounded-tr-sm'
            : 'bg-[#202c33] text-stone-200 rounded-tl-sm border border-[#2a3942]'
        }`}
      >
        {msg.text.split('\n').map((line, i) => (
          <span key={i}>
            {line.split(/\*([^*]+)\*/g).map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
            {i < msg.text.split('\n').length - 1 && <br />}
          </span>
        ))}
        <p className={`text-[9px] mt-1 ${isUser ? 'text-green-200/60 text-right' : 'text-stone-500'}`}>
          {msg.time} {isUser && '✓✓'}
        </p>
      </div>
    </div>
  );
}

export function WhatsAppSection() {
  return (
    <section className="border-b border-[#3a2e1d] py-16 md:py-24 bg-[#1a130b]">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="text-center mb-12 reveal">
          <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-xs font-bold text-green-400 mb-4">
            <MessageCircle className="h-3.5 w-3.5" />
            NOVO · Zé Gastão no WhatsApp
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-stone-100 mb-3">
            Registre gastos sem abrir o app
          </h2>
          <p className="text-stone-400 max-w-xl mx-auto">
            Manda uma mensagem no WhatsApp. O Zé registra, classifica, atualiza o boss e ainda te dá XP. Tudo em 3 segundos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* Mockup WhatsApp */}
          <div className="reveal">
            {/* Phone frame */}
            <div className="mx-auto max-w-xs">
              <div className="rounded-3xl border-4 border-[#3a2e1d] bg-[#111b21] overflow-hidden shadow-2xl shadow-black/60">
                {/* Status bar */}
                <div className="bg-[#202c33] px-4 py-2.5 flex items-center gap-2.5 border-b border-[#2a3942]">
                  <div className="h-8 w-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xs font-bold text-green-400">
                    Zé
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-stone-100">Zé Gastão</p>
                    <p className="text-[9px] text-green-400">online</p>
                  </div>
                  <MessageCircle className="h-4 w-4 text-stone-500" />
                </div>

                {/* Chat */}
                <div className="bg-[#0b141a] px-3 py-3 space-y-0.5 min-h-[320px]">
                  <div className="text-center mb-3">
                    <span className="text-[9px] bg-[#182229] text-stone-500 rounded-full px-2 py-0.5">
                      hoje
                    </span>
                  </div>
                  {MESSAGES.map((m, i) => (
                    <ChatBubble key={i} msg={m} />
                  ))}
                </div>

                {/* Input bar */}
                <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2 border-t border-[#2a3942]">
                  <div className="flex-1 rounded-full bg-[#2a3942] px-3 py-1.5">
                    <p className="text-[10px] text-stone-500">Mensagem</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <Mic className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features + privacidade */}
          <div className="space-y-4 reveal" data-delay="60">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="flex gap-3.5 rounded-2xl border border-[#3a2e1d] bg-[#211a11] p-4 hover:border-green-500/30 transition-colors"
                >
                  <div className="h-9 w-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-sm text-stone-100">{f.title}</p>
                      {f.badge && (
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                          {f.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}

            {/* Privacidade */}
            <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <Shield className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-300 mb-0.5">Privacidade total</p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Nenhuma mensagem do WhatsApp é armazenada. Só os dados financeiros que você registrar entram no app — criptografados, LGPD compliant.
                </p>
              </div>
            </div>

            {/* CTA vinculação */}
            <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4 text-center">
              <p className="text-xs text-stone-400 mb-2">
                Vincule seu número no app e comece a usar hoje mesmo.
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-4 py-2 text-xs font-bold text-stone-950">
                <MessageCircle className="h-3.5 w-3.5" />
                Vincular WhatsApp grátis
              </div>
            </div>
          </div>
        </div>

        {/* Comparativo */}
        <div className="mt-12 reveal" data-delay="120">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-stone-500 mb-6">
            — Por que o Zé é diferente —
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Registro', ze: 'Mensagem + XP + Boss', concorrente: 'Só registra' },
              { label: 'Motivação', ze: 'RPG: boss, streak, nível', concorrente: 'Gráficos genéricos' },
              { label: 'Documentos', ze: 'Busca por significado', concorrente: 'Pasta com arquivo' },
              { label: 'Custo', ze: 'Grátis para começar', concorrente: 'R$ 29,90/mês logo' },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-[#3a2e1d] bg-[#211a11] p-3 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{c.label}</p>
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2">
                  <p className="text-[10px] font-bold text-green-400">⚔️ Zé Gastão</p>
                  <p className="text-[9px] text-stone-400 mt-0.5">{c.ze}</p>
                </div>
                <div className="rounded-lg bg-[#1a130b] border border-[#2a2018] p-2">
                  <p className="text-[10px] text-stone-600">Outros apps</p>
                  <p className="text-[9px] text-stone-600 mt-0.5">{c.concorrente}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
