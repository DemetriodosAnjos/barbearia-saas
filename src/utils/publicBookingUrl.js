/**
 * Utilitário para geração de URLs públicas da Barbearia SaaS.
 * 
 * Resolve o problema de 404 em hospedagens estáticas (como GitHub Pages sob o subcaminho /barbearia-saas/)
 * e garante que links enviados via WhatsApp levem os clientes diretamente ao funil público de agendamento online.
 */

export function getAppBaseUrl() {
  if (typeof window === "undefined") return "";

  const { origin, pathname } = window.location;

  // 1. Detecção explícita de subpasta no GitHub Pages (ex: demetriodosanjos.github.io/barbearia-saas/)
  if (pathname.includes("/barbearia-saas")) {
    return `${origin}/barbearia-saas`;
  }

  // 2. Detecção via BASE_URL do Vite (caso definido no build time)
  const viteBase = (import.meta.env?.BASE_URL || "/").replace(/\/$/, "");
  if (viteBase && viteBase !== "") {
    return `${origin}${viteBase}`;
  }

  // 3. Caso o app esteja rodando com rota protegida no pathname (ex: /admin, /dashboard, /superadmin, /login)
  const cleanPath = pathname
    .replace(/\/(admin|dashboard|login|onboarding|superadmin|client-app|design-system).*$/, "")
    .replace(/\/$/, "");
  if (cleanPath && cleanPath !== "/") {
    return `${origin}${cleanPath}`;
  }

  return origin;
}

/**
 * Constrói o link oficial público de agendamento para o cliente.
 * 
 * @param {Object} options
 * @param {string} options.barber - Nome ou ID do barbeiro preferido
 * @param {string} options.clientName - Nome do cliente
 * @param {string} options.clientPhone - Telefone/WhatsApp do cliente
 * @returns {string} URL pública formatada
 */
export function buildClientBookingUrl({ barber = "", clientName = "", clientPhone = "" } = {}) {
  const baseUrl = getAppBaseUrl();
  const params = new URLSearchParams();

  // Garante que o roteador caia no funil de agendamento público
  params.set("screen", "client-app");

  if (barber && barber !== "geral" && barber !== "Barbeiro Geral") {
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
