/**
 * src/pages/SuperAdmin/SuperAdminMockNuank.js
 *
 * Configurações e Planos Oficiais do SaaS com Integração nativa à API Mercado Pago.
 */

export const INITIAL_PLANS = [
  {
    id: "trial",
    name: "Plano de Teste",
    price: 0,
    maxBarbers: 2,
    extraBarberPrice: 0,
    tag: "7 Dias Grátis",
    active: true,
    isTrial: true,
    mercadoPagoPlanId: "plan_mp_trial",
    mercadoPagoPixEnabled: false,
    mercadoPagoCheckoutUrl: "",
    features: [
      "Período de Teste de 7 Dias",
      "Até 2 Cadeiras / Barbeiros",
      "Agenda Online 24/7",
      "Cálculo de Comissões e Caixa",
      "Sem necessidade de cartão de crédito",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 69.9,
    maxBarbers: 1,
    extraBarberPrice: 0,
    tag: "Individual",
    active: true,
    isTrial: false,
    mercadoPagoPlanId: "plan_mp_starter_69",
    mercadoPagoPixEnabled: true,
    mercadoPagoCheckoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_starter",
    features: [
      "1 Cadeira / Barbeiro",
      "Agenda Online 24/7",
      "Controle de Fila (PDV)",
      "Pix Instantâneo Mercado Pago",
      "Suporte por E-mail",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 149.9,
    maxBarbers: 6,
    extraBarberPrice: 19.9,
    tag: "Mais Popular",
    active: true,
    isTrial: false,
    mercadoPagoPlanId: "plan_mp_pro_149",
    mercadoPagoPixEnabled: true,
    mercadoPagoCheckoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_pro",
    features: [
      "Até 6 Barbeiros Inclusos",
      "Comissões Automáticas",
      "+ R$ 19,90 por barbeiro extra",
      "Checkout Pro em até 12x",
      "WhatsApp & Notificações",
    ],
  },
  {
    id: "enterprise",
    name: "Entreprise",
    price: 279.9,
    maxBarbers: 999,
    extraBarberPrice: 0,
    tag: "Redes & Franquias",
    active: true,
    isTrial: false,
    mercadoPagoPlanId: "plan_mp_enterprise_279",
    mercadoPagoPixEnabled: true,
    mercadoPagoCheckoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_enterprise",
    features: [
      "Barbeiros Ilimitados",
      "Múltiplas Filiais / Unidades",
      "Pacote White-Label Incluso",
      "Pix & Cartão Mercado Pago",
      "Suporte VIP WhatsApp Prioritário",
    ],
  },
];

export default INITIAL_PLANS;
