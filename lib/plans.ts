/**
 * Planos de assinatura da plataforma.
 *
 * ATENÇÃO: o conteúdo abaixo é um RASCUNHO inicial (preços, nomes e
 * benefícios serão elaborados pelo dono do produto). A estrutura tipada
 * já está pronta para, futuramente, ser alimentada pelo Supabase
 * (ex.: tabela `plans` ou produtos do Stripe) sem mudar a interface.
 *
 * TODO (integração Supabase/Stripe): trocar `price: string` por
 * `priceCents: number` + formatação no cliente, e adicionar estados de
 * loading/erro/vazio quando os planos vierem de uma API.
 */

export type PlanId = "basico" | "medio" | "avancado";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: string;
  period: string;
  /** Classe de cor semântica definida no design system (--plan-*) */
  accent: string;
  highlight?: boolean;
  cta: string;
  /** true enquanto a assinatura digital ainda não estiver ativa */
  disabled?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "basico",
    name: "Básico",
    tagline: "Para quem está começando e quer publicar a primeira página.",
    price: "R$ 29",
    period: "/mês",
    accent: "var(--plan-basico)",
    cta: "Em breve",
    disabled: true,
    features: [
      "1 página publicada",
      "Template padrão (Vakinha)",
      "Importação de página por URL",
      "Checkout universal",
      "Suporte por e-mail",
    ],
  },
  {
    id: "medio",
    name: "Médio",
    tagline: "Para quem já opera e quer mais páginas e controle visual.",
    price: "R$ 59",
    period: "/mês",
    accent: "var(--plan-medio)",
    highlight: true,
    cta: "Em breve",
    disabled: true,
    features: [
      "Até 5 páginas publicadas",
      "Tudo do plano Básico",
      "Editor visual avançado",
      "Páginas de pagamento dedicadas",
      "Relatórios de visitas",
      "Suporte prioritário",
    ],
  },
  {
    id: "avancado",
    name: "Avançado",
    tagline: "Para quem escala e quer marca própria e páginas ilimitadas.",
    price: "R$ 119",
    period: "/mês",
    accent: "var(--plan-avancado)",
    cta: "Em breve",
    disabled: true,
    features: [
      "Páginas ilimitadas",
      "Tudo do plano Médio",
      "Domínio próprio",
      "Sem marca OfferSnap",
      "Relatórios avançados",
      "Suporte dedicado",
    ],
  },
];

/**
 * Fonte de dados dos planos.
 * Futuro: buscar do Supabase (ex.: `supabase.from("plans").select("*")`)
 * mantendo o mesmo contrato de tipos.
 */
export function getPlans(): Plan[] {
  return PLANS;
}