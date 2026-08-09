import type { Metadata } from "next";
import LegalPage from "../legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidade | OfferSnap",
  description: "Política de privacidade do serviço OfferSnap.",
};

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      updatedAt="09/08/2026"
      sections={[
        {
          heading: "1. Dados coletados",
          paragraphs: [
            "Coletamos as informações que você fornece ao utilizar o serviço, como nome de usuário, e-mail e o conteúdo das páginas que você cria. Também coletamos dados de uso, como páginas acessadas e ações realizadas no painel, para melhorar o serviço.",
          ],
        },
        {
          heading: "2. Uso dos dados",
          paragraphs: [
            "Utilizamos seus dados para operar e manter o serviço, fornecer suporte, garantir a segurança da plataforma e melhorar a experiência de uso. Não utilizamos seus dados para finalidades incompatíveis com estas finalidades.",
          ],
        },
        {
          heading: "3. Compartilhamento de dados",
          paragraphs: [
            "Não vendemos nem alugamos seus dados pessoais. Compartilhamos informações apenas quando necessário para a operação do serviço, com prestadores de serviços contratados, ou quando exigido por lei ou ordem judicial.",
          ],
        },
        {
          heading: "4. Segurança",
          paragraphs: [
            "Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição. Nenhum método de transmissão ou armazenamento é totalmente seguro, e não podemos garantir segurança absoluta.",
          ],
        },
        {
          heading: "5. Cookies e armazenamento local",
          paragraphs: [
            "Utilizamos cookies e armazenamento local do navegador para manter sua sessão no painel e lembrar preferências. Você pode configurar seu navegador para recusar cookies, o que pode afetar o funcionamento do serviço.",
          ],
        },
        {
          heading: "6. Direitos do usuário",
          paragraphs: [
            "Você pode solicitar acesso, correção ou exclusão dos seus dados pessoais a qualquer momento. Também pode solicitar informações sobre como seus dados são tratados. Atenderemos às solicitações dentro do prazo previsto em lei.",
          ],
        },
        {
          heading: "7. Alterações desta política",
          paragraphs: [
            "Podemos atualizar esta Política de Privacidade periodicamente. Alterações significativas serão comunicadas por meio do painel. Recomendamos revisar esta página regularmente.",
          ],
        },
        {
          heading: "8. Contato",
          paragraphs: [
            "Para dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados, entre em contato pelo e-mail contato@offersnap.com.br.",
          ],
        },
      ]}
    />
  );
}