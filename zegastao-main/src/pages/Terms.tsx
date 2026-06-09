import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

export function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-4 py-4">
        <Link to="/"><Logo size="sm" /></Link>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10 prose prose-sm">
        <h1 className="text-2xl font-bold mb-1">Termos de Uso</h1>
        <p className="text-xs text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">1. Aceitação dos Termos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ao criar uma conta ou usar o Zé Gastão, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">2. O que é o Zé Gastão</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Zé Gastão é uma plataforma de educação e organização financeira pessoal. Não somos uma instituição financeira, não prestamos consultoria financeira regulamentada pela CVM, e não gerenciamos dinheiro dos usuários. Todas as informações são de caráter educacional e organizacional.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">3. Cadastro e Conta</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Você é responsável por manter a confidencialidade de suas credenciais. Notifique-nos imediatamente em caso de acesso não autorizado pelo e-mail suporte@zegastao.com.br.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">4. Planos e Pagamentos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O plano gratuito possui limites de uso. O plano Copiloto é cobrado via Hotmart/MercadoPago conforme os valores exibidos na página de preços. Cancelamentos podem ser feitos a qualquer momento sem multa, com efeito no fim do período vigente.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">5. Uso Adequado</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            É proibido utilizar o serviço para fins ilegais, inserir dados falsos de terceiros, tentar burlar os sistemas de segurança ou revender o acesso. Violações resultam em suspensão imediata da conta.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">6. Propriedade Intelectual</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Todo o conteúdo da plataforma (textos, código, marca, design) é de propriedade do Zé Gastão. Os dados inseridos pelo usuário são de propriedade do próprio usuário.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">7. Limitação de Responsabilidade</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Zé Gastão não se responsabiliza por decisões financeiras tomadas com base nas sugestões da plataforma. As análises geradas por IA são orientativas e não substituem aconselhamento profissional.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">8. Alterações nos Termos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Podemos atualizar estes termos com aviso prévio de 15 dias via e-mail. O uso continuado após a data de vigência implica aceitação das mudanças.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">9. Contato</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dúvidas: <a href="mailto:suporte@zegastao.com.br" className="text-primary">suporte@zegastao.com.br</a>
          </p>
        </section>

        <div className="pt-6 border-t">
          <Link to="/" className="text-sm text-primary hover:underline">← Voltar ao início</Link>
          {' · '}
          <Link to="/privacidade" className="text-sm text-primary hover:underline">Política de Privacidade</Link>
        </div>
      </div>
    </div>
  );
}
