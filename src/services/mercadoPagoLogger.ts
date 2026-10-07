/**
 * src/services/mercadoPagoLogger.ts
 *
 * Console de Telemetria e Logs em Tempo Real da API Mercado Pago.
 * Registra todas as chamadas HTTP (200, 201, 400, 401, 403, 404, 422, 500)
 * para visualização imediata no Painel Super Admin sem necessidade de terminal.
 */

import { safeStorage } from "../utils/safeStorage";

export interface MercadoPagoLogEntry {
  id: string;
  timestamp: string; // ISO
  formattedTime: string; // HH:mm:ss.SSS
  environment: "sandbox" | "production";
  method: "POST" | "GET" | "PUT" | "DELETE" | "WEBHOOK";
  endpoint: string;
  statusCode: number;
  statusText: string;
  latencyMs: number;
  requestPayload?: any;
  responsePayload?: any;
  headers?: Record<string, string>;
  errorSummary?: string;
  idempotencyKey?: string;
  source: "gateway_call" | "webhook_listener" | "health_check" | "simulation";
}

type LogListener = (log: MercadoPagoLogEntry, allLogs: MercadoPagoLogEntry[]) => void;

class MercadoPagoLogger {
  private logs: MercadoPagoLogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 100;
  private readonly STORAGE_KEY = "mp_telemetry_logs_v1";

  constructor() {
    this.loadFromStorage();
    if (this.logs.length === 0) {
      this.seedInitialLogs();
    }
  }

  private loadFromStorage() {
    try {
      const saved = safeStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(0, this.maxLogs);
        }
      }
    } catch {
      // Ignora erro de storage
    }
  }

  private saveToStorage() {
    try {
      safeStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs.slice(0, 50)));
    } catch {
      // Ignora erro de storage
    }
  }

  private seedInitialLogs() {
    const now = Date.now();
    const formatTime = (ts: number) => {
      const d = new Date(ts);
      return d.toTimeString().split(" ")[0] + "." + String(d.getMilliseconds()).padStart(3, "0");
    };

    this.logs = [
      {
        id: `log_init_${now - 120000}`,
        timestamp: new Date(now - 120000).toISOString(),
        formattedTime: formatTime(now - 120000),
        environment: "sandbox",
        method: "GET",
        endpoint: "/v1/users/me",
        statusCode: 200,
        statusText: "OK",
        latencyMs: 142,
        headers: {
          "x-request-id": "req_health_check_init",
          "Authorization": "Bearer TEST-89201948-****-****",
        },
        requestPayload: null,
        responsePayload: {
          id: 184920491,
          nickname: "TEST_USER_BARBERSAAS",
          site_status: "active",
          country_id: "MLB",
          collector_id: 184920491,
        },
        source: "health_check",
        errorSummary: undefined,
      },
      {
        id: `log_init_${now - 60000}`,
        timestamp: new Date(now - 60000).toISOString(),
        formattedTime: formatTime(now - 60000),
        environment: "sandbox",
        method: "POST",
        endpoint: "/v1/payments",
        statusCode: 201,
        statusText: "Created",
        latencyMs: 285,
        idempotencyKey: "mp:pix:tenant_matriz:pro:149.90",
        headers: {
          "x-request-id": "req_pix_demo_01",
          "x-idempotency-key": "mp:pix:tenant_matriz:pro:149.90",
        },
        requestPayload: {
          transaction_amount: 149.90,
          payment_method_id: "pix",
          description: "Assinatura Mensal Plano Pro - Barbearia Vintage",
          payer: {
            email: "gestor@barbearia.com",
            first_name: "Carlos",
          },
        },
        responsePayload: {
          id: 198420194,
          status: "pending",
          status_detail: "waiting_transfer",
          payment_method_id: "pix",
          point_of_interaction: {
            transaction_data: {
              qr_code: "00020101021226840014BR.GOV.BCB.PIX2562mercadopago.com.br/qr/pay_mp_demo5204000053039865406149.905802BR5915BARBERSAAS6009SAO PAULO62070503***6304E8A2",
              ticket_url: "https://www.mercadopago.com.br/payments/198420194/ticket",
            },
          },
        },
        source: "gateway_call",
      },
    ];
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getLogs(): MercadoPagoLogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Reseta o histórico de telemetria e cria um registro limpo após o salvamento das credenciais
   */
  public resetOnCredentialsSaved(
    environment: "sandbox" | "production",
    summary?: string
  ): MercadoPagoLogEntry {
    this.logs = [];
    this.saveToStorage();

    return this.log({
      environment,
      method: "POST",
      endpoint: "/api/mercadopago/credentials/save",
      statusCode: 200,
      statusText: "OK - Credenciais Salvas & Console Resetado",
      latencyMs: 15,
      source: "simulation",
      requestPayload: {
        environment,
        action: "save_credentials_and_reset_console",
        timestamp: new Date().toISOString(),
      },
      responsePayload: {
        success: true,
        message:
          summary ||
          `Credenciais de ${environment === "production" ? "PRODUÇÃO" : "TESTE"} salvas com sucesso. Console reinicializado para novos testes.`,
      },
    });
  }

  /**
   * Reseta e purga o histórico de telemetria ao alternar de ambiente (Teste vs Produção),
   * garantindo isolamento estrito entre Sandbox e Live.
   */
  public resetOnEnvironmentSwitch(
    environment: "sandbox" | "production",
    summary?: string
  ): MercadoPagoLogEntry {
    this.logs = [];
    this.saveToStorage();

    const envLabel = environment === "production" ? "PRODUÇÃO (LIVE)" : "TESTE (SANDBOX)";
    return this.log({
      environment,
      method: "GET",
      endpoint: "/api/mercadopago/environment/switch",
      statusCode: 200,
      statusText: `Ambiente Ativado: ${envLabel}`,
      latencyMs: 10,
      source: "simulation",
      requestPayload: {
        environment,
        action: "switch_environment_and_purge_telemetry",
        timestamp: new Date().toISOString(),
      },
      responsePayload: {
        success: true,
        environment,
        message:
          summary ||
          `Ambiente alternado com sucesso para ${envLabel}. Telemetria e dados anteriores foram purgados para isolamento completo.`,
      },
    });
  }

  public log(entry: Omit<MercadoPagoLogEntry, "id" | "timestamp" | "formattedTime">): MercadoPagoLogEntry {
    const now = Date.now();
    const d = new Date(now);
    const formattedTime =
      d.toTimeString().split(" ")[0] + "." + String(d.getMilliseconds()).padStart(3, "0");

    const fullEntry: MercadoPagoLogEntry = {
      id: `mp_log_${now}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: d.toISOString(),
      formattedTime,
      ...entry,
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.saveToStorage();
    this.notifyListeners(fullEntry);
    return fullEntry;
  }

  private notifyListeners(lastEntry?: MercadoPagoLogEntry) {
    const entryToPass = lastEntry || this.logs[0] || ({} as MercadoPagoLogEntry);
    this.listeners.forEach((listener) => {
      try {
        listener(entryToPass, [...this.logs]);
      } catch (err) {
        console.error("Erro no listener de logs do Mercado Pago:", err);
      }
    });
  }
}

export const mercadoPagoLogger = new MercadoPagoLogger();
