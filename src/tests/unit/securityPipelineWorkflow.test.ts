import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateSecurityWorkflowYaml,
  evaluateDevSecOpsQualityGate,
  type SecurityVulnerability,
} from '../../security/cicdSecurityScanner';

describe('Prompt 24: Pipeline de CI/CD Seguro (SAST e Secret Scanning)', () => {
  const workflowPath = path.resolve(process.cwd(), '.github/workflows/security.yml');

  it('1. Deve existir o arquivo de workflow .github/workflows/security.yml', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  it('2. O workflow deve conter todas as ferramentas requeridas (Gitleaks/TruffleHog, Semgrep/SonarCloud, npm audit/Snyk)', () => {
    const yamlContent = fs.readFileSync(workflowPath, 'utf-8');
    const validation = validateSecurityWorkflowYaml(yamlContent);

    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
    expect(validation.featuresDetected.hasPullRequestTrigger).toBe(true);
    expect(validation.featuresDetected.hasGitleaks).toBe(true);
    expect(validation.featuresDetected.hasTruffleHog).toBe(true);
    expect(validation.featuresDetected.hasSemgrep).toBe(true);
    expect(validation.featuresDetected.hasSonarCloud).toBe(true);
    expect(validation.featuresDetected.hasNpmAudit).toBe(true);
    expect(validation.featuresDetected.hasSnyk).toBe(true);
    expect(validation.featuresDetected.hasStrictMergeGate).toBe(true);
  });

  it('3. Deve existir arquivo de configuração do Gitleaks (.gitleaks.toml)', () => {
    const gitleaksPath = path.resolve(process.cwd(), '.gitleaks.toml');
    expect(fs.existsSync(gitleaksPath)).toBe(true);
    const content = fs.readFileSync(gitleaksPath, 'utf-8');
    expect(content).toContain('Gitleaks');
  });

  it('4. O motor de Quality Gate deve bloquear o merge caso vulnerabilidades de severidade CRITICAL ou HIGH sejam encontradas', () => {
    const findingsWithCritical: SecurityVulnerability[] = [
      {
        id: 'SEC-001',
        source: 'Gitleaks',
        type: 'SECRET_LEAK',
        severity: 'CRITICAL',
        message: 'AWS Access Key ID detectada no arquivo de config',
        remediation: 'Remover credencial e rotacionar no IAM',
      },
    ];

    const resultCritical = evaluateDevSecOpsQualityGate(findingsWithCritical);
    expect(resultCritical.passed).toBe(false);
    expect(resultCritical.blockMerge).toBe(true);
    expect(resultCritical.criticalCount).toBe(1);

    const findingsWithHigh: SecurityVulnerability[] = [
      {
        id: 'SEC-002',
        source: 'Semgrep',
        type: 'SAST_CODE_SMELL',
        severity: 'HIGH',
        message: 'Possível Injeção SQL em query raw sem parametrização',
        remediation: 'Utilizar queries parametrizadas no ORM',
      },
    ];

    const resultHigh = evaluateDevSecOpsQualityGate(findingsWithHigh);
    expect(resultHigh.passed).toBe(false);
    expect(resultHigh.blockMerge).toBe(true);
    expect(resultHigh.highCount).toBe(1);
  });

  it('5. O motor de Quality Gate deve aprovar o merge caso apenas avisos de severidade LOW ou MEDIUM existam', () => {
    const findingsOnlyLowMedium: SecurityVulnerability[] = [
      {
        id: 'SEC-003',
        source: 'Semgrep',
        type: 'SAST_CODE_SMELL',
        severity: 'LOW',
        message: 'Comentário TODO deixado no código',
        remediation: 'Limpar anotações antes da release',
      },
      {
        id: 'SEC-004',
        source: 'npm-audit',
        type: 'SCA_VULNERABILITY',
        severity: 'MEDIUM',
        message: 'ReDoS não explorável em subdependência',
        remediation: 'Atualizar pacote no próximo ciclo',
      },
    ];

    const result = evaluateDevSecOpsQualityGate(findingsOnlyLowMedium);
    expect(result.passed).toBe(true);
    expect(result.blockMerge).toBe(false);
    expect(result.totalFindings).toBe(2);
    expect(result.jobs.secretScanning.passed).toBe(true);
    expect(result.jobs.sastAnalysis.passed).toBe(true);
    expect(result.jobs.dependencyAudit.passed).toBe(true);
  });
});
