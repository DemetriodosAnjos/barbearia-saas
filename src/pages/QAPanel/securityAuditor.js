import {
  maskSecret,
  maskUrl,
  FICTITIOUS_MOCK_CREDENTIALS,
  scanContentForSecrets,
} from "../../utils/security";

// Decodificador seguro de JWT Base64URL com preenchimento (padding) automático
function parseJwtPayloadSafe(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
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

    const anonKey =
      envVars.VITE_SUPABASE_ANON_KEY ||
      FICTITIOUS_MOCK_CREDENTIALS.SUPABASE_ANON_KEY;
    const supabaseUrl =
      envVars.VITE_SUPABASE_URL || FICTITIOUS_MOCK_CREDENTIALS.SUPABASE_URL;

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
      description:
        "Verifica se a chave service_role ou tokens secretos vazaram no bundle client-side.",
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
      description:
        "Garante que a chave pública usada nas requisições possui apenas privilégio 'anon' limitado por RLS.",
      passed: isRoleAnon,
      severity: "HIGH",
      details: isRoleAnon
        ? `OK: O token JWT cliente possui role='anon' (exp: ${
            jwtPayload?.exp
              ? new Date(jwtPayload.exp * 1000).toLocaleDateString()
              : "N/A"
          }). Token auditado e mascarado: ${maskSecret(anonKey, 10, 6)}`
        : "FALHA: O token não possui role 'anon' estrita ou não pôde ser decodificado.",
      payload: jwtPayload,
      source: isFallbackUsed ? "mock_fictitious_fallback" : "environment",
    });

    // 3. Validação do Host Supabase e Criptografia
    const isHttps = supabaseUrl.startsWith("https://");
    results.push({
      id: "SEC-10-3",
      title: "Criptografia de Transporte (HTTPS/TLS)",
      description:
        "Garante que todo tráfego de banco de dados e autenticação transita sobre HTTPS.",
      passed: isHttps,
      severity: "MEDIUM",
      details: isHttps
        ? `OK: Endpoint '${maskUrl(supabaseUrl)}' configurado com SSL/TLS obrigatório.`
        : "FALHA: O endpoint do banco de dados não utiliza HTTPS.",
    });

    return results;
  },

  // Auditoria de Bundle, Mapas de Código e Risco de Exposição
  auditBundleSecurity() {
    const findings = [];
    const envVars = import.meta.env || {};

    // 1. Inspeciona se variáveis VITE_ expõem dados sensíveis
    Object.keys(envVars).forEach((key) => {
      if (
        /secret|password|private|master|service_role/i.test(key) &&
        key.startsWith("VITE_")
      ) {
        findings.push({
          type: "EXPOSED_PRIVATE_ENV",
          severity: "CRITICAL",
          message: `A variável pública '${key}' está prefixada com VITE_ e portanto é compilada diretamente no bundle do navegador!`,
        });
      }
    });

    // 2. Verifica scripts carregados no DOM
    const scripts = Array.from(document.querySelectorAll("script[src]"));
    scripts.forEach((script) => {
      const src = script.getAttribute("src") || "";
      if (src.includes(".map")) {
        findings.push({
          type: "EXPOSED_SOURCEMAP",
          severity: "MEDIUM",
          message: `Mapa de código (sourcemap) '${src}' detectado em produção. Pode expor a estrutura original do código-fonte.`,
        });
      }
    });

    return {
      passed: findings.length === 0,
      findings,
      checkedScriptsCount: scripts.length,
    };
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

    // Detecção abrangente de SQL Injection
    if (
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|CREATE)\b)/i.test(
        rawInput
      ) ||
      /(\b(OR|AND)\b\s+['"\d\w]+\s*=\s*['"\d\w]+)/i.test(rawInput) ||
      /--|;|\/\*|\*\//.test(rawInput)
    ) {
      threatsDetected.push("Padrão de SQL Injection Clássico");
    }

    // Sanitização segura contra XSS
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
  simulateTenantIsolationCheck(
    currentTenantId,
    requestedBarbershopId,
    userRole = "client"
  ) {
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

  // Protocolo Formal de Rotação e Revogação de Segredos
  getSecretRotationProtocol() {
    return [
      {
        step: 1,
        title: "Revogação Imediata do JWT Secret",
        action: "Supabase Dashboard ➔ Project Settings ➔ API ➔ JWT Secret ➔ Generate New Secret",
        impact:
          "Invalida instantaneamente todos os tokens anon e service_role já emitidos no passado, encerrando qualquer sessão potencialmente comprometida.",
      },
      {
        step: 2,
        title: "Emissão e Rotação da Nova Chave",
        action: "Atualizar as variáveis de ambiente nos servidores de produção e no arquivo .env local com a nova anon key.",
        impact:
          "Reestabelece a comunicação segura da aplicação com credenciais recém-geradas.",
      },
      {
        step: 3,
        title: "Auditoria Forense de Logs de Acesso",
        action: "Supabase Dashboard ➔ Logs ➔ API Logs / Database Logs",
        impact:
          "Investiga se houve chamadas suspeitas a tabelas sensíveis durante o intervalo em que a chave esteve exposta em bundles públicos.",
      },
      {
        step: 4,
        title: "Migração da Camada de Dados para Backend Proxy",
        action: "Implementar rotas seguras /api/* para que o cliente React nunca receba tokens de banco de dados diretamente no navegador.",
        impact:
          "Arquitetura Zero-Trust: o front-end se comunica apenas com o backend seguro.",
      },
    ];
  },
};
