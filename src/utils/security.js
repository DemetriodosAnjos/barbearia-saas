/**
 * Utilitários de Segurança, Mascaramento e Auditoria de Segredos
 */

// Credenciais 100% fictícias e sintéticas para testes seguros e ambientes isolados
export const FICTITIOUS_MOCK_CREDENTIALS = {
  SUPABASE_URL: "https://mock-barbersaas-project.supabase.co",
  // JWT sintético com claims fictícias (role: anon, exp: 2099)
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1tb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6NDA3MDkwODgwMH0.MOCK_FICTITIOUS_SIGNATURE_FOR_TESTS_ONLY",
};

/**
 * Mascara qualquer token, chave ou segredo para exibição segura em logs e UI
 * Ex: "eyJhbGciOiJIUzI1NiIsInR5cCI6..." -> "eyJhbG...[MASCARADO: 154 chars]...3Qk"
 */
export function maskSecret(secret, visibleStart = 6, visibleEnd = 4) {
  if (!secret || typeof secret !== "string") return "[NENHUM]";
  const trimmed = secret.trim();
  if (trimmed.length <= visibleStart + visibleEnd) {
    return "********";
  }
  const start = trimmed.substring(0, visibleStart);
  const end = trimmed.substring(trimmed.length - visibleEnd);
  return `${start}...[MASCARADO: ${trimmed.length} chars]...${end}`;
}

/**
 * Mascara URLs que contenham credenciais ou parâmetros sensíveis
 */
export function maskUrl(url) {
  if (!url || typeof url !== "string") return "[NENHUMA]";
  try {
    const parsed = new URL(url);
    const hostParts = parsed.hostname.split(".");
    if (hostParts.length > 2) {
      // Ex: njgeevywotbflikilway.supabase.co -> njge***.supabase.co
      const projectRef = hostParts[0];
      const maskedRef =
        projectRef.length > 6
          ? `${projectRef.substring(0, 4)}***`
          : "***";
      return `${parsed.protocol}//${maskedRef}.${hostParts.slice(1).join(".")}`;
    }
    return url;
  } catch {
    return maskSecret(url, 8, 4);
  }
}

/**
 * Varredor de bundles e strings em busca de padrões de segredos não mascarados
 */
export function scanContentForSecrets(content) {
  if (!content || typeof content !== "string") return [];
  const findings = [];

  // Padrão de service_role ou secret_key
  const serviceRolePattern = /service_role[a-zA-Z0-9_\-.]{10,}/gi;
  if (serviceRolePattern.test(content)) {
    findings.push({
      type: "SERVICE_ROLE_KEY",
      severity: "CRITICAL",
      message: "Chave com privilégio service_role detectada.",
    });
  }

  // Padrão de chaves privadas (RSA/PEM)
  if (content.includes("-----BEGIN PRIVATE KEY-----")) {
    findings.push({
      type: "PRIVATE_KEY_PEM",
      severity: "CRITICAL",
      message: "Chave privada PEM identificada.",
    });
  }

  return findings;
}
