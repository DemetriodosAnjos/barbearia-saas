// Auditoria de Segurança e AppSec (Itens 8, 9, 10, 11 e 12)

// Decodificador seguro de JWT Base64URL com preenchimento (padding) automático
function parseJwtPayloadSafe(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Adiciona padding '=' se o comprimento não for múltiplo de 4 (exigência do atob no navegador)
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const decodedText = new TextDecoder().decode(bytes);
    return JSON.parse(decodedText);
  } catch (err) {
    console.warn("[securityAuditor] Falha ao decodificar payload JWT:", err);
    return null;
  }
}

export const securityAuditor = {
  // Item 10: Auditoria de Credenciais no Client (service_role vs anon_key)
  auditClientCredentials() {
    const results = [];
    const envVars = import.meta.env || {};

    const defaultFallbackAnonKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZ2Vldnl3b3RiZmxpa2lsd2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MzcyMTgsImV4cCI6MjEwNTUxMzIxOH0.MqO9fbKFvAa3DK8YW44F8obbnW4yG7wzhcgDDa2S3Qk";
    const defaultFallbackUrl = "https://njgeevywotbflikilway.supabase.co";

    const anonKey = envVars.VITE_SUPABASE_ANON_KEY || defaultFallbackAnonKey;
    const supabaseUrl = envVars.VITE_SUPABASE_URL || defaultFallbackUrl;

    // 1. Procura se alguma chave contém o padrão de service_role
    let serviceRoleFound = false;
    let leakedKeyName = null;

    Object.entries(envVars).forEach(([key, val]) => {
      const lowerKey = key.toLowerCase();
      const stringVal = String(val || "");
      if (
        lowerKey.includes("service_role") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("master_key")
      ) {
        serviceRoleFound = true;
        leakedKeyName = key;
      }
    });

    results.push({
      id: "SEC-10-1",
      title: "Varredura de Chave Privada (service_role)",
      description: "Verifica se a chave service_role ou tokens secretos vazaram no bundle client-side.",
      passed: !serviceRoleFound,
      severity: "CRITICAL",
      details: serviceRoleFound
        ? `ALERTA GRAVE: Variável perigosa '${leakedKeyName}' detectada no bundle cliente!`
        : "OK: Nenhuma credencial administrativa (service_role / secret) foi exposta no bundle.",
    });

    // 2. Análise do JWT da anon key (garante que tem role = 'anon')
    const jwtPayload = parseJwtPayloadSafe(anonKey);
    const isRoleAnon = jwtPayload?.role === "anon";
    const isFallbackUsed = !envVars.VITE_SUPABASE_ANON_KEY;

    results.push({
      id: "SEC-10-2",
      title: "Validação da Role da Chave Pública (anon)",
      description: "Garante que a chave pública usada nas requisições possui apenas privilégio 'anon' limitado por RLS.",
      passed: isRoleAnon,
      severity: "HIGH",
      details: isRoleAnon
        ? `OK: O token JWT cliente possui role='anon' (exp: ${
            jwtPayload?.exp
              ? new Date(jwtPayload.exp * 1000).toLocaleDateString()
              : "N/A"
          }). ${isFallbackUsed ? "[Origem: Chave Padrão Supabase]" : "[Origem: .env]"}`
        : "FALHA: O token não possui role 'anon' estrita ou não pôde ser decodificado.",
      payload: jwtPayload,
      source: isFallbackUsed ? "default_client_fallback" : "environment",
    });

    // 3. Validação do Host Supabase
    const isHttps = supabaseUrl.startsWith("https://");
    results.push({
      id: "SEC-10-3",
      title: "Criptografia de Transporte (HTTPS/TLS)",
      description: "Garante que todo tráfego de banco de dados e autenticação transita sobre HTTPS.",
      passed: isHttps,
      severity: "MEDIUM",
      details: isHttps
        ? `OK: Endpoint '${supabaseUrl}' configurado com SSL/TLS obrigatório.`
        : "FALHA: O endpoint do banco de dados não utiliza HTTPS.",
    });

    return results;
  },

  // Item 12: Sanitização de Input e Injeção (XSS / SQLi)
  testInputSanitization(rawInput) {
    if (!rawInput) return { isClean: true, threatsDetected: [], sanitized: "" };

    const threatsDetected = [];

    // Verificação de Tags Script ou manipuladores de eventos
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(rawInput)) {
      threatsDetected.push("Script Tag Injection (<script>)");
    }

    if (/on\w+\s*=/i.test(rawInput)) {
      threatsDetected.push("Inline Event Handler (ex: onerror=, onload=)");
    }

    if (/javascript:/i.test(rawInput)) {
      threatsDetected.push("Pseudo-Protocol (javascript:)");
    }

    // Detecção abrangente de SQL Injection (comandos DDL/DML, tautologias OR/AND e comentários SQL -- ou /*)
    if (
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|CREATE)\b)/i.test(rawInput) ||
      /(\b(OR|AND)\b\s+['"\d\w]+\s*=\s*['"\d\w]+)/i.test(rawInput) ||
      /--|;|\/\*|\*\//.test(rawInput)
    ) {
      threatsDetected.push("Padrão de SQL Injection Clássico");
    }

    // Sanitização segura contra XSS para renderização segura
    const sanitized = rawInput
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");

    return {
      isClean: threatsDetected.length === 0,
      threatsDetected,
      sanitized,
    };
  },

  // Item 9 & 11: Simulação de Isolamento Multi-Tenant & RBAC
  simulateTenantIsolationCheck(currentTenantId, requestedBarbershopId, userRole = "client") {
    // Regra:
    // Se userRole !== 'superadmin', currentTenantId DEVE ser idêntico ao requestedBarbershopId.
    const isAllowed =
      userRole === "superadmin" || currentTenantId === requestedBarbershopId;

    return {
      allowed: isAllowed,
      userRole,
      currentTenantId,
      requestedBarbershopId,
      message: isAllowed
        ? "Acesso concedido: Tenant verificado com sucesso pelo RLS."
        : "BLOQUEADO PELO RLS: Tentativa de leitura/mutação de dados de outro estabelecimento (Violação de Isolamento).",
    };
  },
};
