/**
 * src/services/mercadoPagoConfigStore.ts
 *
 * Gerenciador Central de Credenciais e Ambientes da API Mercado Pago.
 * Mantém duas frentes isoladas: Credenciais de Teste (Sandbox) e Credenciais de Produção (Live).
 * Suporta chaves de teste com prefixo APP_USR- e TEST- geradas no painel Mercado Pago Developers,
 * incluindo Nº da Aplicação, User ID, Usuário de Teste, Senha e Código de Verificação.
 */

import { safeStorage } from "../utils/safeStorage";

export interface MercadoPagoCredentials {
  publicKey: string;
  accessToken: string;
  webhookSecret: string;
  appId?: string; // Nº da aplicação (ex: 6788981073517529)
  userId?: string; // User ID (ex: 3081058128)
  testUser?: string; // Usuário de teste (ex: TESTUSER4679213206535377554)
  testPassword?: string; // Senha de teste (ex: 77xOpUPGzn)
  verificationCode?: string; // Código de verificação (ex: 058128)
  collectorId?: string;
}

export interface MercadoPagoFullSettings {
  isEnabled: boolean; // Chave mestre de Ativar/Desativar integração
  activeEnvironment: "sandbox" | "production"; // Chave seletora de Ambiente
  sandbox: MercadoPagoCredentials;
  production: MercadoPagoCredentials;
  autoApproveTestPayments?: boolean;
}

const STORAGE_KEY = "mp_saas_credentials_v3";

// Credenciais de teste reais fornecidas pelo usuário do painel Mercado Pago Developers
const DEFAULT_CONFIG: MercadoPagoFullSettings = {
  isEnabled: true,
  activeEnvironment: "sandbox", // Inicia em modo de teste
  sandbox: {
    publicKey: "APP_USR-6829f043-ccd3-4a53-b255-362262d12298",
    accessToken: "APP_USR-6788981073517529-100112-2214f7e89e7b15899685be864851edcc-3081058128",
    webhookSecret: "whsec_test_8f4a7c1b5e39d20a46f8271035cb",
    appId: "6788981073517529",
    userId: "3081058128",
    testUser: "TESTUSER4679213206535377554",
    testPassword: "77xOpUPGzn",
    verificationCode: "058128",
  },
  production: {
    publicKey: "APP_USR-5ac54098-969a-4315-aa30-04d5faa9d008",
    accessToken: "APP_USR-2637365150905441-100112-0937d7feec6bfdfe0c37c65c7636acdf-648721800",
    webhookSecret: "whsec_prod_99ab7c1b5e39d20a46f8271035ef",
    appId: "7050222041",
    userId: "",
    testUser: "",
    testPassword: "",
    verificationCode: "",
  },
  autoApproveTestPayments: true,
};

type ConfigListener = (config: MercadoPagoFullSettings) => void;

class MercadoPagoConfigStore {
  private config: MercadoPagoFullSettings;
  private listeners: Set<ConfigListener> = new Set();

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): MercadoPagoFullSettings {
    try {
      const stored = safeStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          sandbox: { ...DEFAULT_CONFIG.sandbox, ...(parsed.sandbox || {}) },
          production: { ...DEFAULT_CONFIG.production, ...(parsed.production || {}) },
        };
      }
    } catch {
      // Fallback em caso de erro de parsing
    }
    return { ...DEFAULT_CONFIG };
  }

  public saveConfig(newConfig: Partial<MercadoPagoFullSettings>) {
    this.config = {
      ...this.config,
      ...newConfig,
      sandbox: {
        ...this.config.sandbox,
        ...(newConfig.sandbox || {}),
      },
      production: {
        ...this.config.production,
        ...(newConfig.production || {}),
      },
    };

    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Silencioso
    }

    this.notify();
  }

  public getConfig(): MercadoPagoFullSettings {
    return { ...this.config };
  }

  public getActiveCredentials(): MercadoPagoCredentials {
    return this.config.activeEnvironment === "production"
      ? { ...this.config.production }
      : { ...this.config.sandbox };
  }

  public setEnvironment(env: "sandbox" | "production") {
    this.saveConfig({ activeEnvironment: env });
  }

  public setIsEnabled(enabled: boolean) {
    this.saveConfig({ isEnabled: enabled });
  }

  public subscribe(listener: ConfigListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.getConfig());
      } catch (err) {
        console.error("Erro no listener de config MP:", err);
      }
    });
  }

  /**
   * Validação de formato das credenciais.
   * Suporta o formato moderno de credenciais do Mercado Pago onde tanto chaves de teste
   * quanto de produção utilizam o prefixo APP_USR- (ou TEST-).
   */
  public validateCredentials(env: "sandbox" | "production", creds: MercadoPagoCredentials): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const pk = (creds.publicKey || "").trim();
    const token = (creds.accessToken || "").trim();

    if (!pk) {
      errors.push("Chave Pública (Public Key) é obrigatória.");
    }
    if (!token) {
      errors.push("Token de Acesso (Access Token) é obrigatório.");
    }

    // Validação de formato oficial do Mercado Pago (APP_USR- ou TEST-)
    if (pk && !pk.startsWith("APP_USR-") && !pk.startsWith("TEST-")) {
      warnings.push("Formato de chave: Geralmente as chaves do Mercado Pago Developers iniciam com 'APP_USR-' ou 'TEST-'. Verifique se copiou a chave completa.");
    }

    if (token && !token.startsWith("APP_USR-") && !token.startsWith("TEST-")) {
      warnings.push("Formato de token: Geralmente os Access Tokens do Mercado Pago iniciam com 'APP_USR-' ou 'TEST-'.");
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }
}

export const mercadoPagoConfigStore = new MercadoPagoConfigStore();
