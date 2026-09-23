import { describe, it, expect } from "vitest";
import { QA_TEST_SUITES } from "../../pages/QAPanel/qaSuites";
import { securityAuditor } from "../../pages/QAPanel/securityAuditor";
import { chaosEngine } from "../../pages/QAPanel/chaosEngine";

describe("QA Studio: Engine & Suites", () => {
  it("exports valid test suites with runnable interfaces", () => {
    expect(QA_TEST_SUITES.length).toBeGreaterThan(0);
    QA_TEST_SUITES.forEach((suite) => {
      expect(suite.id).toBeDefined();
      expect(suite.title).toBeDefined();
      expect(suite.run).toBeTypeOf("function");
    });
  });

  describe("Security Auditor", () => {
    it("audits client credentials without throwing", () => {
      const results = securityAuditor.auditClientCredentials();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it("detects and escapes script tags in inputs (Item #12)", () => {
      const attack = "<script>alert('hack')</script>";
      const result = securityAuditor.testInputSanitization(attack);
      expect(result.isClean).toBe(false);
      expect(result.threatsDetected).toContain("Script Tag Injection (<script>)");
      expect(result.sanitized).not.toContain("<script>");
      expect(result.sanitized).toContain("&lt;script&gt;");
    });

    it("verifies multi-tenant isolation rules (Item #9)", () => {
      const blocked = securityAuditor.simulateTenantIsolationCheck("101", "202", "barber");
      expect(blocked.allowed).toBe(false);

      const allowedSameTenant = securityAuditor.simulateTenantIsolationCheck("101", "101", "barber");
      expect(allowedSameTenant.allowed).toBe(true);

      const superAdminBypass = securityAuditor.simulateTenantIsolationCheck("101", "202", "superadmin");
      expect(superAdminBypass.allowed).toBe(true);
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
