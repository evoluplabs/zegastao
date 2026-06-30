import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ = [
  {
    q: '⚔️ É seguro? Vocês acessam meu banco?',
    a: 'Não. O Zé Gastão não tem acesso direto ao seu banco. Você importa o extrato (PDF ou CSV) manualmente — seus dados bancários nunca saem do seu dispositivo. Os dados ficam no Firebase (Google Cloud), criptografados.',
  },
  {
    q: '🏛️ Funciona para qualquer banco?',
    a: 'Sim — compatível com Nubank, Itaú, Bradesco, Santander, Banco do Brasil, Caixa, Inter, C6 Bank e Sicoob. Para outros bancos, qualquer extrato em CSV padrão também funciona.',
  },
  {
    q: '🧙 O Sábio Financeiro é realmente inteligente?',
    a: 'Sim. Usamos Claude Sonnet (Anthropic), um dos melhores modelos de linguagem do mundo. Ele conhece suas dívidas, seu histórico e sua fase — não é um chatbot genérico com conselhos genéricos.',
  },
  {
    q: '📱 Posso usar no celular?',
    a: 'Sim, o app é 100% responsivo. Funciona direto no navegador do celular — não precisa baixar nada. A experiência mobile é prioritária.',
  },
  {
    q: '🎮 E se eu não souber por onde começar?',
    a: 'O onboarding de "Criação de Personagem" leva menos de 3 minutos. Você informa sua renda, suas dívidas e o Zé monta o primeiro plano de ataque. Se tiver dúvida, o próprio Sábio ajuda.',
  },
  {
    q: '🚪 Posso cancelar quando quiser?',
    a: 'Sim, sem multa e sem enrolação. O plano Recruta (grátis) nunca expira — as features básicas são permanentemente grátis.',
  },
  {
    q: '📋 O Zé ajuda com o Imposto de Renda?',
    a: 'Sim! O app analisa suas transações e identifica despesas dedutíveis (saúde, educação), rendimentos e obrigações. Gera relatório PDF para facilitar sua declaração.',
  },
  {
    q: '👫 Posso usar com meu parceiro(a)?',
    a: 'Sim. O Modo Party/Casal permite que duas contas compartilhem a visão financeira. Cada um mantém seus dados separados, mas podem ver o panorama unificado — ideal para casais que planejam juntos.',
  },
  {
    q: '💼 Funciona para MEI e autônomos?',
    a: 'Sim. Para MEI, o app sinaliza o prazo da DASN-SIMEI e monitora o faturamento. Para autônomos, detecta rendimentos que podem exigir Carnê-Leão. Não substitui um contador, mas organiza tudo para a conversa com ele ser mais simples.',
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="border-b border-[#3a2e1d] py-16 md:py-24 bg-[#15110b]">
      <div className="mx-auto max-w-2xl px-4">
        <div className="text-center mb-10 reveal">
          <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3">— Taverna das Dúvidas —</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-stone-100">
            Perguntas que você vai ter.
          </h2>
        </div>

        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="reveal border border-[#3a2e1d] rounded-xl overflow-hidden bg-[#211a11]" data-delay={`${i * 50}`}>
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-sm text-stone-200 hover:bg-[#2b2115] transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                {item.q}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-stone-500 transition-transform duration-200 ${open === i ? 'rotate-180 text-green-400' : ''}`}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: open === i ? '300px' : '0px' }}
              >
                <p className="px-5 pb-4 text-sm text-stone-500 leading-relaxed">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
