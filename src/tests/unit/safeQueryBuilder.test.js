import { describe, it, expect, beforeEach } from "vitest";
import {
  vulnerableRawQuery,
  buildSafeParameterizedQuery,
  quoteIdentifier,
  createTestDatabase,
  executeVulnerableQuery,
  executeSafeParameterizedQuery,
  ALLOWED_TABLES,
  ALLOWED_COLUMNS,
} from "../../utils/safeQueryBuilder";

describe("Solicitação #03 - Análise de SQL Manual, Parametrização e Nomes com Apóstrofo", () => {
  let testDb;

  beforeEach(() => {
    // Inicializa banco de testes isolado com múltiplos proprietários
    testDb = createTestDatabase();
  });

  // ========================================================
  // 1. EVIDÊNCIA DE VULNERABILIDADE (ANTES DA CORREÇÃO)
  // ========================================================
  describe("Evidência de Vulnerabilidade: SQL Manual e Interpolação de Strings", () => {
    it("FALHA ANTES DA CORREÇÃO: Nome legítimo com apóstrofo (D'Angelo) quebra a sintaxe SQL com aspas desemparelhadas", () => {
      const ownerId = "barbearia_alpha";
      const legitimateClientName = "D'Angelo";

      // Gera SQL concatenado vulnerável
      const rawSql = vulnerableRawQuery(ownerId, legitimateClientName);
      
      // Evidência de string malformada gerada:
      expect(rawSql).toBe(
        "SELECT * FROM appointments WHERE tenant_id = 'barbearia_alpha' AND client_name = 'D'Angelo' ORDER BY start_time ASC"
      );

      // A execução quebra devido à aspa desemparelhada
      expect(() => executeVulnerableQuery(testDb, rawSql)).toThrow(
        /SyntaxError: unterminated quoted string/
      );
    });

    it("FALHA ANTES DA CORREÇÃO: Apóstrofo injetado altera o filtro de proprietário e vaza dados de outro tenant", () => {
      const attackingOwnerId = "barbearia_alpha";
      // Injeção de apóstrofo para burlar o tenant_id:
      const maliciousPayload = "D'Angelo' OR tenant_id = 'barbearia_beta";

      const rawSql = vulnerableRawQuery(attackingOwnerId, maliciousPayload);

      // Executa a query concatenada no banco de teste
      const leakedResults = executeVulnerableQuery(testDb, rawSql);

      // EVIDÊNCIA DE FALHA: O atacante conseguiu ler dados da barbearia_beta!
      const leakedFromBeta = leakedResults.filter(
        (row) => row.tenant_id === "barbearia_beta"
      );
      expect(leakedFromBeta.length).toBeGreaterThan(0);
      expect(leakedResults.some((row) => row.client_name === "Roberto Concorrente")).toBe(true);
    });
  });

  // ========================================================
  // 2. VALIDAÇÃO DA SOLUÇÃO PARAMETRIZADA (DEPOIS DA CORREÇÃO)
  // ========================================================
  describe("Solução Segura: Parametrização de Valores e Preservação do Filtro de Proprietário", () => {
    it("PASSA DEPOIS DA CORREÇÃO: Nomes com apóstrofo (D'Angelo, Sant'Anna) são tratados puramente como dados", () => {
      const ownerId = "barbearia_alpha";
      const clientWithApostrophe = "D'Angelo";

      const safeQuery = buildSafeParameterizedQuery(ownerId, clientWithApostrophe);

      // O texto da consulta não contém interpolação direta:
      expect(safeQuery.text).toBe(
        'SELECT * FROM "appointments" WHERE "tenant_id" = $1 AND "client_name" = $2 ORDER BY "start_time" ASC'
      );
      // Os apóstrofos e caracteres especiais ficam contidos com segurança no array de valores:
      expect(safeQuery.values).toEqual(["barbearia_alpha", "D'Angelo"]);

      // Execução no banco de teste: encontra o cliente sem erros de sintaxe
      const results = executeSafeParameterizedQuery(testDb, safeQuery);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("apt-101");
      expect(results[0].client_name).toBe("D'Angelo");
      expect(results[0].tenant_id).toBe("barbearia_alpha");
    });

    it("PASSA DEPOIS DA CORREÇÃO: Injeção de apóstrofo NÃO altera o filtro de proprietário nem vaza dados de outro tenant", () => {
      const ownerId = "barbearia_alpha";
      const maliciousInput = "D'Angelo' OR tenant_id = 'barbearia_beta";

      const safeQuery = buildSafeParameterizedQuery(ownerId, maliciousInput);

      // A consulta permanece imutável e parametrizada
      expect(safeQuery.text).toBe(
        'SELECT * FROM "appointments" WHERE "tenant_id" = $1 AND "client_name" = $2 ORDER BY "start_time" ASC'
      );
      expect(safeQuery.values[1]).toBe(maliciousInput);

      // Execução no banco de teste
      const results = executeSafeParameterizedQuery(testDb, safeQuery);

      // O filtro de proprietário foi 100% mantido! Nenhum registro de barbearia_beta foi retornado
      const leakedBeta = results.filter((r) => r.tenant_id === "barbearia_beta");
      expect(leakedBeta.length).toBe(0);
      expect(results.length).toBe(0); // Não existe cliente com esse nome literal absurdo na barbearia_alpha
    });

    it("PASSA DEPOIS DA CORREÇÃO: Busca com correspondência parcial (ILIKE) passa % nos valores parametrizados", () => {
      const ownerId = "barbearia_alpha";
      const searchTerm = "Sant'Anna";

      const safeQuery = buildSafeParameterizedQuery(ownerId, searchTerm, {
        partialMatch: true,
      });

      expect(safeQuery.text).toBe(
        'SELECT * FROM "appointments" WHERE "tenant_id" = $1 AND "client_name" ILIKE $2 ORDER BY "start_time" ASC'
      );
      // Os curingas % são incluídos no array de valores, mantendo a query segura
      expect(safeQuery.values).toEqual(["barbearia_alpha", "%Sant'Anna%"]);

      const results = executeSafeParameterizedQuery(testDb, safeQuery);
      expect(results.length).toBe(1);
      expect(results[0].client_name).toBe("Sant'Anna");
    });
  });

  // ========================================================
  // 3. DIFERENCIAÇÃO: VALORES vs IDENTIFICADORES DINÂMICOS
  // ========================================================
  describe("Diferenciação Arquitetural: Valores vs Identificadores Dinâmicos", () => {
    it("permite identificadores válidos da whitelist com citação segura de aspas duplas", () => {
      const quotedTable = quoteIdentifier("appointments", ALLOWED_TABLES);
      const quotedColumn = quoteIdentifier("client_name", ALLOWED_COLUMNS);

      expect(quotedTable).toBe('"appointments"');
      expect(quotedColumn).toBe('"client_name"');
    });

    it("bloqueia e rejeita identificadores dinâmicos não autorizados ou com tentativa de injeção", () => {
      // Tentativa de escapar de identificador com injeção SQL
      const maliciousIdentifier = 'appointments"; DROP TABLE users; --';

      expect(() =>
        quoteIdentifier(maliciousIdentifier, ALLOWED_TABLES)
      ).toThrow(/VIOLAÇÃO DE SEGURANÇA: Identificador/);

      // Coluna arbitrária não permitida
      expect(() =>
        quoteIdentifier("unauthorized_credit_card_table", ALLOWED_TABLES)
      ).toThrow(/VIOLAÇÃO DE SEGURANÇA/);
    });

    it("monta query com tabela e ordenação dinâmicas seguras", () => {
      const safeQuery = buildSafeParameterizedQuery("barbearia_alpha", null, {
        table: "clients",
        orderBy: "client_name",
        direction: "DESC",
      });

      expect(safeQuery.text).toBe(
        'SELECT * FROM "clients" WHERE "tenant_id" = $1 ORDER BY "client_name" DESC'
      );
      expect(safeQuery.values).toEqual(["barbearia_alpha"]);
    });
  });
});
