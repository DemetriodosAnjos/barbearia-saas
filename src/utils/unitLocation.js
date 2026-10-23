import { safeStorage } from "./safeStorage";

/**
 * Formata o nome da unidade da barbearia a partir dos dados de localização cadastrados.
 * Exemplo: "Unidade Jardim - SP", "Unidade Centro - PR", "Unidade Batel - PR".
 */
export function formatUnitLocation(neighborhood, city, state, defaultFallback = "Jardim - SP") {
  let cleanNeighborhood = (neighborhood || "").trim();
  let cleanCity = (city || "").trim();
  let cleanState = (state || "").trim().toUpperCase();

  // Remove prefixos redundantes caso o usuário já tenha digitado "Unidade ..."
  if (cleanNeighborhood.toLowerCase().startsWith("unidade ")) {
    cleanNeighborhood = cleanNeighborhood.slice(8).trim();
  }
  if (cleanCity.toLowerCase().startsWith("unidade ")) {
    cleanCity = cleanCity.slice(8).trim();
  }

  if (cleanNeighborhood && cleanState) {
    return `Unidade ${cleanNeighborhood} - ${cleanState}`;
  }
  if (cleanNeighborhood && cleanCity) {
    return `Unidade ${cleanNeighborhood} - ${cleanCity}`;
  }
  if (cleanNeighborhood) {
    return `Unidade ${cleanNeighborhood}`;
  }
  if (cleanCity && cleanState) {
    return `Unidade ${cleanCity} - ${cleanState}`;
  }
  if (cleanCity) {
    return `Unidade ${cleanCity}`;
  }

  // Fallback padrão amigável
  const fallbackStr = (defaultFallback || "Jardim - SP").trim();
  if (fallbackStr.toLowerCase().startsWith("unidade ")) {
    return fallbackStr;
  }
  return `Unidade ${fallbackStr}`;
}

/**
 * Recupera os dados de endereço cadastrados em (Meu perfil / Aba- contato e endereço)
 * a partir das múltiplas fontes (tenant, user.user_metadata, cache local).
 */
export function resolveBarbershopAddress(tenant, user) {
  // 1. Dados diretos de props tenant
  const tNeighborhood = tenant?.neighborhood || tenant?.bairro || "";
  const tCity = tenant?.city || tenant?.cidade || "";
  const tState = tenant?.state || tenant?.uf || tenant?.estado || "";

  // 2. Metadados do usuário autenticado (SSOT Supabase Auth)
  const uMeta = user?.user_metadata || {};
  const uNeighborhood = uMeta.neighborhood || uMeta.bairro || user?.neighborhood || "";
  const uCity = uMeta.city || uMeta.cidade || user?.city || "";
  const uState = uMeta.state || uMeta.uf || uMeta.estado || user?.state || "";

  // 3. Cache do navegador (safeStorage)
  let cNeighborhood = "";
  let cCity = "";
  let cState = "";
  try {
    const rawT = safeStorage.getItem("saas_active_tenant") || safeStorage.getItem("barbearia_tenant_cache");
    if (rawT) {
      const parsed = JSON.parse(rawT);
      cNeighborhood = parsed?.neighborhood || parsed?.bairro || "";
      cCity = parsed?.city || parsed?.cidade || "";
      cState = parsed?.state || parsed?.uf || parsed?.estado || "";
    }
  } catch {}

  try {
    const rawU = safeStorage.getItem("saas_auth_user");
    if (rawU) {
      const parsedU = JSON.parse(rawU);
      const meta = parsedU?.user_metadata || parsedU || {};
      if (!cNeighborhood) cNeighborhood = meta.neighborhood || meta.bairro || "";
      if (!cCity) cCity = meta.city || meta.cidade || "";
      if (!cState) cState = meta.state || meta.uf || meta.estado || "";
    }
  } catch {}

  const neighborhood = (tNeighborhood || uNeighborhood || cNeighborhood || "").trim();
  const city = (tCity || uCity || cCity || "").trim();
  const state = (tState || uState || cState || "").trim();

  return { neighborhood, city, state };
}

/**
 * Retorna o título formatado da unidade principal com base no endereço cadastrado no perfil.
 */
export function getBarbershopUnitName(tenant, user) {
  const { neighborhood, city, state } = resolveBarbershopAddress(tenant, user);
  const defaultFallback = tenant?.name ? `${tenant.name} - SP` : "Jardim - SP";
  return formatUnitLocation(neighborhood, city, state, defaultFallback);
}
