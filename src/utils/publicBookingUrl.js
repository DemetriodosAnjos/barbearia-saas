/**
 * Utilitário completo para geração de URLs públicas e integração com WhatsApp da Barbearia SaaS.
 * 
 * Permite associar o link público ao slug/tenant oficial da barbearia, facilitando o envio
 * para clientes agendarem via celular com confirmação automática no WhatsApp.
 */

/**
 * Transforma qualquer texto em slug amigável para URL (letras minúsculas, sem acentos ou caracteres especiais).
 */
export function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .trim()
    .replace(/[^a-z0-9 -]/g, "") // remove caracteres não alfanuméricos
    .replace(/\s+/g, "-") // substitui espaços por traços
    .replace(/-+/g, "-"); // remove traços duplicados
}

/**
 * Retorna a URL base do aplicativo no ambiente atual, respeitando domínios locais,
 * domínios de preview do AI Studio e caminhos de deploy estático.
 */
export function getAppBaseUrl() {
  if (typeof window === "undefined") return "";

  const { origin, pathname } = window.location;

  // 1. Detecção explícita de subpasta no GitHub Pages (ex: demetriodosanjos.github.io/barbearia-saas/)
  if (pathname.includes("/barbearia-saas")) {
    return `${origin}/barbearia-saas`;
  }

  // 2. Detecção via BASE_URL do Vite
  const viteBase = (import.meta.env?.BASE_URL || "/").replace(/\/$/, "");
  if (viteBase && viteBase !== "") {
    return `${origin}${viteBase}`;
  }

  // 3. Caso o app esteja rodando com sub-rotas no pathname
  const cleanPath = pathname
    .replace(/\/(admin|dashboard|login|onboarding|superadmin|client-app|design-system).*$/, "")
    .replace(/\/$/, "");
  if (cleanPath && cleanPath !== "/") {
    return `${origin}${cleanPath}`;
  }

  return origin;
}

/**
 * Constrói o link oficial público de agendamento associado ao slug ou tenant da barbearia.
 * 
 * @param {Object} options
 * @param {string} [options.slug] - Slug amigável da barbearia (ex: "alfa-barber")
 * @param {string} [options.tenantId] - ID alternativo caso a barbearia não tenha slug
 * @param {string} [options.barber] - Nome ou ID do barbeiro preferido
 * @param {string} [options.clientName] - Nome do cliente para pré-preenchimento
 * @param {string} [options.clientPhone] - Telefone/WhatsApp do cliente para pré-preenchimento
 * @returns {string} URL pública formatada pronta para compartilhamento
 */
export function buildClientBookingUrl({
  slug = "",
  tenantId = "",
  barber = "",
  clientName = "",
  clientPhone = "",
} = {}) {
  const baseUrl = getAppBaseUrl();
  const params = new URLSearchParams();

  // Define a rota do cliente
  params.set("screen", "client-app");

  // Vincula prioritariamente pelo slug amigável da barbearia
  if (slug) {
    params.set("barbearia", slugify(slug));
  } else if (tenantId) {
    params.set("barbearia", tenantId);
  }

  if (barber && barber !== "geral" && barber !== "Barbeiro Geral" && barber !== "any") {
    params.set("barbeiro", barber);
  }

  if (clientName) {
    params.set("cliente", clientName);
  }

  if (clientPhone) {
    params.set("telefone", clientPhone);
  }

  return `${baseUrl}/?${params.toString()}`;
}

/**
 * Sanitiza números de telefone garantindo padrão brasileiro com DDI (55) para links de WhatsApp.
 */
export function sanitizePhoneForWhatsApp(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

/**
 * Constrói deep link universal para iniciar conversa no WhatsApp com mensagem predefinida.
 */
export function buildWhatsAppUrl(phone, text) {
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(text);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Gera mensagem pré-formatada de confirmação de agendamento para o cliente enviar à barbearia.
 */
export function buildWhatsAppBookingMessage({
  barbershopName = "Barbearia",
  clientName = "",
  serviceName = "",
  barberName = "",
  dateStr = "",
  timeStr = "",
  price = 0,
  paymentMethod = "no_local",
  protocol = "",
} = {}) {
  const formattedPrice = Number(price || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const paymentLabel =
    paymentMethod === "pix"
      ? "Pix Antecipado Online"
      : "Pagamento no Local (Frente de Caixa)";

  return (
    `💈 *Agendamento Confirmado - ${barbershopName}* 💈\n\n` +
    `Olá, equipe ${barbershopName}! Acabei de confirmar meu horário pelo aplicativo.\n\n` +
    `👤 *Cliente:* ${clientName || "Cliente"}\n` +
    `✂️ *Serviço:* ${serviceName || "Atendimento"}\n` +
    `💈 *Profissional:* ${barberName || "Profissional disponível"}\n` +
    `📅 *Data:* ${dateStr}\n` +
    `⏰ *Horário:* ${timeStr}h\n` +
    `💰 *Valor Total:* ${formattedPrice}\n` +
    `💳 *Forma de Pagamento:* ${paymentLabel}\n` +
    (protocol ? `🔖 *Protocolo:* #${protocol}\n\n` : `\n`) +
    `Favor confirmar o recebimento. Obrigado!`
  );
}

/**
 * Gera mensagem de convite da barbearia para divulgação nas redes ou WhatsApp.
 */
export function buildWhatsAppInviteMessage({
  barbershopName = "Nossa Barbearia",
  bookingUrl = "",
} = {}) {
  return (
    `💈 *Agende seu Horário na ${barbershopName}!* 💈\n\n` +
    `Agora você pode escolher seu serviço, seu barbeiro de preferência e o melhor dia e horário diretamente pelo nosso app online:\n\n` +
    `👉 ${bookingUrl}\n\n` +
    `Rápido, fácil e sem esperar na fila!`
  );
}
