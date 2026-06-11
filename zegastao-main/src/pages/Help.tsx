import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Mail, MessageCircle } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    title: 'Primeiros passos',
    icon: '🚀',
    faqs: [
      {
        q: 'Como começo a usar o Zé Gastão?',
        a: 'Crie sua conta grátis, complete o onboarding de 5 passos (leva menos de 3 minutos) e você já terá um plano financeiro personalizado. Depois, importe seu extrato bancário ou lance suas despesas manualmente.',
      },
      {
        q: 'Precisa pagar para usar?',
        a: 'Não. O plano gratuito permite 2 importações de extrato por mês e até 10 mensagens no copiloto por dia. O plano Copiloto (R$ 19,90/mês) libera tudo ilimitado.',
      },
      {
        q: 'O Zé Gastão é seguro?',
        a: 'Sim. Seus dados ficam no Firebase (Google), com criptografia em trânsito e regras de acesso que garantem que nenhum outro usuário veja suas informações. Nunca armazenamos sua senha — o Firebase cuida disso.',
      },
    ],
  },
  {
    title: 'Importação de extrato',
    icon: '📤',
    faqs: [
      {
        q: 'Quais bancos são suportados?',
        a: 'Nubank, Itaú, Bradesco, Banco do Brasil, Caixa Econômica, Santander, Inter, C6 Bank e Sicoob. Para outros bancos, use o formato CSV genérico.',
      },
      {
        q: 'Como exporto o extrato do meu banco?',
        a: 'Na tela de importação, selecione seu banco e siga o guia passo a passo com screenshots — é diferente para cada banco. A maioria aceita CSV ou PDF.',
      },
      {
        q: 'Meu extrato deu erro. O que fazer?',
        a: 'Erros comuns: (1) PDF protegido por senha — remova a senha antes de enviar; (2) formato não suportado — tente exportar como CSV; (3) arquivo corrompido — baixe novamente do banco. Se persistir, fale com o suporte.',
      },
      {
        q: 'As transações foram categorizadas errado?',
        a: 'Clique na categoria de qualquer transação para corrigir. O copiloto aprende com suas correções ao longo do tempo.',
      },
    ],
  },
  {
    title: 'Dívidas e metas',
    icon: '💳',
    faqs: [
      {
        q: 'Como cadastrar uma dívida?',
        a: 'Vá em Finanças → aba Dívidas → botão "Nova dívida". Informe o credor, saldo total, parcela mensal e taxa de juros. Quanto mais preciso, melhor o plano de quitação.',
      },
      {
        q: 'Qual é a estratégia de quitação usada?',
        a: 'O Zé Gastão usa a estratégia avalanche — pagar primeiro a dívida com maior taxa de juros. Isso economiza mais dinheiro no longo prazo.',
      },
      {
        q: 'Como criar uma meta de economia?',
        a: 'Vá em Finanças → aba Metas → "Nova meta". Defina o objetivo (ex: reserva de emergência), valor e prazo. O copiloto calcula quanto guardar por mês.',
      },
    ],
  },
  {
    title: 'Planos e pagamento',
    icon: '💳',
    faqs: [
      {
        q: 'Como cancelo minha assinatura?',
        a: 'Cancele direto na plataforma Hotmart ou MercadoPago onde você assinou. O cancelamento tem efeito no fim do período vigente — você continua com acesso até lá.',
      },
      {
        q: 'Tem reembolso?',
        a: 'Sim. Se você assinou há menos de 7 dias e não ficou satisfeito, entre em contato via suporte@zegastao.com.br e processamos o estorno em até 5 dias úteis.',
      },
      {
        q: 'O plano anual tem desconto?',
        a: 'Sim — R$ 14,90/mês no plano anual (R$ 178,80/ano), contra R$ 19,90/mês no mensal. Equivale a 2 meses grátis.',
      },
    ],
  },
  {
    title: 'Privacidade e segurança',
    icon: '🔒',
    faqs: [
      {
        q: 'O Zé Gastão tem acesso à minha conta bancária?',
        a: 'Não. Você exporta manualmente o extrato do seu banco e importa no Zé Gastão. Não temos integração direta com bancos e não acessamos sua conta.',
      },
      {
        q: 'Posso excluir minha conta e todos os dados?',
        a: 'Sim. Envie um e-mail para privacidade@zegastao.com.br com o assunto "Excluir conta". Removemos todos os seus dados em até 30 dias conforme a LGPD.',
      },
      {
        q: 'Esqueci minha senha. O que fazer?',
        a: 'Na tela de login, clique em "Esqueci minha senha" e insira seu e-mail. Você receberá um link de redefinição em até 5 minutos.',
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button
        className="flex items-center justify-between w-full py-3 text-left gap-3 hover:text-primary transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium">{q}</span>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-primary" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <p className="pb-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export function Help() {
  const { user } = useStore();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-4 py-4 flex items-center justify-between">
        <Link to={user ? '/dashboard' : '/'}><Logo size="sm" /></Link>
        {user && (
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Voltar ao app
          </Link>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Central de Ajuda</h1>
          <p className="text-muted-foreground">Encontre respostas rápidas ou fale com nosso suporte.</p>
        </div>

        {/* Contato rápido */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <a
            href="mailto:suporte@zegastao.com.br"
            className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">E-mail de suporte</p>
              <p className="text-xs text-muted-foreground">suporte@zegastao.com.br · Resp. em até 24h</p>
            </div>
          </a>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Chat no app</p>
              <p className="text-xs text-muted-foreground">Disponível para assinantes Copiloto</p>
            </div>
          </div>
        </div>

        {/* Seções de FAQ */}
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const isOpen = activeSection === section.title;
            return (
              <div key={section.title} className="rounded-xl border bg-card overflow-hidden">
                <button
                  className={cn(
                    'flex items-center justify-between w-full px-5 py-4 text-left transition-colors',
                    isOpen ? 'bg-primary/5' : 'hover:bg-secondary/50'
                  )}
                  onClick={() => setActiveSection(isOpen ? null : section.title)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{section.icon}</span>
                    <span className="font-semibold text-sm">{section.title}</span>
                  </div>
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 text-primary" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-2 border-t">
                    {section.faqs.map((faq) => (
                      <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border bg-primary/5 border-primary/20 p-6 text-center">
          <p className="font-semibold mb-1">Não encontrou o que precisava?</p>
          <p className="text-sm text-muted-foreground mb-4">Nossa equipe responde em até 24 horas em dias úteis.</p>
          <a
            href="mailto:suporte@zegastao.com.br"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Enviar mensagem
          </a>
        </div>
      </div>
    </div>
  );
}
