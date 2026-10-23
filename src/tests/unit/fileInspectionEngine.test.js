import { describe, it, expect } from "vitest";
import {
  runFullInspectionOnFile,
  runCyberSecurityFileScan,
  runArchitectureFileScan,
  runBackendFileScan,
  runFrontendFileScan,
  runDevOpsFileScan,
  runComplianceFileScan,
  runQAFileScan,
  detectFileType,
} from "../../pages/QAPanel/fileInspectionEngine";
import {
  QA_CATEGORIES,
  QA_CATEGORY_LIST,
  QA_CLASSIFICATION_METADATA,
  QA_TEST_SUITES,
} from "../../pages/QAPanel/qaSuites";

describe("QA Studio Classification & Multi-Disciplinary Squad Governance", () => {
  it("includes all requested classifications in QA_CATEGORIES", () => {
    const requiredCategories = [
      "FrontEnd",
      "Arquitetura",
      "Engenharia",
      "BackEnd",
      "DevOps",
      "CyberSecurity",
      "QA",
    ];

    requiredCategories.forEach((cat) => {
      expect(Object.values(QA_CATEGORIES)).toContain(cat);
      expect(QA_CATEGORY_LIST).toContain(cat);
    });

    expect(QA_CATEGORY_LIST).toContain("Compliance & LGPD");
    expect(QA_CATEGORY_LIST).toContain("SRE & Resiliência");
  });

  it("provides comprehensive metadata for every category", () => {
    QA_CATEGORY_LIST.forEach((cat) => {
      if (cat === QA_CATEGORIES.ALL) return;
      const meta = QA_CLASSIFICATION_METADATA[cat];
      expect(meta).toBeDefined();
      expect(meta.targetSquad).toBeDefined();
      expect(meta.roles.length).toBeGreaterThan(0);
      expect(meta.missionAndDataToAnalyze).toBeDefined();
      expect(meta.decisionCriteria).toBeDefined();
      expect(meta.defaultSla).toBeDefined();
      expect(meta.standards.length).toBeGreaterThan(0);
    });
  });

  it("assigns strict classification, squad, SLA and decision guidelines to all test suites", () => {
    QA_TEST_SUITES.forEach((suite) => {
      expect(suite.id).toBeDefined();
      expect(suite.category).toBeDefined();
      expect(suite.targetTeam).toBeDefined();
      expect(suite.severity).toMatch(/^(CRITICAL|HIGH|MEDIUM|LOW)$/);
      expect(suite.sla).toBeDefined();
      expect(suite.decisionGuideline).toBeDefined();
    });
  });

  it("executes new specialized test suites (ENG-01, QA-01, CMP-01, BAK-01, DEV-01)", async () => {
    const eng01 = QA_TEST_SUITES.find((s) => s.id === "ENG-01");
    const qa01 = QA_TEST_SUITES.find((s) => s.id === "QA-01");
    const cmp01 = QA_TEST_SUITES.find((s) => s.id === "CMP-01");
    const bak01 = QA_TEST_SUITES.find((s) => s.id === "BAK-01");
    const dev01 = QA_TEST_SUITES.find((s) => s.id === "DEV-01");

    expect(eng01).toBeDefined();
    expect(qa01).toBeDefined();
    expect(cmp01).toBeDefined();
    expect(bak01).toBeDefined();
    expect(dev01).toBeDefined();

    const [resEng, resQA, resCmp, resBak, resDev] = await Promise.all([
      eng01.run(),
      qa01.run(),
      cmp01.run(),
      bak01.run(),
      dev01.run(),
    ]);

    expect(resEng.passed).toBe(true);
    expect(resQA.passed).toBe(true);
    expect(resCmp.passed).toBe(true);
    expect(resBak.passed).toBe(true);
    expect(resDev.passed).toBe(true);
  }, 15000);
});

describe("File Inspection Engine (Multi-Stack Code Analysis)", () => {
  it("detects file types correctly from extensions", () => {
    expect(detectFileType("App.jsx").type).toBe("React Component");
    expect(detectFileType("index.ts").type).toBe("JavaScript / TypeScript");
    expect(detectFileType("styles.css").type).toBe("CSS Stylesheet");
    expect(detectFileType("index.html").type).toBe("HTML Document");
    expect(detectFileType("schema.sql").type).toBe("SQL Script / Schema");
    expect(detectFileType("data.json").type).toBe("JSON Data / Config");
    expect(detectFileType(".env").type).toBe("Environment Config");
  });

  it("detects cyber security threats (hardcoded secrets, XSS, SQLi D'Angelo, Prototype Pollution)", () => {
    const maliciousCode = `
      const key = "service_role_master_key";
      const query = "SELECT * FROM users WHERE name = '" + userName + "'";
      const html = "<div dangerouslySetInnerHTML={{ __html: unescapedInput }}></div>";
      Object.assign(target.__proto__, maliciousPayload);
    `;

    const findings = runCyberSecurityFileScan(maliciousCode, "vulnerable.js");
    expect(findings.length).toBeGreaterThanOrEqual(3);

    const ruleIds = findings.map((f) => f.ruleId);
    expect(ruleIds).toContain("SEC-FILE-01"); // Secret
    expect(ruleIds).toContain("SEC-FILE-02"); // XSS
    expect(ruleIds).toContain("SEC-FILE-03"); // SQLi
  });

  it("detects architecture violations (client-controlled tenant_id / BOLA)", () => {
    const bolaCode = `
      export function getAppointments(req, res) {
        const tenant_id = req.query.tenant_id;
        const tenantFromParams = req.params.tenant_id;
      }
    `;

    const findings = runArchitectureFileScan(bolaCode, "controller.js");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].category).toBe(QA_CATEGORIES.ARQUITETURA);
    expect(findings[0].severity).toBe("CRITICAL");
  });

  it("detects backend mass assignment vulnerabilities", () => {
    const massAssignCode = `
      async function createUser(req, res) {
        await db.from("users").insert(req.body);
      }
    `;

    const findings = runBackendFileScan(massAssignCode, "api.js");
    expect(findings.some((f) => f.ruleId === "BAK-FILE-01")).toBe(true);
  });

  it("detects frontend accessibility violations (missing img alt, button label, inline styles)", () => {
    const frontendCode = `
      export default function Header() {
        return (
          <div style={{ color: 'red' }}>
            <img src="/logo.png" />
            <button onClick={() => {}} />
          </div>
        );
      }
    `;

    const findings = runFrontendFileScan(frontendCode, "Header.jsx");
    const ruleIds = findings.map((f) => f.ruleId);
    expect(ruleIds).toContain("FRO-FILE-01"); // img without alt
    expect(ruleIds).toContain("FRO-FILE-02"); // button without aria-label
    expect(ruleIds).toContain("FRO-FILE-03"); // inline styles
  });

  it("detects DevOps build hygiene issues (console.log and debugger)", () => {
    const devOpsCode = `
      function calculateTotal() {
        console.log("Debug total");
        debugger;
        return 100;
      }
    `;

    const findings = runDevOpsFileScan(devOpsCode, "calc.js");
    const ruleIds = findings.map((f) => f.ruleId);
    expect(ruleIds).toContain("DEV-FILE-01"); // console.log
    expect(ruleIds).toContain("DEV-FILE-02"); // debugger
  });

  it("detects Compliance/LGPD violations (unmasked CPF in logs)", () => {
    const lgpdCode = `
      logger.info("Processing CPF: " + user.cpf);
    `;

    const findings = runComplianceFileScan(lgpdCode, "logger.js");
    expect(findings.some((f) => f.ruleId === "CMP-FILE-01")).toBe(true);
  });

  it("detects QA edge cases and weak equality with runQAFileScan", () => {
    const qaCode = `
      if (price == 0) {
        return free;
      }
    `;
    const findings = runQAFileScan(qaCode, "pricing.js");
    expect(findings.some((f) => f.ruleId === "QA-FILE-01")).toBe(true);
  });

  it("runs full inspection and generates complete scorecard and category breakdown", () => {
    const sampleVulnerable = `
      const key = "service_role_secret";
      const tenant = req.query.tenant_id;
      const sql = "SELECT * FROM clients WHERE name = '" + name + "'";
      console.log("CPF: " + req.body.cpf);
      debugger;
    `;

    const result = runFullInspectionOnFile(sampleVulnerable, "sample.js", { size: 500 });
    expect(result.overallScore).toBeLessThan(70);
    expect(result.status).toBe("BLOCKING_VULNERABILITIES");
    expect(result.totalFindings).toBeGreaterThanOrEqual(4);
    expect(result.categorySummary[QA_CATEGORIES.CYBERSECURITY]).toBeDefined();
    expect(result.categorySummary[QA_CATEGORIES.ARQUITETURA]).toBeDefined();
    expect(result.categorySummary[QA_CATEGORIES.DEVOPS]).toBeDefined();
  });
});
