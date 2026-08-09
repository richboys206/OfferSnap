import type { Metadata } from "next";
import LegalPage from "../legal/LegalPage";

export const metadata: Metadata = {
  title: "Termos de Uso | OfferSnap",
  description: "Termos de uso do serviço OfferSnap.",
};

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      updatedAt="09/08/2026"
      sections={[
        {
          heading: "1. Aceitação dos termos",
          paragraphs: [
            "Ao acessar ou utilizar o OfferSnap, você concorda em cumprir estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize o serviço.",
          ],
        },
        {
          heading: "2. Descrição do serviço",
          paragraphs: [
            "O OfferSnap é uma plataforma de criação e gerenciamento de páginas de arrecadação. O serviço permite que você crie, edite e publique páginas com conteúdo próprio, além de gerenciar o checkout de doações.",
          ],
        },
        {
          heading: "3. Uso permitido",
          paragraphs: [
            "Você se compromete a utilizar o serviço apenas para fins legítimos e em conformidade com a legislação aplicável. É proibido utilizar o serviço para atividades fraudulentas, enganosas, ilegais ou que violem direitos de terceiros.",
          ],
        },
        {
          heading: "4. Responsabilidades do usuário",
          paragraphs: [
            "Você é o único responsável pelo conteúdo publicado em suas páginas, incluindo textos, imagens e informações. Você garante que possui os direitos necessários sobre esse conteúdo e que ele não viola direitos de terceiros.",
          ],
        },
        {
          heading: "5. Propriedade intelectual",
          paragraphs: [
            "O serviço, a marca OfferSnap, logotipos e demais materiais da plataforma são de propriedade da OfferSnap. O conteúdo criado por você em suas páginas permanece de sua propriedade.",
          ],
        },
        {
          heading: "6. Limitação de responsabilidade",
          paragraphs: [
            "O serviço é fornecido no estado em que se encontra. A OfferSnap não se responsabiliza por danos diretos ou indiretos decorrentes do uso ou da impossibilidade de uso do serviço, incluindo interrupções, erros ou perda de dados.",
          ],
        },
        {
          heading: "7. Alterações dos termos",
          paragraphs: [
            "Podemos atualizar estes Termos de Uso periodicamente. Alterações significativas serão comunicadas por meio do próprio painel. O uso continuado do serviço após a publicação das alterações constitui aceitação dos novos termos.",
          ],
        },
        {
          heading: "8. Contato",
          paragraphs: [
            "Em caso de dúvidas sobre estes Termos de Uso, entre em contato pelo e-mail contato@offersnap.com.br.",
          ],
        },
      ]}
    />
  );
}