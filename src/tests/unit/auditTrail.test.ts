import { describe, it, expect, beforeEach } from "vitest";
import {
  recordAuditLog,
  queryAuditLogs,
  verifyAuditLogIntegrity,
  attemptIllegalAuditUpdate,
  attemptIllegalAuditDelete,
  resetAuditLogStore,
  triggerSimulatedAuditHook,
  computeAuditRecordChecksum,
} from "../../security/auditTrailEngine";

describe("Trilha de Auditoria Imutável (Audit Trail WORM & Triggers)", () => {
  beforeEach(() => {
    resetAuditLogStore();
  });

  describe("1. Estrutura Canônica da Tabela audit_logs e Campos Obrigatórios", () => {
    it("deve criar um registro de auditoria contendo todos os 8 campos obrigatórios da especificação", () => {
      const record = recordAuditLog({
        tenantId: "tenant_barbearia_central",
        userId: "user_barbeiro_01",
        action: "INSERT",
        tableName: "appointments",
        oldData: null,
        newData: {
          id: "apt_1001",
          barber_id: "barber_thiago",
          client_name: "Carlos Santos",
          booking_date: "2026-10-15",
          start_time: "14:00",
          price: 65.0,
        },
        clientIp: "200.180.45.10",
        userAgent: "BarbershopApp/2.0",
      });

      // Validação estrita dos 8 campos solicitados:
      expect(record.id).toBeDefined();
      expect(typeof record.id).toBe("string");
      expect(record.tenant_id).toBe("tenant_barbearia_central");
      expect(record.user_id).toBe("user_barbeiro_01");
      expect(record.action).toBe("INSERT");
      expect(record.table_name).toBe("appointments");
      expect(record.old_data).toBeNull();
      expect(record.new_data).toEqual({
        id: "apt_1001",
        barber_id: "barber_thiago",
        client_name: "Carlos Santos",
        booking_date: "2026-10-15",
        start_time: "14:00",
        price: 65.0,
      });
      expect(record.created_at).toBeDefined();
      expect(new Date(record.created_at).getTime()).toBeGreaterThan(0);

      // Metadados adicionais de auditoria
      expect(record.record_checksum).toBeDefined();
      expect(record.record_checksum.length).toBe(64);
    });

    it("deve rejeitar criação sem tenant_id com erro explícito de conformidade", () => {
      expect(() => {
        recordAuditLog({
          tenantId: "",
          action: "INSERT",
          tableName: "appointments",
        });
      }).toThrow(/tenant_id é campo obrigatório/i);
    });

    it("deve rejeitar ação DML fora do escopo padrão (INSERT, UPDATE, DELETE)", () => {
      expect(() => {
        recordAuditLog({
          tenantId: "tenant_alpha",
          // @ts-expect-error testando ação inválida
          action: "DROP",
          tableName: "appointments",
        });
      }).toThrow(/Ação 'DROP' inválida/i);
    });
  });

  describe("2. Triggers Automáticas em Tabelas Críticas (INSERT, UPDATE, DELETE)", () => {
    it("deve simular trigger AFTER INSERT em tabela appointments gerando log com new_data preenchido", () => {
      const log = triggerSimulatedAuditHook(
        "INSERT",
        "appointments",
        null,
        {
          id: "apt_2001",
          tenant_id: "tenant_matriz",
          user_id: "user_client_88",
          service_name: "Barba Terapia",
          price: 55.0,
        }
      );

      expect(log.action).toBe("INSERT");
      expect(log.table_name).toBe("appointments");
      expect(log.old_data).toBeNull();
      expect(log.new_data?.service_name).toBe("Barba Terapia");
      expect(log.tenant_id).toBe("tenant_matriz");
    });

    it("deve simular trigger AFTER UPDATE em tabela transactions gravando old_data e new_data para conciliação", () => {
      const oldTx = {
        id: "tx_99",
        tenant_id: "tenant_matriz",
        amount: 80.0,
        status: "pending",
      };
      const newTx = {
        id: "tx_99",
        tenant_id: "tenant_matriz",
        amount: 80.0,
        status: "paid",
        paid_at: "2026-09-25T14:30:00Z",
      };

      const log = triggerSimulatedAuditHook("UPDATE", "transactions", oldTx, newTx);

      expect(log.action).toBe("UPDATE");
      expect(log.table_name).toBe("transactions");
      expect(log.old_data?.status).toBe("pending");
      expect(log.new_data?.status).toBe("paid");
    });

    it("deve simular trigger AFTER DELETE em tabela users gravando old_data e new_data nulo para rastro forense", () => {
      const deletedUser = {
        id: "usr_555",
        tenant_id: "tenant_matriz",
        name: "Antigo Barbeiro",
        role: "barber",
      };

      const log = triggerSimulatedAuditHook("DELETE", "users", deletedUser, null);

      expect(log.action).toBe("DELETE");
      expect(log.table_name).toBe("users");
      expect(log.old_data?.name).toBe("Antigo Barbeiro");
      expect(log.new_data).toBeNull();
    });

    it("deve higienizar senhas e segredos sensíveis para proteção de privacidade LGPD", () => {
      const log = recordAuditLog({
        tenantId: "tenant_matriz",
        action: "UPDATE",
        tableName: "users",
        oldData: { id: "u1", password_hash: "$2b$12$secretHashOld", name: "User" },
        newData: { id: "u1", password_hash: "$2b$12$secretHashNew", name: "User" },
      });

      expect(log.old_data?.password_hash).toBeUndefined();
      expect(log.new_data?.password_hash).toBeUndefined();
      expect(log.new_data?.name).toBe("User");
    });
  });

  describe("3. Imutabilidade Absoluta (WORM) & Bloqueio RLS de UPDATE / DELETE", () => {
    it("deve impedir categoricamente qualquer operação de UPDATE na tabela audit_logs (Código 42501)", () => {
      const record = recordAuditLog({
        tenantId: "tenant_matriz",
        action: "INSERT",
        tableName: "appointments",
        newData: { id: "apt_300" },
      });

      expect(() => {
        attemptIllegalAuditUpdate(record.id, {
          // @ts-expect-error tentativa ilícita
          action: "DELETE",
        });
      }).toThrow(/COMPLIANCE_ERROR_42501.*IMUTÁVEL.*WORM/i);
    });

    it("deve impedir categoricamente qualquer operação de DELETE na tabela audit_logs (Código 42501)", () => {
      const record = recordAuditLog({
        tenantId: "tenant_matriz",
        action: "INSERT",
        tableName: "appointments",
        newData: { id: "apt_301" },
      });

      expect(() => {
        attemptIllegalAuditDelete(record.id);
      }).toThrow(/COMPLIANCE_ERROR_42501.*IMUTÁVEL.*WORM/i);
    });
  });

  describe("4. Isolamento Multi-Tenant e Integridade Criptográfica SHA-256", () => {
    it("deve segregar rigorosamente os logs entre tenants diferentes", () => {
      recordAuditLog({
        tenantId: "tenant_filial_sul",
        action: "INSERT",
        tableName: "appointments",
        newData: { id: "apt_sul_1" },
      });

      recordAuditLog({
        tenantId: "tenant_filial_norte",
        action: "INSERT",
        tableName: "appointments",
        newData: { id: "apt_norte_1" },
      });

      const logsSul = queryAuditLogs({ tenantId: "tenant_filial_sul" });
      const logsNorte = queryAuditLogs({ tenantId: "tenant_filial_norte" });

      expect(logsSul.length).toBe(1);
      expect(logsSul[0].tenant_id).toBe("tenant_filial_sul");

      expect(logsNorte.length).toBe(1);
      expect(logsNorte[0].tenant_id).toBe("tenant_filial_norte");
    });

    it("deve validar o selo de integridade criptográfico e detectar tentativas de adulteração", () => {
      const record = recordAuditLog({
        tenantId: "tenant_matriz",
        action: "INSERT",
        tableName: "appointments",
        newData: { id: "apt_555", price: 100.0 },
      });

      const integrity = verifyAuditLogIntegrity(record);
      expect(integrity.valid).toBe(true);
      expect(integrity.expectedChecksum).toBe(record.record_checksum);

      // Simulação de adulteração direta em cópia de objeto (violando checksum)
      const tamperedRecord = {
        ...record,
        new_data: { id: "apt_555", price: 10.0 }, // Fraude financeira
      };

      const tamperedCheck = verifyAuditLogIntegrity(tamperedRecord);
      expect(tamperedCheck.valid).toBe(false);
      expect(tamperedCheck.expectedChecksum).not.toBe(tamperedRecord.record_checksum);
    });

    it("deve gerar checksum determinístico idêntico para os mesmos inputs canônicos", () => {
      const checkA = computeAuditRecordChecksum(
        "t1",
        "u1",
        "INSERT",
        "appointments",
        null,
        { id: 1 },
        "2026-09-25T12:00:00Z"
      );
      const checkB = computeAuditRecordChecksum(
        "t1",
        "u1",
        "INSERT",
        "appointments",
        null,
        { id: 1 },
        "2026-09-25T12:00:00Z"
      );

      expect(checkA).toBe(checkB);
      expect(checkA.length).toBe(64);
    });
  });
});
