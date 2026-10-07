import { describe, it, expect, beforeEach } from "vitest";
import {
  softDeleteClient,
  restoreSoftDeletedClient,
  anonymizeClientFiscal,
  executeLgpdPurgeRoutine,
  resetPurgeStore,
  getInMemoryClients,
  getInMemoryAppointments,
  getInMemoryTransactions,
  computeIrreversibleHash,
  soft_delete_customer,
  getActiveCustomers,
  verifyCustomerSoftDeleteStructure,
  anonymize_customer_data,
  verifyAnonymizeCustomerDataStructure,
  purge_expired_customers,
  verifyPurgeExpiredCustomersStructure,
  simulateEdgeCronPurge,
} from "../../security/lgpdPurgeEngine";

describe("Motor de Expurgo e Anonimização de Dados (LGPD/GDPR & Fiscal CTN)", () => {
  beforeEach(() => {
    resetPurgeStore();
  });

  describe("1. Padrão de Soft-Delete (deleted_at) e Retenção Temporária", () => {
    it("deve aplicar soft-delete definindo deleted_at e janela de retenção de 30 dias", () => {
      const result = softDeleteClient("cli_active_101", 30, "Solicitação do Titular");
      expect(result.success).toBe(true);
      expect(result.client?.deleted_at).toBeDefined();
      expect(result.client?.retention_until).toBeDefined();
      expect(result.client?.deletion_reason).toBe("Solicitação do Titular");

      const clients = getInMemoryClients();
      const updated = clients.find((c) => c.id === "cli_active_101");
      expect(updated?.deleted_at).not.toBeNull();
      expect(new Date(updated!.retention_until!).getTime()).toBeGreaterThan(Date.now());
    });

    it("deve propagar o soft-delete para agendamentos agendados e pendentes do cliente", () => {
      softDeleteClient("cli_active_101", 30);
      const appointments = getInMemoryAppointments();
      const apt = appointments.find((a) => a.client_id === "cli_active_101");
      expect(apt?.deleted_at).not.toBeNull();
    });

    it("deve rejeitar aplicação redundante de soft-delete em cliente já marcado", () => {
      const first = softDeleteClient("cli_active_101", 30);
      expect(first.success).toBe(true);

      const second = softDeleteClient("cli_active_101", 30);
      expect(second.success).toBe(false);
      expect(second.message).toContain("já se encontra em período de soft-delete");
    });
  });

  describe("2. Recuperação de Dados dentro da Janela de Retenção", () => {
    it("deve restaurar com sucesso um cliente em soft-delete e reativar agendamentos", () => {
      // mariana souza está em soft-delete recente dentro da janela
      const res = restoreSoftDeletedClient("cli_soft_deleted_active_grace");
      expect(res.success).toBe(true);
      expect(res.client?.deleted_at).toBeNull();
      expect(res.client?.retention_until).toBeNull();

      const clients = getInMemoryClients();
      const restored = clients.find((c) => c.id === "cli_soft_deleted_active_grace");
      expect(restored?.deleted_at).toBeNull();
    });

    it("deve impedir restauração de registros que já sofreram anonimização irreversível", () => {
      // Anonimiza um cliente
      anonymizeClientFiscal("cli_active_101");
      
      const res = restoreSoftDeletedClient("cli_active_101");
      expect(res.success).toBe(false);
      expect(res.message).toContain("já foram irreversivelmente anonimizados");
    });
  });

  describe("3. Anonimização Irreversível de Dados para Guarda Fiscal (CTN Art. 173)", () => {
    it("deve substituir Nome e CPF por hashes irreversíveis preservando transações fiscais", () => {
      const result = anonymizeClientFiscal("cli_expired_with_fiscal", "PEPPER_SEG_2026");
      expect(result.success).toBe(true);
      expect(result.pseudonym).toMatch(/^TITULAR ANONIMIZADO LGPD #[A-F0-9]+/);
      expect(result.cpfToken).toMatch(/^ANON-CPF-[A-F0-9]+/);

      const clients = getInMemoryClients();
      const anonymizedClient = clients.find((c) => c.id === "cli_expired_with_fiscal");
      expect(anonymizedClient?.is_anonymized).toBe(true);
      expect(anonymizedClient?.name).not.toBe("Fernanda Lima");
      expect(anonymizedClient?.cpf).not.toBe("456.789.012-34");
      expect(anonymizedClient?.phone).toBe("+5500000000000");
      expect(anonymizedClient?.notes).toContain("EXPURGADOS CONFORME LGPD ART. 16");

      // Transações financeiras vinculadas devem ter snapshot anonimizado sem apagar o montante fiscal
      const txns = getInMemoryTransactions();
      const clientTxn = txns.find((t) => t.client_id === "cli_expired_with_fiscal");
      expect(clientTxn).toBeDefined();
      expect(clientTxn?.is_client_anonymized).toBe(true);
      expect(clientTxn?.amount).toBe(95.0);
      expect(clientTxn?.fiscal_invoice_code).toBe("NFS-E-2026-98124");
    });

    it("deve produzir hash determinístico e irreversível a partir da chave e salt", () => {
      const h1 = computeIrreversibleHash("123.456.789-00", "SALT_A");
      const h2 = computeIrreversibleHash("123.456.789-00", "SALT_A");
      const h3 = computeIrreversibleHash("123.456.789-00", "SALT_B");

      expect(h1).toBe(h2);
      expect(h1).not.toBe(h3);
      expect(h1.length).toBe(32);
    });
  });

  describe("4. Rotina de Expurgo (Hard-Delete em Cascata Respeitando FKs)", () => {
    it("deve executar Dry-Run sem alterar dados no banco", () => {
      const stats = executeLgpdPurgeRoutine({ dryRun: true });
      expect(stats.dryRun).toBe(true);
      expect(stats.status).toBe("COMPLETED");
      expect(stats.scannedClients).toBeGreaterThanOrEqual(2);

      // Clientes não devem ter sido removidos em dry run
      const clients = getInMemoryClients();
      expect(clients.some((c) => c.id === "cli_expired_no_fiscal")).toBe(true);
    });

    it("deve executar Hard-Delete em cascata para cliente expirado sem obrigação fiscal", () => {
      const stats = executeLgpdPurgeRoutine({ dryRun: false });
      expect(stats.status).toBe("COMPLETED");
      expect(stats.hardDeletedClients).toBe(1);
      expect(stats.cascadeDeletedAppointments).toBeGreaterThan(0);

      // Cliente sem obrigação fiscal deve ter sido expurgado definitivamente
      const clients = getInMemoryClients();
      expect(clients.some((c) => c.id === "cli_expired_no_fiscal")).toBe(false);

      // Agendamentos vinculados foram deletados em cascata (respeito a FK)
      const appointments = getInMemoryAppointments();
      expect(appointments.some((a) => a.client_id === "cli_expired_no_fiscal")).toBe(false);
    });

    it("deve anonimizar irreversivelmente cliente expirado que possua obrigação fiscal", () => {
      const stats = executeLgpdPurgeRoutine({ dryRun: false });
      expect(stats.anonymizedFiscalClients).toBe(1);

      // Cliente com nota fiscal não foi excluído fisicamente, mas anonimizado
      const clients = getInMemoryClients();
      const fiscalClient = clients.find((c) => c.id === "cli_expired_with_fiscal");
      expect(fiscalClient).toBeDefined();
      expect(fiscalClient?.is_anonymized).toBe(true);
      expect(fiscalClient?.name).toContain("TITULAR ANONIMIZADO LGPD");
      expect(fiscalClient?.cpf).toContain("ANON-CPF-");

      // Transações fiscais mantidas para cumprimento do Art. 173 do CTN
      const transactions = getInMemoryTransactions();
      const txn = transactions.find((t) => t.client_id === "cli_expired_with_fiscal");
      expect(txn?.is_client_anonymized).toBe(true);
      expect(txn?.amount).toBe(95.0);
    });

    it("NÃO deve expurgar cliente ativo nem cliente em período de retenção válido", () => {
      executeLgpdPurgeRoutine({ dryRun: false });
      const clients = getInMemoryClients();

      // Cliente ativo intacto
      const activeClient = clients.find((c) => c.id === "cli_active_101");
      expect(activeClient).toBeDefined();
      expect(activeClient?.deleted_at).toBeNull();

      // Cliente em período de graça (25 dias restantes) mantido intacto para recuperação
      const graceClient = clients.find((c) => c.id === "cli_soft_deleted_active_grace");
      expect(graceClient).toBeDefined();
      expect(graceClient?.is_anonymized).toBe(false);
    });
  });

  describe("5. Módulo 1: Estrutura de Soft-Delete no Banco de Dados (Task 1.1 & Task 1.2)", () => {
    it("Task 1.1: deve validar a estrutura DDL, índices parciais e VIEW active_customers", () => {
      const structure = verifyCustomerSoftDeleteStructure();
      expect(structure.hasDeletedAtColumn).toBe(true);
      expect(structure.hasPartialActiveIndex).toBe(true);
      expect(structure.hasPartialDeletedIndex).toBe(true);
      expect(structure.hasActiveCustomersView).toBe(true);
      expect(structure.hasStoredProcedure).toBe(true);
      expect(structure.allValid).toBe(true);
      expect(structure.details.length).toBeGreaterThanOrEqual(5);

      // Validação da VIEW active_customers
      const activeCustomers = getActiveCustomers();
      expect(activeCustomers.every((c) => c.deleted_at === null)).toBe(true);
      expect(activeCustomers.some((c) => c.id === "cli_active_101")).toBe(true);
      expect(activeCustomers.some((c) => c.id === "cli_expired_no_fiscal")).toBe(false);
    });

    it("Task 1.2: stored procedure soft_delete_customer deve atualizar deleted_at com NOW() e revogar permissões", () => {
      const res = soft_delete_customer("cli_active_101", {
        reason: "Exclusão solicitada pelo titular - revogação de acessos",
      });

      expect(res.success).toBe(true);
      expect(res.code).toBe("SOFT_DELETE_SUCCESS");
      expect(res.target_id).toBe("cli_active_101");
      expect(res.deleted_at).toBeDefined();
      expect(res.permissions_revoked).toBe(true);
      expect(res.sessions_revoked).toBe(true);
      expect(res.cancelled_appointments_count).toBeGreaterThanOrEqual(1);

      // Registro agora deve estar fora da VIEW active_customers
      const activeAfter = getActiveCustomers();
      expect(activeAfter.some((c) => c.id === "cli_active_101")).toBe(false);

      // Verificação de id não existente
      const notFoundRes = soft_delete_customer("cli_non_existent_uuid");
      expect(notFoundRes.success).toBe(false);
      expect(notFoundRes.code).toBe("CUSTOMER_NOT_FOUND");
    });
  });

  describe("6. Módulo 2: Anonimização e Mascaramento Fiscal (LGPD) - Task 2.1 (Função de Hash Irreversível)", () => {
    it("Task 2.1: deve validar a estrutura da função anonymize_customer_data com pgcrypto e sha256", () => {
      const struct = verifyAnonymizeCustomerDataStructure();
      expect(struct.hasPgcryptoExtension).toBe(true);
      expect(struct.hasFunctionSignature).toBe(true);
      expect(struct.hasSha256Digest).toBe(true);
      expect(struct.hasSecondaryDataClearing).toBe(true);
      expect(struct.hasHistoricalRecordPreservation).toBe(true);
      expect(struct.hasSecurityDefiner).toBe(true);
      expect(struct.allValid).toBe(true);
      expect(struct.details.length).toBeGreaterThanOrEqual(5);
    });

    it("Task 2.1: deve substituir Nome, E-mail e CPF por hashes irreversíveis sha256 e zerar dados secundários", () => {
      const res = anonymize_customer_data("cli_customer_orders_102");
      expect(res.success).toBe(true);
      expect(res.code).toBe("CUSTOMER_ANONYMIZED_SUCCESS");
      expect(res.target_id).toBe("cli_customer_orders_102");
      expect(res.hashed_name).toMatch(/^TITULAR_ANONIMIZADO_[A-F0-9]{16}$/);
      expect(res.hashed_email).toMatch(/^anonymized_[a-f0-9]{16}@lgpd\.fiscal\.local$/);
      expect(res.hashed_cpf).toMatch(/^HASH-CPF-[A-F0-9]{16}$/);
      expect(res.secondary_data_cleared).toBe(true);
      expect(res.phone_cleared).toBe(true);
      expect(res.address_cleared).toBe(true);
      expect(res.record_preserved).toBe(true);

      const clients = getInMemoryClients();
      const updated = clients.find((c) => c.id === "cli_customer_orders_102");
      expect(updated).toBeDefined();
      expect(updated?.name).toBe(res.hashed_name);
      expect(updated?.email).toBe(res.hashed_email);
      expect(updated?.cpf).toBe(res.hashed_cpf);
      expect(updated?.phone).toBeNull();
      expect(updated?.address).toBeNull();
      expect(updated?.is_anonymized).toBe(true);
      expect(updated?.notes).toContain("DADOS PESSOAIS E SECUNDÁRIOS EXPURGADOS");
    });

    it("Task 2.1: deve preservar o registro do cliente e integridade com histórico de notas e pedidos", () => {
      const res = anonymize_customer_data("cli_customer_orders_102");
      expect(res.success).toBe(true);
      expect(res.historical_transactions_preserved).toBeGreaterThanOrEqual(1);
      expect(res.historical_orders_preserved).toBeGreaterThanOrEqual(2);

      // Transações financeiras não são deletadas, mas marcadas para sigilo
      const txns = getInMemoryTransactions();
      const clientTxn = txns.find((t) => t.client_id === "cli_customer_orders_102");
      expect(clientTxn).toBeDefined();
      expect(clientTxn?.is_client_anonymized).toBe(true);
      expect(clientTxn?.amount).toBe(100.0);
      expect(clientTxn?.fiscal_invoice_code).toBe("NFS-E-2026-99341");

      // Pedidos históricos concluídos mantidos intactos para rastreabilidade fiscal
      const apts = getInMemoryAppointments();
      const completedOrders = apts.filter((a) => a.client_id === "cli_customer_orders_102");
      expect(completedOrders.length).toBe(2);
      expect(completedOrders.every((a) => a.status === "completed")).toBe(true);

      // Agendamento futuro pendente foi expurgado
      expect(apts.some((a) => a.client_id === "cli_customer_orders_102" && a.status === "scheduled")).toBe(false);
    });

    it("Task 2.1: deve ser idempotente em invocações subsequentes e rejeitar UUID inexistente", () => {
      // Primeira execução
      anonymize_customer_data("cli_customer_orders_102");

      // Segunda execução idempotente
      const res2 = anonymize_customer_data("cli_customer_orders_102");
      expect(res2.success).toBe(true);
      expect(res2.code).toBe("ALREADY_ANONYMIZED");
      expect(res2.message).toContain("já se encontra devidamente anonimizado");

      // ID inexistente
      const notFound = anonymize_customer_data("00000000-0000-0000-0000-000000000000");
      expect(notFound.success).toBe(false);
      expect(notFound.code).toBe("CUSTOMER_NOT_FOUND");
    });
  });

  describe("7. Módulo 3: Motor de Hard-Delete e Agendamento Automatizado (Tasks 3.1 & 3.2)", () => {
    it("Task 3.1: deve validar a estrutura da procedure PL/pgSQL purge_expired_customers", () => {
      const struct = verifyPurgeExpiredCustomersStructure();
      expect(struct.hasProcedureSignature).toBe(true);
      expect(struct.hasRetentionCutoffLogic).toBe(true);
      expect(struct.hasFiscalCheckCtn173).toBe(true);
      expect(struct.hasCascadeHardDeleteOrder).toBe(true);
      expect(struct.hasSkipLockedPessimistic).toBe(true);
      expect(struct.hasSecurityDefiner).toBe(true);
      expect(struct.hasAuditLogEntry).toBe(true);
      expect(struct.allValid).toBe(true);
      expect(struct.details.length).toBeGreaterThanOrEqual(6);
    });

    it("Task 3.1: deve executar hard-delete em cascata em clientes expirados sem obrigação fiscal", () => {
      // cli_expired_no_fiscal expirou há 35 dias (retention_days = 30) e não possui transação paga
      const res = purge_expired_customers(30);
      expect(res.success).toBe(true);
      expect(res.status).toBe("SUCCESS");
      expect(res.code).toBe("PURGE_EXPIRED_CUSTOMERS_SUCCESS");
      expect(res.hard_deleted).toBeGreaterThanOrEqual(1);
      expect(res.purged_ids).toContain("cli_expired_no_fiscal");

      // Registro pai deve ter sido expurgado fisicamente
      const clients = getInMemoryClients();
      expect(clients.some((c) => c.id === "cli_expired_no_fiscal")).toBe(false);

      // Agendamentos filhos devem ter sido excluídos em cascata respeitando Foreign Key
      const apts = getInMemoryAppointments();
      expect(apts.some((a) => a.client_id === "cli_expired_no_fiscal")).toBe(false);
    });

    it("Task 3.1: deve anonimizar dados fiscais em clientes expirados com obrigação tributária (CTN Art. 173)", () => {
      // cli_expired_with_fiscal possui transação paga com NFS-e
      const res = purge_expired_customers(30);
      expect(res.success).toBe(true);
      expect(res.anonymized_fiscal).toBeGreaterThanOrEqual(1);
      expect(res.anonymized_ids).toContain("cli_expired_with_fiscal");

      // Registro deve ser preservado para fins de guarda fiscal de 5 anos
      const clients = getInMemoryClients();
      const preserved = clients.find((c) => c.id === "cli_expired_with_fiscal");
      expect(preserved).toBeDefined();
      expect(preserved?.is_anonymized).toBe(true);
      expect(preserved?.name).toMatch(/^TITULAR_ANONIMIZADO_/);
      expect(preserved?.cpf).toMatch(/^HASH-CPF-/);
      expect(preserved?.phone).toBeNull();
      expect(preserved?.address).toBeNull();

      // Transações fiscais preservadas
      const txns = getInMemoryTransactions();
      const clientTxn = txns.find((t) => t.client_id === "cli_expired_with_fiscal");
      expect(clientTxn).toBeDefined();
      expect(clientTxn?.is_client_anonymized).toBe(true);
      expect(clientTxn?.amount).toBe(95.0);
    });

    it("Task 3.1: NÃO deve expurgar clientes ainda dentro da janela de retenção (grace period)", () => {
      // cli_soft_deleted_active_grace foi soft-deleted há 5 dias (janela 30 dias não expirou)
      purge_expired_customers(30);

      const clients = getInMemoryClients();
      const inGrace = clients.find((c) => c.id === "cli_soft_deleted_active_grace");
      expect(inGrace).toBeDefined();
      expect(inGrace?.deleted_at).not.toBeNull();
      expect(inGrace?.is_anonymized).toBe(false);
    });

    it("Task 3.2: Edge Function Cron deve rejeitar requisição sem token de autorização (SecOps 403)", () => {
      const unauthorizedRes = simulateEdgeCronPurge({
        secret: "INVALID_SECRET_TOKEN",
        expectedSecret: "LGPD_CRON_INTERNAL_TOKEN",
      });

      expect(unauthorizedRes.status).toBe(403);
      expect(unauthorizedRes.success).toBe(false);
      expect(unauthorizedRes.code).toBe("UNAUTHORIZED_CRON_TRIGGER");
      expect(unauthorizedRes.structuredLog.status).toBe("FAILED");
    });

    it("Task 3.2: Edge Function Cron deve executar com sucesso e emitir logs estruturados de auditoria", () => {
      const cronRes = simulateEdgeCronPurge({
        secret: "LGPD_CRON_INTERNAL_TOKEN",
        expectedSecret: "LGPD_CRON_INTERNAL_TOKEN",
        retention_days: 30,
        triggered_by: "PG_CRON_SCHEDULED_JOB",
      });

      expect(cronRes.status).toBe(200);
      expect(cronRes.success).toBe(true);
      expect(cronRes.code).toBe("PURGE_ROUTINE_COMPLETED");
      expect(cronRes.job_id).toBeDefined();

      // Verificação do Log Estruturado de Auditoria para Datadog/CloudWatch
      const log = cronRes.structuredLog;
      expect(log.event_type).toBe("PURGE_EXPIRED_CUSTOMERS_CRON_SUCCESS");
      expect(log.status).toBe("SUCCESS");
      expect(log.retention_days).toBe(30);
      expect(log.metrics).toBeDefined();
      expect(log.compliance).toBeDefined();
      expect(log.compliance.worm_compliant).toBe(true);
      expect(log.compliance.audit_trail_recorded).toBe(true);
    });
  });
});

