import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ = [
  {
    q: 'É seguro? Vocês conectam no meu banco?',
    a: 'Não. O Zé Gastão não tem acesso ao seu banco. Você importa o extrato (PDF ou CSV) manualmente — seus dados bancários nunca saem do seu dispositivo. Os dados financeiros ficam no Firebase (Google Cloud), criptografados.',
  },
  {
    q: 'Funciona para qualquer banco?',
    a: 'Sim — compatível com Nubank, Itaú, Bradesco, Santander, Banco do Brasil, Caixa, Inter, C6 Bank e Sicoob. Para outros bancos, qualquer extrato em CSV padrão também funciona.',
  },
  {
    q: 'O chat de IA é realmente inteligente?',
    a: 'Sim. Usamos Claude Sonnet (Anthropic), um dos melhores modelos de linguagem do mundo. Ele conhece suas dívidas, seu histórico e sua fase — não é um chatbot genérico que dá conselhos de copiar e colar.',
  },
  {
    q: 'Posso usar no celular?',
    a: 'Sim, o app é 100% responsivo. Funciona direto no navegador do celular — não precisa baixar nada. A experiência mobile é prioritária.',
  },
  {
    q: 'E se eu não souber usar?',
    a: 'O onboarding guiado leva menos de 3 minutos. Você informa sua renda, suas dívidas e o app já monta o primeiro plano. Se tiver dúvida, o próprio copiloto ajuda.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, sem multa e sem enrolação. O plano gratuito nunca expira — as features básicas são permanentemente grátis.',
  },
  {
    q: 'O Zé Gastão ajuda com o Imposto de Renda?',
    a: 'Sim! O app analisa suas transações do ano e identifica despesas dedutíveis (saúde, educação), rendimentos e obrigações (IRPF, Carnê-Leão). Gera um relatório PDF para facilitar sua declaração — e o Copiloto responde dúvidas com seus dados reais.',
  },
  {
    q: 'Posso usar junto com meu cônjuge ou parceiro(a)?',
    a: 'Sim. O modo casal/família permite que duas contas compartilhem a visão financeira. Cada um mantém seus dados separados, mas podem ver o panorama unificado juntos. Ideal para casais que planejam as finanças juntos.',
  },
  {
    q: 'Funciona para MEI e autônomos?',
    a: 'Sim. Para MEI, o app sinaliza o prazo da DASN-SIMEI (declaração anual) e monitora o faturamento. Para autônomos, detecta rendimentos que podem exigir Carnê-Leão. Não substitui um contador, mas organiza tudo para que a conversa com ele seja muito mais simples.',
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="border-b py-16 md:py-24">
      <div className="mx-auto max-w-2xl px-4">
        <div className="text-center mb-10 reveal">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Dúvidas frequentes</p>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Perguntas que você vai ter.
          </h2>
        </div>

        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="reveal border rounded-xl overflow-hidden" data-delay={`${i * 50}`}>
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-sm hover:bg-secondary/50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                {item.q}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: open === i ? '300px' : '0px' }}
              >
                <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
