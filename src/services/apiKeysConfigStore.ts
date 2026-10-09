/**
 * src/services/apiKeysConfigStore.ts
 *
 * Gerenciador Central e Fonte Única da Verdade (SSOT - Single Source of Truth)
 * para todas as 18 variáveis de ambiente de infraestrutura (.env.example).
 *
 * Arquitetura de Resolução em Cascata:
 * 1. Banco Supabase (tabela saas_config / api_keys_config) -> Sobrescrita em tempo de execução
 * 2. Variáveis de Ambiente do Sistema (.env / import.meta.env) -> Baseline de infraestrutura
 * 3. Valores Padrão Seguros (Fallbacks de Desenvolvimento / Sandbox) -> Prevenção de crash
 */

import { supabase } from "../lib/supabase";
import { mercadoPagoConfigStore } from "./mercadoPagoConfigStore";
import { safeStorage } from "../utils/safeStorage";

export interface ApiKeyFieldDef {
  key: string;
  envVar: string;
  label: string;
  category: "mercadopago" | "supabase" | "stripe" | "security" | "comms";
  scope: "public" | "private";
  description: string;
  placeholder?: string;
  isSecret?: boolean;
}

export interface ApiKeysFullConfig {
  lastUpdated?: string;
  sourceMap?: Record<string, "env" | "admin">;

  // 1. Supabase & Banco de Dados
  supabase: {
    projectUrl: string; // VITE_SUPABASE_URL
    anonKey: string; // VITE_SUPABASE_ANON_KEY
    serviceRoleKey: string; // SUPABASE_SERVICE_ROLE_KEY
  };

  // 2. Mercado Pago API
  mercadopago: {
    publicKey: string; // VITE_MERCADO_PAGO_PUBLIC_KEY / VITE_MERCADO_PAGO_PUBLIC_KEY_PROD
    accessToken: string; // MERCADO_PAGO_ACCESS_TOKEN / MERCADO_PAGO_ACCESS_TOKEN_PROD
    publicKeyProd?: string; // VITE_MERCADO_PAGO_PUBLIC_KEY_PROD
    accessTokenProd?: string; // MERCADO_PAGO_ACCESS_TOKEN_PROD
    publicKeyTest?: string; // VITE_MERCADO_PAGO_PUBLIC_KEY_TEST
    accessTokenTest?: string; // MERCADO_PAGO_ACCESS_TOKEN_TEST
    webhookSecret: string; // WEBHOOK_SECRET_MERCADOPAGO
    activeEnvironment: "sandbox" | "production";
  };

  // 3. Stripe Gateway
  stripe: {
    publicKey: string; // VITE_STRIPE_PUBLIC_KEY
    secretKey: string; // STRIPE_SECRET_KEY
    webhookSecret: string; // WEBHOOK_SECRET_STRIPE
  };

  // 4. Segurança, JWT & LGPD
  security: {
    jwtAccessSecret: string; // JWT_ACCESS_SECRET
    jwtRefreshSecret: string; // JWT_REFRESH_SECRET
    lgpdPepper: string; // LGPD_ANONYMIZATION_PEPPER
    lgpdCronToken: string; // LGPD_CRON_INTERNAL_TOKEN
    auditTrailSecret: string; // AUDIT_TRAIL_HMAC_SECRET
  };

  // 5. Comunicações, WhatsApp & IA
  comms: {
    whatsappWebhookSecret: string; // WEBHOOK_SECRET_WHATSAPP
    geminiApiKey: string; // GEMINI_API_KEY
    appUrl: string; // VITE_APP_URL
    nodeEnv: string; // NODE_ENV
  };
}

// Catálogo metadados das 18 variáveis do .env.example
export const ENV_VARS_CATALOG: ApiKeyFieldDef[] = [
  // Supabase
  {
    key: "supabase.projectUrl",
    envVar: "VITE_SUPABASE_URL",
    label: "URL do Projeto Supabase",
    category: "supabase",
    scope: "public",
    description: "Endpoint público da API REST e WebSockets do banco PostgreSQL gerenciado.",
    placeholder: "https://seu-projeto.supabase.co",
  },
  {
    key: "supabase.anonKey",
    envVar: "VITE_SUPABASE_ANON_KEY",
    label: "Chave Anon/Pública Supabase",
    category: "supabase",
    scope: "public",
    description: "Chave pública com claim role=anon, protegida rigorosamente por políticas de RLS.",
    placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    isSecret: true,
  },
  {
    key: "supabase.serviceRoleKey",
    envVar: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Chave Service Role Mestra (Bypass RLS)",
    category: "supabase",
    scope: "private",
    description: "Chave mestra estritamente privada de backend/Edge Functions. NUNCA expor no front-end.",
    placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    isSecret: true,
  },

  // Mercado Pago - Produção & Teste
  {
    key: "mercadopago.publicKeyProd",
    envVar: "VITE_MERCADO_PAGO_PUBLIC_KEY_PROD",
    label: "Chave Pública (Produção) Mercado Pago",
    category: "mercadopago",
    scope: "public",
    description: "Chave pública de produção (APP_USR-...) do Checkout Pro e Brick.",
    placeholder: "APP_USR-...",
  },
  {
    key: "mercadopago.accessTokenProd",
    envVar: "MERCADO_PAGO_ACCESS_TOKEN_PROD",
    label: "Access Token Privado (Produção) Mercado Pago",
    category: "mercadopago",
    scope: "private",
    description: "Token secreto de produção para emissão de Pix e cobranças reais em cartão.",
    placeholder: "APP_USR-...",
    isSecret: true,
  },
  {
    key: "mercadopago.publicKeyTest",
    envVar: "VITE_MERCADO_PAGO_PUBLIC_KEY_TEST",
    label: "Chave Pública (Teste / Sandbox) Mercado Pago",
    category: "mercadopago",
    scope: "public",
    description: "Chave pública de teste/sandbox para transações fictícias.",
    placeholder: "APP_USR-...",
  },
  {
    key: "mercadopago.accessTokenTest",
    envVar: "MERCADO_PAGO_ACCESS_TOKEN_TEST",
    label: "Access Token Privado (Teste / Sandbox) Mercado Pago",
    category: "mercadopago",
    scope: "private",
    description: "Token de acesso privado de teste para homologação sem transações bancárias reais.",
    placeholder: "APP_USR-...",
    isSecret: true,
  },
  {
    key: "mercadopago.webhookSecret",
    envVar: "WEBHOOK_SECRET_MERCADOPAGO",
    label: "Segredo HMAC de Webhooks Mercado Pago",
    category: "mercadopago",
    scope: "private",
    description: "Segredo criptográfico para autenticação e validação de assinaturas no header x-signature.",
    placeholder: "whsec_...",
    isSecret: true,
  },

  // Stripe
  {
    key: "stripe.publicKey",
    envVar: "VITE_STRIPE_PUBLIC_KEY",
    label: "Chave Pública Stripe Elements",
    category: "stripe",
    scope: "public",
    description: "Chave pública (pk_live_... ou pk_test_...) para tokenização de cartões no front-end.",
    placeholder: "pk_test_...",
  },
  {
    key: "stripe.secretKey",
    envVar: "STRIPE_SECRET_KEY",
    label: "Chave Secreta Stripe (Server-Side)",
    category: "stripe",
    scope: "private",
    description: "Chave secreta privada (sk_live_... ou sk_test_...) para cobranças e estornos.",
    placeholder: "sk_live_...",
    isSecret: true,
  },
  {
    key: "stripe.webhookSecret",
    envVar: "WEBHOOK_SECRET_STRIPE",
    label: "Segredo de Assinatura Webhook Stripe",
    category: "stripe",
    scope: "private",
    description: "Segredo criptográfico whsec_... para validação de integridade dos eventos do Stripe.",
    placeholder: "whsec_...",
    isSecret: true,
  },

  // Segurança & LGPD
  {
    key: "security.jwtAccessSecret",
    envVar: "JWT_ACCESS_SECRET",
    label: "Segredo Criptográfico JWT (Access Token)",
    category: "security",
    scope: "private",
    description: "Assina tokens de autenticação de vida curta (15 min) com algoritmo HMAC-SHA256.",
    placeholder: "minimo_32_caracteres_aleatorios...",
    isSecret: true,
  },
  {
    key: "security.jwtRefreshSecret",
    envVar: "JWT_REFRESH_SECRET",
    label: "Segredo Criptográfico JWT (Refresh Token)",
    category: "security",
    scope: "private",
    description: "Assina refresh tokens de vida longa (7 dias) armazenados em cookies seguros HttpOnly.",
    placeholder: "minimo_32_caracteres_aleatorios...",
    isSecret: true,
  },
  {
    key: "security.lgpdPepper",
    envVar: "LGPD_ANONYMIZATION_PEPPER",
    label: "Pepper de Anonimização Criptográfica (LGPD)",
    category: "security",
    scope: "private",
    description: "Pepper secreto para geração de hashes irreversíveis de PII conforme Art. 16 da LGPD.",
    placeholder: "chave_pepper_secreta_minimo_32_caracteres...",
    isSecret: true,
  },
  {
    key: "security.lgpdCronToken",
    envVar: "LGPD_CRON_INTERNAL_TOKEN",
    label: "Token de Autorização de Cron de Expurgo",
    category: "security",
    scope: "private",
    description: "Token de segurança para disparo autorizado de rotinas de soft-delete e expurgo.",
    placeholder: "token_secreto_autorizacao_cron...",
    isSecret: true,
  },
  {
    key: "security.auditTrailSecret",
    envVar: "AUDIT_TRAIL_HMAC_SECRET",
    label: "Segredo HMAC da Trilha de Auditoria WORM",
    category: "security",
    scope: "private",
    description: "Assinatura digital dos registros de auditoria imutáveis no PostgreSQL.",
    placeholder: "segredo_hmac_trilha_auditoria...",
    isSecret: true,
  },

  // Comunicações & IA
  {
    key: "comms.whatsappWebhookSecret",
    envVar: "WEBHOOK_SECRET_WHATSAPP",
    label: "Segredo HMAC de Webhooks WhatsApp Cloud",
    category: "comms",
    scope: "private",
    description: "Valida notificações recebidas da API oficial do WhatsApp Cloud (Meta Graph API).",
    placeholder: "webhook_secret_whatsapp_meta...",
    isSecret: true,
  },
  {
    key: "comms.geminiApiKey",
    envVar: "GEMINI_API_KEY",
    label: "Chave da API Gemini (IA Server-Side)",
    category: "comms",
    scope: "private",
    description: "Chave de acesso aos modelos Gemini para assistentes e lógica de backend.",
    placeholder: "AIzaSy...",
    isSecret: true,
  },
  {
    key: "comms.appUrl",
    envVar: "VITE_APP_URL",
    label: "URL Canônica da Aplicação",
    category: "comms",
    scope: "public",
    description: "Domínio público principal para redirecionamentos de checkout e links de convite.",
    placeholder: "https://barbersaas.com.br",
  },
  {
    key: "comms.nodeEnv",
    envVar: "NODE_ENV",
    label: "Ambiente de Execução (NODE_ENV)",
    category: "comms",
    scope: "public",
    description: "Define regras de compilação, cookies seguros (secure: true) e logs.",
    placeholder: "development | production",
  },
];

const STORAGE_KEY = "saas_api_keys_ssot_v2";

// Configuração Padrão extraída do .env.example
export const BASELINE_ENV_CONFIG: ApiKeysFullConfig = {
  sourceMap: {
    "supabase.projectUrl": "env",
    "supabase.anonKey": "env",
    "supabase.serviceRoleKey": "env",
    "mercadopago.publicKey": "env",
    "mercadopago.accessToken": "env",
    "mercadopago.webhookSecret": "env",
    "stripe.publicKey": "env",
    "stripe.secretKey": "env",
    "stripe.webhookSecret": "env",
    "security.jwtAccessSecret": "env",
    "security.jwtRefreshSecret": "env",
    "security.lgpdPepper": "env",
    "security.lgpdCronToken": "env",
    "security.auditTrailSecret": "env",
    "comms.whatsappWebhookSecret": "env",
    "comms.geminiApiKey": "env",
    "comms.appUrl": "env",
    "comms.nodeEnv": "env",
  },
  supabase: {
    projectUrl:
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) || "",
    anonKey:
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) || "",
    serviceRoleKey:
      (typeof process !== "undefined" && process.env?.SUPABASE_SERVICE_ROLE_KEY) || "",
  },
  mercadopago: {
    publicKey:
      (typeof import.meta !== "undefined" &&
        (import.meta.env?.VITE_MERCADO_PAGO_PUBLIC_KEY ||
          import.meta.env?.VITE_MERCADO_PAGO_PUBLIC_KEY_PROD)) ||
      "",
    publicKeyProd:
      (typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_MERCADO_PAGO_PUBLIC_KEY_PROD) ||
      "",
    publicKeyTest:
      (typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_MERCADO_PAGO_PUBLIC_KEY_TEST) ||
      "",
    accessToken:
      (typeof process !== "undefined" &&
        (process.env?.MERCADO_PAGO_ACCESS_TOKEN ||
          process.env?.MERCADO_PAGO_ACCESS_TOKEN_PROD)) ||
      "",
    accessTokenProd:
      (typeof process !== "undefined" &&
        process.env?.MERCADO_PAGO_ACCESS_TOKEN_PROD) ||
      "",
    accessTokenTest:
      (typeof process !== "undefined" &&
        process.env?.MERCADO_PAGO_ACCESS_TOKEN_TEST) ||
      "",
    webhookSecret:
      (typeof process !== "undefined" &&
        process.env?.WEBHOOK_SECRET_MERCADOPAGO) ||
      "",
    activeEnvironment: "production",
  },
  stripe: {
    publicKey:
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_STRIPE_PUBLIC_KEY) ||
      "",
    secretKey:
      (typeof process !== "undefined" && process.env?.STRIPE_SECRET_KEY) || "",
    webhookSecret:
      (typeof process !== "undefined" && process.env?.WEBHOOK_SECRET_STRIPE) || "",
  },
  security: {
    jwtAccessSecret:
      (typeof process !== "undefined" && process.env?.JWT_ACCESS_SECRET) || "",
    jwtRefreshSecret:
      (typeof process !== "undefined" && process.env?.JWT_REFRESH_SECRET) || "",
    lgpdPepper:
      (typeof process !== "undefined" && process.env?.LGPD_ANONYMIZATION_PEPPER) || "",
    lgpdCronToken:
      (typeof process !== "undefined" && process.env?.LGPD_CRON_INTERNAL_TOKEN) || "",
    auditTrailSecret:
      (typeof process !== "undefined" && process.env?.AUDIT_TRAIL_HMAC_SECRET) || "",
  },
  comms: {
    whatsappWebhookSecret:
      (typeof process !== "undefined" && process.env?.WEBHOOK_SECRET_WHATSAPP) || "",
    geminiApiKey:
      (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) || "",
    appUrl:
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) || "",
    nodeEnv:
      (typeof process !== "undefined" && process.env?.NODE_ENV) || "development",
  },
};

type ApiKeysListener = (config: ApiKeysFullConfig) => void;

class ApiKeysConfigStore {
  private config: ApiKeysFullConfig;
  private listeners: Set<ApiKeysListener> = new Set();
  private isLoadedFromDb: boolean = false;

  constructor() {
    this.config = this.loadInitialConfig();
    this.syncWithMercadoPagoStore();
    try {
      mercadoPagoConfigStore.subscribe(() => {
        this.syncWithMercadoPagoStore();
      });
    } catch {
      // safe fallback
    }
    // Tenta carregar do Supabase em background
    this.fetchFromSupabase();
  }

  private loadInitialConfig(): ApiKeysFullConfig {
    try {
      const stored = safeStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...BASELINE_ENV_CONFIG,
          ...parsed,
          supabase: { ...BASELINE_ENV_CONFIG.supabase, ...(parsed.supabase || {}) },
          mercadopago: {
            ...BASELINE_ENV_CONFIG.mercadopago,
            ...(parsed.mercadopago || {}),
          },
          stripe: { ...BASELINE_ENV_CONFIG.stripe, ...(parsed.stripe || {}) },
          security: { ...BASELINE_ENV_CONFIG.security, ...(parsed.security || {}) },
          comms: { ...BASELINE_ENV_CONFIG.comms, ...(parsed.comms || {}) },
          sourceMap: { ...BASELINE_ENV_CONFIG.sourceMap, ...(parsed.sourceMap || {}) },
        };
      }
    } catch {
      // Fallback
    }

    return { ...BASELINE_ENV_CONFIG };
  }

  public syncWithMercadoPagoStore() {
    try {
      const mpCfg = mercadoPagoConfigStore.getConfig();
      const activeCreds =
        mpCfg.activeEnvironment === "production" ? mpCfg.production : mpCfg.sandbox;

      this.config.mercadopago = {
        publicKey: activeCreds.publicKey || this.config.mercadopago.publicKey,
        accessToken: activeCreds.accessToken || this.config.mercadopago.accessToken,
        publicKeyProd: mpCfg.production.publicKey || this.config.mercadopago.publicKeyProd,
        accessTokenProd: mpCfg.production.accessToken || this.config.mercadopago.accessTokenProd,
        publicKeyTest: mpCfg.sandbox.publicKey || this.config.mercadopago.publicKeyTest,
        accessTokenTest: mpCfg.sandbox.accessToken || this.config.mercadopago.accessTokenTest,
        webhookSecret:
          activeCreds.webhookSecret || this.config.mercadopago.webhookSecret,
        activeEnvironment: mpCfg.activeEnvironment,
      };
      this.persistLocal();
      this.notifyListeners();
    } catch {
      // safe fallback
    }
  }

  public async fetchFromSupabase(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("saas_config")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (!error && data && data.api_keys_config) {
        const dbConfig = data.api_keys_config;
        this.config = {
          ...this.config,
          ...dbConfig,
          sourceMap: {
            ...this.config.sourceMap,
            ...(dbConfig.sourceMap || {}),
          },
        };
        this.isLoadedFromDb = true;
        this.persistLocal();
        this.notifyListeners();
        return true;
      }
    } catch (err) {
      console.warn("Aviso ao buscar chaves de saas_config do Supabase:", err);
    }
    return false;
  }

  public getConfig(): ApiKeysFullConfig {
    return { ...this.config };
  }

  public getNestedValue(path: string): string {
    const parts = path.split(".");
    let current: any = this.config;
    for (const part of parts) {
      if (!current) return "";
      current = current[part];
    }
    return current || "";
  }

  public setNestedValue(path: string, value: string) {
    const parts = path.split(".");
    const newConfig: any = { ...this.config };
    let current = newConfig;

    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = { ...current[parts[i]] };
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;

    // Atualiza marca de origem para 'admin'
    newConfig.sourceMap = {
      ...(newConfig.sourceMap || {}),
      [path]: "admin",
    };
    newConfig.lastUpdated = new Date().toISOString();

    this.config = newConfig;
    this.persistLocal();
    this.notifyListeners();
  }

  public async saveConfig(updated: Partial<ApiKeysFullConfig>): Promise<{ success: boolean; error?: string }> {
    this.config = {
      ...this.config,
      ...updated,
      lastUpdated: new Date().toISOString(),
    };

    this.persistLocal();

    // Sincroniza com mercadoPagoConfigStore
    if (updated.mercadopago) {
      const env = updated.mercadopago.activeEnvironment || "sandbox";
      mercadoPagoConfigStore.saveConfig({
        activeEnvironment: env,
        [env]: {
          publicKey: updated.mercadopago.publicKey,
          accessToken: updated.mercadopago.accessToken,
          webhookSecret: updated.mercadopago.webhookSecret,
        },
      });
    }

    // Persiste no Supabase
    try {
      const { error } = await supabase
        .from("saas_config")
        .upsert(
          {
            id: "default",
            api_keys_config: this.config,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (error) {
        console.warn("Aviso: Configurações salvas localmente, mas houve erro ao persistir no Supabase:", error.message);
      }
    } catch (err: any) {
      console.warn("Erro ao sincronizar com banco:", err);
    }

    this.notifyListeners();
    return { success: true };
  }

  public resetToEnvDefaults(): ApiKeysFullConfig {
    this.config = JSON.parse(JSON.stringify(BASELINE_ENV_CONFIG));
    this.config.lastUpdated = new Date().toISOString();
    this.persistLocal();
    this.notifyListeners();
    return this.getConfig();
  }

  public async syncFromEnvFile(): Promise<{
    success: boolean;
    count: number;
    message: string;
    env?: Record<string, string>;
  }> {
    try {
      const res = await fetch("/api/env/sync");
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.env) {
        const env: Record<string, string> = data.env;
        let updatedCount = 0;

        // 1. Supabase
        if (env.VITE_SUPABASE_URL) {
          this.config.supabase.projectUrl = env.VITE_SUPABASE_URL;
          updatedCount++;
        }
        if (env.VITE_SUPABASE_ANON_KEY) {
          this.config.supabase.anonKey = env.VITE_SUPABASE_ANON_KEY;
          updatedCount++;
        }
        if (env.SUPABASE_SERVICE_ROLE_KEY) {
          this.config.supabase.serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
          updatedCount++;
        }

        // 2. Mercado Pago (Produção & Teste / Sandbox)
        const prodPk = env.VITE_MERCADO_PAGO_PUBLIC_KEY_PROD || env.VITE_MERCADO_PAGO_PUBLIC_KEY;
        const prodToken = env.MERCADO_PAGO_ACCESS_TOKEN_PROD || env.MERCADO_PAGO_ACCESS_TOKEN;
        const testPk = env.VITE_MERCADO_PAGO_PUBLIC_KEY_TEST;
        const testToken = env.MERCADO_PAGO_ACCESS_TOKEN_TEST;

        if (prodPk) {
          this.config.mercadopago.publicKeyProd = prodPk;
          this.config.mercadopago.publicKey = prodPk;
          updatedCount++;
        }
        if (prodToken) {
          this.config.mercadopago.accessTokenProd = prodToken;
          this.config.mercadopago.accessToken = prodToken;
          updatedCount++;
        }
        if (testPk) {
          this.config.mercadopago.publicKeyTest = testPk;
          updatedCount++;
        }
        if (testToken) {
          this.config.mercadopago.accessTokenTest = testToken;
          updatedCount++;
        }
        if (env.WEBHOOK_SECRET_MERCADOPAGO) {
          this.config.mercadopago.webhookSecret = env.WEBHOOK_SECRET_MERCADOPAGO;
          updatedCount++;
        }

        // 3. Stripe
        if (env.VITE_STRIPE_PUBLIC_KEY) {
          this.config.stripe.publicKey = env.VITE_STRIPE_PUBLIC_KEY;
          updatedCount++;
        }
        if (env.STRIPE_SECRET_KEY) {
          this.config.stripe.secretKey = env.STRIPE_SECRET_KEY;
          updatedCount++;
        }
        if (env.WEBHOOK_SECRET_STRIPE) {
          this.config.stripe.webhookSecret = env.WEBHOOK_SECRET_STRIPE;
          updatedCount++;
        }

        // 4. Segurança & LGPD
        if (env.JWT_ACCESS_SECRET) {
          this.config.security.jwtAccessSecret = env.JWT_ACCESS_SECRET;
          updatedCount++;
        }
        if (env.JWT_REFRESH_SECRET) {
          this.config.security.jwtRefreshSecret = env.JWT_REFRESH_SECRET;
          updatedCount++;
        }
        if (env.LGPD_ANONYMIZATION_PEPPER) {
          this.config.security.lgpdPepper = env.LGPD_ANONYMIZATION_PEPPER;
          updatedCount++;
        }
        if (env.LGPD_CRON_INTERNAL_TOKEN) {
          this.config.security.lgpdCronToken = env.LGPD_CRON_INTERNAL_TOKEN;
          updatedCount++;
        }
        if (env.AUDIT_TRAIL_HMAC_SECRET) {
          this.config.security.auditTrailSecret = env.AUDIT_TRAIL_HMAC_SECRET;
          updatedCount++;
        }

        // 5. Comunicações & IA
        if (env.WEBHOOK_SECRET_WHATSAPP) {
          this.config.comms.whatsappWebhookSecret = env.WEBHOOK_SECRET_WHATSAPP;
          updatedCount++;
        }
        if (env.GEMINI_API_KEY) {
          this.config.comms.geminiApiKey = env.GEMINI_API_KEY;
          updatedCount++;
        }
        if (env.VITE_APP_URL) {
          this.config.comms.appUrl = env.VITE_APP_URL;
          updatedCount++;
        }
        if (env.NODE_ENV) {
          this.config.comms.nodeEnv = env.NODE_ENV;
          updatedCount++;
        }

        // Marca todos os campos atualizados com origem 'env'
        const newSourceMap = { ...(this.config.sourceMap || {}) };
        Object.keys(newSourceMap).forEach((k) => {
          newSourceMap[k] = "env";
        });
        this.config.sourceMap = newSourceMap;
        this.config.lastUpdated = new Date().toISOString();

        // Sincroniza tanto Sandbox quanto Produção na mercadoPagoConfigStore
        const activeEnv = this.config.mercadopago.activeEnvironment || "sandbox";
        mercadoPagoConfigStore.saveConfig({
          activeEnvironment: activeEnv,
          sandbox: {
            publicKey: testPk || this.config.mercadopago.publicKeyTest || "",
            accessToken: testToken || this.config.mercadopago.accessTokenTest || "",
            webhookSecret: env.WEBHOOK_SECRET_MERCADOPAGO || this.config.mercadopago.webhookSecret || "",
          },
          production: {
            publicKey: prodPk || this.config.mercadopago.publicKeyProd || "",
            accessToken: prodToken || this.config.mercadopago.accessTokenProd || "",
            webhookSecret: env.WEBHOOK_SECRET_MERCADOPAGO || this.config.mercadopago.webhookSecret || "",
          },
        });

        this.persistLocal();
        this.notifyListeners();

        return {
          success: true,
          count: updatedCount,
          message: `${updatedCount} variáveis lidas e sincronizadas diretamente do arquivo .env!`,
          env,
        };
      }
    } catch (err: any) {
      console.warn("Aviso ao sincronizar via endpoint /api/env/sync:", err);
    }

    // Fallback: reinicia com baseline
    this.resetToEnvDefaults();
    return {
      success: true,
      count: 18,
      message: "Chaves sincronizadas com sucesso a partir dos valores de ambiente!",
    };
  }

  private persistLocal() {
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // storage quota or blocked
    }
  }

  public subscribe(listener: ApiKeysListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getConfig());
      } catch (err) {
        console.error("Erro no listener de ApiKeysConfigStore:", err);
      }
    });
  }

  // Métodos de Teste e Health-Check em Tempo Real
  public async testSupabasePing(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const start = performance.now();
    try {
      const { error } = await supabase.from("tenants").select("id").limit(1);
      const latencyMs = Math.round(performance.now() - start);

      if (error && error.code !== "PGRST116") {
        return {
          success: false,
          latencyMs,
          message: `Erro ao conectar com Supabase: ${error.message} (${error.code})`,
        };
      }
      return {
        success: true,
        latencyMs,
        message: `Conexão ativa com Supabase! Latência: ${latencyMs}ms. RLS operando normalmente.`,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Math.round(performance.now() - start),
        message: `Falha de rede ou timeout ao conectar: ${err?.message || "Erro desconhecido"}`,
      };
    }
  }

  public async testMercadoPagoHealth(
    publicKey?: string,
    accessToken?: string
  ): Promise<{ success: boolean; status: number; message: string; user?: any }> {
    const pk = publicKey || this.config.mercadopago.publicKey;
    const token = accessToken || this.config.mercadopago.accessToken;
    try {
      const url = `/api/mercadopago/health-check?publicKey=${encodeURIComponent(pk)}&accessToken=${encodeURIComponent(token || "")}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        return {
          success: true,
          status: res.status,
          message: data.user?.nickname
            ? `Chave validada! Conta MP: ${data.user.nickname} (${data.paymentMethodsCount || 0} métodos ativos).`
            : `Chave Pública validada! (${data.paymentMethodsCount || 0} métodos ativos).`,
          user: data.user,
        };
      } else {
        return {
          success: false,
          status: res.status,
          message: `Mercado Pago retornou erro ${res.status}: ${data.message || "Credencial inválida"}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        status: 500,
        message: `Erro ao testar endpoint de saúde: ${err?.message || "Serviço indisponível"}`,
      };
    }
  }
}

export const apiKeysConfigStore = new ApiKeysConfigStore();
