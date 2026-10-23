import { describe, it, expect } from "vitest";
import { QA_TEST_SUITES } from "../../pages/QAPanel/qaSuites";
import { securityAuditor } from "../../pages/QAPanel/securityAuditor";
import { chaosEngine } from "../../pages/QAPanel/chaosEngine";
import {
  maskSecret,
  maskUrl,
  FICTITIOUS_MOCK_CREDENTIALS,
} from "../../utils/security";

describe("QA Studio: Engine & Suites", () => {
  it("exports valid test suites with runnable interfaces", () => {
    expect(QA_TEST_SUITES.length).toBeGreaterThan(0);
    QA_TEST_SUITES.forEach((suite) => {
      expect(suite.id).toBeDefined();
      expect(suite.title).toBeDefined();
      expect(suite.run).toBeTypeOf("function");
    });
  });

  describe("Security Auditor & Masking Utilities", () => {
    it("audits client credentials without throwing", () => {
      const results = securityAuditor.auditClientCredentials();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it("masks secrets reliably for UI and logs", () => {
      const longSecret = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefgh123456";
      const masked = maskSecret(longSecret, 6, 4);
      expect(masked).toContain("[MASCARADO:");
      expect(masked).not.toContain("abcdefgh123456");
      expect(masked.startsWith("eyJhbG")).toBe(true);
      expect(masked.endsWith("3456")).toBe(true);

      expect(maskSecret("short")).toBe("********");
      expect(maskSecret("")).toBe("[NENHUM]");
    });

    it("masks URLs containing sensitive project identifiers", () => {
      const url = "https://njgeevywotbflikilway.supabase.co";
      const masked = maskUrl(url);
      expect(masked).toContain("njge***.supabase.co");
      expect(masked).not.toContain("njgeevywotbflikilway");
    });

    it("verifies fictitious mock credentials are dummy strings", () => {
      expect(typeof FICTITIOUS_MOCK_CREDENTIALS.SUPABASE_ANON_KEY).toBe("string");
      expect(FICTITIOUS_MOCK_CREDENTIALS.SUPABASE_ANON_KEY.length).toBeGreaterThan(0);
    });

    it("detects and escapes script tags in inputs (Item #12)", () => {
      const attack = "<script>alert('hack')</script>";
      const result = securityAuditor.testInputSanitization(attack);
      expect(result.isClean).toBe(false);
      expect(result.threatsDetected).toContain("Script Tag Injection (<script>)");
      expect(result.sanitized).not.toContain("<script>");
      expect(result.sanitized).toContain("&lt;script&gt;");
    });

    it("detects SQL injection vectors including comments and tautologies", () => {
      const sqlAttack = "' OR 1=1 --";
      const result = securityAuditor.testInputSanitization(sqlAttack);
      expect(result.isClean).toBe(false);
      expect(result.threatsDetected).toContain("Padrão de SQL Injection Clássico");
    });

    it("verifies multi-tenant isolation rules (Item #9)", () => {
      const blocked = securityAuditor.simulateTenantIsolationCheck("101", "202", "barber");
      expect(blocked.allowed).toBe(false);

      const allowedSameTenant = securityAuditor.simulateTenantIsolationCheck("101", "101", "barber");
      expect(allowedSameTenant.allowed).toBe(true);

      const superAdminBypass = securityAuditor.simulateTenantIsolationCheck("101", "202", "superadmin");
      expect(superAdminBypass.allowed).toBe(true);
    });

    it("provides the formal 4-step secret rotation and revocation protocol", () => {
      const protocol = securityAuditor.getSecretRotationProtocol();
      expect(protocol.length).toBe(4);
      expect(protocol[0].title).toContain("Revogação Imediata");
      expect(protocol[1].title).toContain("Emissão e Rotação");
      expect(protocol[2].title).toContain("Auditoria Forense");
      expect(protocol[3].title).toContain("Migração");
    });

    it("executes the SEC-05 bundle audit suite successfully", async () => {
      const sec05 = QA_TEST_SUITES.find((s) => s.id === "SEC-05");
      expect(sec05).toBeDefined();
      const runResult = await sec05.run();
      expect(runResult.passed).toBe(true);
      expect(runResult.logs.length).toBeGreaterThanOrEqual(4);
    });

    it("executes the SEC-06 input validation and mass assignment defense suite successfully", async () => {
      const sec06 = QA_TEST_SUITES.find((s) => s.id === "SEC-06");
      expect(sec06).toBeDefined();
      const runResult = await sec06.run();
      expect(runResult.passed).toBe(true);
      expect(runResult.logs.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Chaos Engine", () => {
    it("intercepts and throws when simulated offline is active (Item #14)", async () => {
      chaosEngine.updateConfig({ isSimulatedOffline: true });
      await expect(
        chaosEngine.intercept(async () => "success")
      ).rejects.toThrow("Modo Offline ativo");
      chaosEngine.reset();
    });

    it("intercepts and throws when forced 500 error is active", async () => {
      chaosEngine.updateConfig({ forceErrorMode: "500_SERVER_ERROR" });
      await expect(
        chaosEngine.intercept(async () => "success")
      ).rejects.toThrow("Erro Interno 500");
      chaosEngine.reset();
    });
  });
});
