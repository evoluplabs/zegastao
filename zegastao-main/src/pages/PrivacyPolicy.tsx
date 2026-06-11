import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-4 py-4">
        <Link to="/"><Logo size="sm" /></Link>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold mb-1">Política de Privacidade</h1>
        <p className="text-xs text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">1. Quem somos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Zé Gastão é uma plataforma de organização financeira pessoal. Estamos comprometidos com a proteção dos seus dados em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">2. Dados que coletamos</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
            <li><strong>Cadastro:</strong> nome, e-mail, senha (criptografada pelo Firebase)</li>
            <li><strong>Perfil financeiro:</strong> renda mensal, dívidas, metas e investimentos que você insere</li>
            <li><strong>Extratos bancários:</strong> arquivos CSV/PDF enviados para categorização automática</li>
            <li><strong>Uso da plataforma:</strong> páginas visitadas, funcionalidades usadas (via Mixpanel, com seu consentimento)</li>
            <li><strong>Dispositivo:</strong> tipo de navegador, sistema operacional (para melhorar a experiência)</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">3. Como usamos seus dados</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
            <li>Fornecer e melhorar o serviço</li>
            <li>Gerar insights financeiros personalizados via IA</li>
            <li>Enviar notificações e lembretes (somente se você ativar)</li>
            <li>Processar pagamentos (via Hotmart/MercadoPago — não armazenamos dados de cartão)</li>
            <li>Cumprir obrigações legais</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">4. Compartilhamento de dados</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Não vendemos seus dados. Compartilhamos apenas com prestadores de serviço necessários ao funcionamento da plataforma: Firebase (Google), Anthropic (IA — sem dados identificáveis), Hotmart/MercadoPago (pagamentos) e Mixpanel (analytics com seu consentimento).
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">5. Seus direitos (LGPD Art. 18)</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incompletos ou desatualizados</li>
            <li>Excluir seus dados e conta</li>
            <li>Portabilidade dos dados</li>
            <li>Revogar consentimento a qualquer momento</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            Para exercer esses direitos, envie um e-mail para <a href="mailto:privacidade@zegastao.com.br" className="text-primary">privacidade@zegastao.com.br</a> com o assunto "Direitos LGPD".
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">6. Segurança</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Utilizamos criptografia em trânsito (HTTPS/TLS), autenticação via Firebase Auth e regras de segurança no Firestore que garantem isolamento total dos dados por usuário.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">7. Retenção de dados</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir sua conta, todos os dados são removidos em até 30 dias, exceto aqueles que devemos manter por obrigação legal.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">8. Cookies e rastreamento</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Utilizamos cookies essenciais para funcionamento do serviço e cookies analíticos (Mixpanel) somente com seu consentimento explícito.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">9. Contato do Encarregado (DPO)</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <a href="mailto:privacidade@zegastao.com.br" className="text-primary">privacidade@zegastao.com.br</a>
          </p>
        </section>

        <div className="pt-6 border-t">
          <Link to="/" className="text-sm text-primary hover:underline">← Voltar ao início</Link>
          {' · '}
          <Link to="/termos" className="text-sm text-primary hover:underline">Termos de Uso</Link>
        </div>
      </div>
    </div>
  );
}
