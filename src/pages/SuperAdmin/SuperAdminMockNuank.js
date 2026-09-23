// 2. Mock dos Planos Oficiais do SaaS
const initialPlans = [
  {
    id: "starter",
    name: "Plano Solo",
    price: 69.9,
    maxBarbers: 1,
    extraBarberPrice: 0,
    tag: "Individual",
    active: true,
    nubankPaymentLink: "https://nubank.com.br/cobrar/barbersaas/plano-solo-69",
    features: [
      "1 Cadeira / Barbeiro",
      "Agenda Online",
      "Controle de Fila (PDV)",
      "Suporte por E-mail",
    ],
  },
  {
    id: "pro",
    name: "Plano Pro",
    price: 149.9,
    maxBarbers: 6,
    extraBarberPrice: 19.9,
    tag: "Mais Popular",
    active: true,
    nubankPaymentLink: "https://nubank.com.br/cobrar/barbersaas/plano-pro-149",
    features: [
      "Até 6 Barbeiros Inclusos",
      "Comissões Automáticas",
      "+ R$ 19,90 por barbeiro extra",
      "WhatsApp Automático",
    ],
  },
  {
    id: "enterprise",
    name: "Redes & Franquias",
    price: 279.9,
    maxBarbers: 999,
    extraBarberPrice: 0,
    tag: "Escala & Redes",
    active: true,
    nubankPaymentLink:
      "https://nubank.com.br/cobrar/barbersaas/redes-franquias-279",
    features: [
      "Barbeiros Ilimitados",
      "Múltiplas Filiais",
      "Pacote White-Label Incluso",
      "Suporte VIP WhatsApp",
    ],
  },
];
