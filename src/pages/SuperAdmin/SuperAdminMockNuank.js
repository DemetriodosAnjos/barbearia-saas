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
    maxBarbers: 1,
    extraBarberPrice: 0,
    tag: "7 Dias Grátis",
    active: true,
    isTrial: true,
    mercadoPagoPlanId: "plan_mp_trial",
    mercadoPagoPixEnabled: false,
    mercadoPagoCheckoutUrl: "",
    features: [
      "Período de Teste de 7 Dias",
      "Permite 1 profissional cadastrado",
      "Agenda Online 24/7",
      "Cálculo de Comissões e Caixa",
      "Sem necessidade de cartão de crédito",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 69.9,
    maxBarbers: 2,
    extraBarberPrice: 0,
    tag: "Mais Popular",
    active: true,
    isTrial: false,
    mercadoPagoPlanId: "plan_mp_starter_69",
    mercadoPagoPixEnabled: true,
    mercadoPagoCheckoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_starter",
    features: [
      "Permite até 2 profissionais",
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
    maxBarbers: 5,
    extraBarberPrice: 19.9,
    tag: "Profissional",
    active: true,
    isTrial: false,
    mercadoPagoPlanId: "plan_mp_pro_149",
    mercadoPagoPixEnabled: true,
    mercadoPagoCheckoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_pro",
    features: [
      "Permite até 5 profissionais",
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
    maxBarbers: 15,
    extraBarberPrice: 0,
    tag: "Redes & Franquias",
    active: true,
    isTrial: false,
    mercadoPagoPlanId: "plan_mp_enterprise_279",
    mercadoPagoPixEnabled: true,
    mercadoPagoCheckoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_enterprise",
    features: [
      "Permite até 15 profissionais",
      "Múltiplas Filiais / Unidades",
      "Pacote White-Label Incluso",
      "Pix & Cartão Mercado Pago",
      "Suporte VIP WhatsApp Prioritário",
    ],
  },
];

export default INITIAL_PLANS;
