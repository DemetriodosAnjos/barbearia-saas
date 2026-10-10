import { createClient } from "@supabase/supabase-js";
import { FICTITIOUS_MOCK_CREDENTIALS } from "../utils/security";
import { safeStorage } from "../utils/safeStorage";

// As variáveis devem vir preferencialmente de variáveis de ambiente válidas (ignorando placeholders de .env.example).
const env = (typeof import.meta !== "undefined" && import.meta.env) || (typeof process !== "undefined" && process.env) || {};

const FALLBACK_SUPABASE_URL = "https://njgeevywotbflikilway.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZ2Vldnl3b3RiZmxpa2lsd2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MzcyMTgsImV4cCI6MjEwNTUxMzIxOH0.MqO9fbKFvAa3DK8YW44F8obbnW4yG7wzhcgDDa2S3Qk";

export function isValidSupabaseUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (
    !trimmed.startsWith("http") ||
    trimmed.includes("seu-projeto") ||
    trimmed.includes("mock") ||
    trimmed.includes("exemplo") ||
    trimmed.includes("example") ||
    trimmed.includes("placeholder")
  ) {
    return false;
  }
  return true;
}

export function isValidSupabaseKey(key) {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  if (
    trimmed.length < 30 ||
    trimmed.includes("sua_chave") ||
    trimmed.includes("mock") ||
    trimmed.includes("placeholder") ||
    !trimmed.startsWith("eyJ")
  ) {
    return false;
  }
  return true;
}

let storedUrl = "";
let storedKey = "";
try {
  // Limpa possíveis placeholders gravados anteriormente no storage
  for (const storageKey of ["barbearia_api_keys_vault_v1", "saas_api_keys_ssot_v2"]) {
    const raw = safeStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.supabase) {
        let dirty = false;
        if (!isValidSupabaseUrl(parsed.supabase.projectUrl)) {
          parsed.supabase.projectUrl = FALLBACK_SUPABASE_URL;
          dirty = true;
        }
        if (!isValidSupabaseKey(parsed.supabase.anonKey)) {
          parsed.supabase.anonKey = FALLBACK_SUPABASE_ANON_KEY;
          dirty = true;
        }
        if (dirty) {
          safeStorage.setItem(storageKey, JSON.stringify(parsed));
        }
        if (isValidSupabaseUrl(parsed.supabase.projectUrl) && isValidSupabaseKey(parsed.supabase.anonKey)) {
          storedUrl = parsed.supabase.projectUrl;
          storedKey = parsed.supabase.anonKey;
        }
      }
    }
  }
} catch {
  // ignore
}

const supabaseUrl = isValidSupabaseUrl(env.VITE_SUPABASE_URL)
  ? env.VITE_SUPABASE_URL.trim()
  : isValidSupabaseUrl(storedUrl)
    ? storedUrl.trim()
    : FALLBACK_SUPABASE_URL;

const supabaseAnonKey = isValidSupabaseKey(env.VITE_SUPABASE_ANON_KEY)
  ? env.VITE_SUPABASE_ANON_KEY.trim()
  : isValidSupabaseKey(storedKey)
    ? storedKey.trim()
    : FALLBACK_SUPABASE_ANON_KEY;

const isTestEnv =
  Boolean(env.VITEST) ||
  (typeof process !== "undefined" && process.env?.NODE_ENV === "test");

function extractProxyHeaders(headersInit) {
  const proxyHeaders = {};
  const allowed = ["content-type", "prefer", "accept", "range", "authorization"];
  if (!headersInit) return proxyHeaders;

  if (typeof headersInit.forEach === "function") {
    headersInit.forEach((v, k) => {
      const lk = String(k).toLowerCase();
      if (allowed.includes(lk)) {
        proxyHeaders[lk === "authorization" ? "x-client-authorization" : k] = v;
      }
    });
  } else if (Array.isArray(headersInit)) {
    for (const [k, v] of headersInit) {
      const lk = String(k).toLowerCase();
      if (allowed.includes(lk)) {
        proxyHeaders[lk === "authorization" ? "x-client-authorization" : k] = v;
      }
    }
  } else if (typeof headersInit === "object") {
    for (const [k, v] of Object.entries(headersInit)) {
      const lk = k.toLowerCase();
      if (allowed.includes(lk) && v !== undefined) {
        proxyHeaders[lk === "authorization" ? "x-client-authorization" : k] = String(v);
      }
    }
  }
  return proxyHeaders;
}

async function fetchViaServerProxy(targetPath, init = {}) {
  const proxyHeaders = extractProxyHeaders(init?.headers);
  return fetch(`/api/supabase-proxy?path=${encodeURIComponent(targetPath)}`, {
    method: init?.method || "GET",
    headers: proxyHeaders,
    body: init?.body,
    signal: init?.signal,
  });
}

async function supabaseResilientFetch(input, init = {}) {
  let rawUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input?.url || "";

  // Regras de higienização caso alguma URL venha com placeholder
  if (rawUrl.includes("seu-projeto-aqui.supabase.co") || rawUrl.includes("seu-projeto.supabase.co")) {
    rawUrl = rawUrl
      .replace("https://seu-projeto-aqui.supabase.co", FALLBACK_SUPABASE_URL)
      .replace("https://seu-projeto.supabase.co", FALLBACK_SUPABASE_URL);
    input = rawUrl;
  }

  const isBrowser = !isTestEnv && typeof window !== "undefined";
  const isStaticHost =
    isBrowser &&
    (window.location.hostname.endsWith("github.io") ||
      window.location.hostname.includes("github.io"));

  let targetPath = "";
  if (isBrowser && (rawUrl.includes("/rest/v1/") || rawUrl.includes("/auth/v1/"))) {
    try {
      const parsedUrl = new URL(rawUrl, window.location.origin);
      targetPath = `${parsedUrl.pathname}${parsedUrl.search}`;
    } catch {
      targetPath = "";
    }
  }

  // 1. As tabelas administrativas (`tenants`, `plans`, `saas_config`) utilizam o proxy server-side para contornar RLS apenas em ambiente full-stack com backend ativo
  if (
    isBrowser &&
    !isStaticHost &&
    (targetPath.startsWith("/rest/v1/tenants") ||
      targetPath.startsWith("/rest/v1/plans") ||
      targetPath.startsWith("/rest/v1/saas_config"))
  ) {
    try {
      const proxyRes = await fetchViaServerProxy(targetPath, init);
      if (proxyRes.status !== 404 && proxyRes.status !== 502) {
        return proxyRes;
      }
    } catch {
      // Fallback para fetch direto abaixo
    }
  }

  // 2. Para as demais rotas (/rest/v1/* e /auth/v1/*), tenta fetch direto e usa o proxy same-origin como contingência contra RLS (401/403) apenas se houver servidor proxy
  try {
    const directRes = await fetch(input, init);
    if ((directRes.status === 401 || directRes.status === 403) && isBrowser && !isStaticHost && targetPath) {
      try {
        const proxyFallback = await fetchViaServerProxy(targetPath, init);
        if (proxyFallback.ok) {
          return proxyFallback;
        }
      } catch {
        // Mantém directRes
      }
    }
    return directRes;
  } catch (networkErr) {
    if (isBrowser && !isStaticHost && targetPath) {
      return await fetchViaServerProxy(targetPath, init);
    }
    throw networkErr;
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: safeStorage,
  },
  global: {
    fetch: supabaseResilientFetch,
  },
});

/**
 * Monta o payload oficial de 18 colunas da tabela `public.tenants`
 * idêntico ao padrão utilizado pelo Painel SuperAdmin.
 */
export function buildTenantRecordPayload({
  id,
  name,
  slug,
  ownerName,
  ownerEmail,
  phone,
  plan = "pro",
  status = "active",
  barbersCount = 1,
  mrr,
  trialDaysLeft = 7,
  trialEndsAt,
  hasWhiteLabel = false,
  brandPrimary = "#ea580c",
  brandSecondary = "#16a34a",
  logoUrl = "",
  createdAt,
  updatedAt,
} = {}) {
  const nowIso = new Date().toISOString();
  const normalizedPlan = (plan || "pro").toLowerCase();
  const resolvedMrr =
    mrr !== undefined && mrr !== null
      ? Number(mrr)
      : normalizedPlan === "enterprise"
        ? 279.9
        : normalizedPlan === "starter"
          ? 69.9
          : 149.9;

  const defaultTrialEnds = new Date();
  defaultTrialEnds.setDate(defaultTrialEnds.getDate() + Number(trialDaysLeft ?? 7));

  return {
    id,
    name: (name || "Minha Barbearia").trim(),
    slug: (slug || "minha-barbearia").trim(),
    created_at: createdAt || nowIso,
    updated_at: updatedAt || nowIso,
    owner_name: (ownerName || "Gestor").trim(),
    owner_email: (ownerEmail || "").trim().toLowerCase(),
    phone: (phone || "").trim(),
    plan: normalizedPlan,
    status: status || "active",
    barbers_count: Number(barbersCount ?? 1),
    mrr: resolvedMrr,
    trial_days_left: Number(trialDaysLeft ?? 7),
    trial_ends_at: trialEndsAt || defaultTrialEnds.toISOString(),
    has_white_label: Boolean(hasWhiteLabel),
    brand_primary: brandPrimary || "#ea580c",
    brand_secondary: brandSecondary || "#16a34a",
    logo_url: logoUrl || "",
  };
}

/**
 * Normaliza qualquer registro de `tenants` ou `barbershops` mantendo
 * compatibilidade dupla (snake_case para SQL e camelCase para o React).
 */
export function normalizeTenantRecord(raw = {}, fallbackUser = null) {
  if (!raw || typeof raw !== "object") return null;

  const userMeta = fallbackUser?.user_metadata || {};
  const plan = raw.plan || userMeta.plan || "pro";
  const resolvedMrr = Number(
    raw.mrr ??
      (plan === "enterprise" ? 279.9 : plan === "starter" ? 69.9 : 149.9)
  );
  const trialEndsAt =
    raw.trial_ends_at || raw.trialEndsAt || userMeta.trial_ends_at || null;
  const computedDaysLeft = trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : Number(raw.trial_days_left ?? raw.trialDaysLeft ?? 7);

  const ownerName =
    raw.owner_name ||
    raw.ownerName ||
    userMeta.owner_name ||
    userMeta.name ||
    "Gestor";
  const ownerEmail =
    raw.owner_email ||
    raw.ownerEmail ||
    fallbackUser?.email ||
    userMeta.owner_email ||
    "";
  const phone =
    raw.phone || raw.ownerPhone || userMeta.phone || "";

  return {
    ...raw,
    id: raw.id || userMeta.barbershop_id || "a0000000-0000-0000-0000-000000000001",
    name: raw.name || userMeta.barbershop_name || "Minha Barbearia",
    slug: raw.slug || userMeta.slug || "minha-barbearia",
    created_at: raw.created_at || raw.createdAt || new Date().toISOString(),
    updated_at: raw.updated_at || raw.updatedAt || new Date().toISOString(),
    owner_name: ownerName,
    ownerName: ownerName,
    owner_email: ownerEmail,
    ownerEmail: ownerEmail,
    phone: phone,
    ownerPhone: phone,
    plan: plan,
    subscription_plan: raw.subscription_plan || (raw.status === "trial" ? "trial" : plan),
    status: raw.status || userMeta.status || "active",
    barbers_count: Number(raw.barbers_count ?? raw.barbersCount ?? 1),
    barbersCount: Number(raw.barbers_count ?? raw.barbersCount ?? 1),
    mrr: resolvedMrr,
    trial_days_left: Number(raw.trial_days_left ?? raw.trialDaysLeft ?? computedDaysLeft),
    trialDaysLeft: Number(raw.trialDaysLeft ?? raw.trial_days_left ?? computedDaysLeft),
    trial_ends_at: trialEndsAt,
    trialEndsAt: trialEndsAt,
    has_white_label: Boolean(raw.has_white_label ?? raw.hasWhiteLabel ?? false),
    hasWhiteLabel: Boolean(raw.hasWhiteLabel ?? raw.has_white_label ?? false),
    brand_primary: raw.brand_primary || raw.brandPrimary || "#ea580c",
    brandPrimary: raw.brandPrimary || raw.brand_primary || "#ea580c",
    brand_secondary: raw.brand_secondary || raw.brandSecondary || "#16a34a",
    brandSecondary: raw.brandSecondary || raw.brand_secondary || "#16a34a",
    logo_url: raw.logo_url ?? raw.logoUrl ?? "",
    logoUrl: raw.logoUrl ?? raw.logo_url ?? "",
  };
}

export async function ensureDefaultBarbershop() {
  try {
    await supabase.from("barbershops").upsert(
      [
        {
          id: "a0000000-0000-0000-0000-000000000001",
          name: "Barbearia Matriz",
          slug: "matriz",
          phone: "(11) 99999-9999",
          plan: "pro",
          subscription_plan: "trial",
        },
      ],
      { onConflict: "id" }
    );
  } catch (_e) {
    // Non-blocking fallback
  }
}

if (typeof window !== "undefined") {
  ensureDefaultBarbershop();
}
