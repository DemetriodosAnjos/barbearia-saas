/**
 * cicdSecurityScanner.ts
 *
 * Módulo DevSecOps para Auditoria Automatizada de Pipeline CI/CD,
 * Varredura de Segredos (Secret Scanning), SAST (Static Application Security Testing)
 * e Análise de Composição de Software (SCA).
 */

export interface SecurityVulnerability {
  id: string;
  source: 'Gitleaks' | 'TruffleHog' | 'Semgrep' | 'SonarCloud' | 'npm-audit' | 'Snyk';
  type: 'SECRET_LEAK' | 'SAST_CODE_SMELL' | 'SCA_VULNERABILITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  file?: string;
  line?: number;
  message: string;
  remediation: string;
}

export interface PipelineAuditResult {
  passed: boolean;
  blockMerge: boolean;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  jobs: {
    secretScanning: { passed: boolean; tool: string; findings: SecurityVulnerability[] };
    sastAnalysis: { passed: boolean; tool: string; findings: SecurityVulnerability[] };
    dependencyAudit: { passed: boolean; tool: string; findings: SecurityVulnerability[] };
  };
  policyVerdict: string;
  executionTimestamp: string;
}

export const DEVSECOPS_SEVERITY_POLICY = {
  FAIL_ON: ['HIGH', 'CRITICAL'] as const,
  WARN_ON: ['MEDIUM', 'LOW'] as const,
  MERGE_GATE_STRICT: true,
};

/**
 * Validador da Estrutura Oficial do Workflow GitHub Actions
 */
export function validateSecurityWorkflowYaml(yamlContent: string): {
  valid: boolean;
  errors: string[];
  featuresDetected: {
    hasGitleaks: boolean;
    hasTruffleHog: boolean;
    hasSemgrep: boolean;
    hasSonarCloud: boolean;
    hasNpmAudit: boolean;
    hasSnyk: boolean;
    hasStrictMergeGate: boolean;
    hasPullRequestTrigger: boolean;
  };
} {
  const errors: string[] = [];

  const hasPullRequestTrigger = yamlContent.includes('pull_request:');
  const hasGitleaks = yamlContent.includes('gitleaks-action') || yamlContent.includes('Gitleaks');
  const hasTruffleHog = yamlContent.includes('trufflehog') || yamlContent.includes('TruffleHog');
  const hasSemgrep = yamlContent.includes('semgrep-action') || yamlContent.includes('Semgrep');
  const hasSonarCloud = yamlContent.includes('sonarcloud') || yamlContent.includes('SonarCloud');
  const hasNpmAudit = yamlContent.includes('npm audit') && yamlContent.includes('--audit-level=high');
  const hasSnyk = yamlContent.includes('snyk') || yamlContent.includes('Snyk');
  const hasStrictMergeGate =
    yamlContent.includes('exit 1') &&
    yamlContent.includes('needs:') &&
    (yamlContent.includes('HIGH') || yamlContent.includes('CRITICAL'));

  if (!hasPullRequestTrigger) {
    errors.push('Gatilho on.pull_request ausente no workflow.');
  }
  if (!hasGitleaks && !hasTruffleHog) {
    errors.push('Ferramenta de Secret Scanning (Gitleaks ou TruffleHog) ausente.');
  }
  if (!hasSemgrep && !hasSonarCloud) {
    errors.push('Ferramenta de SAST (Semgrep ou SonarCloud) ausente.');
  }
  if (!hasNpmAudit && !hasSnyk) {
    errors.push('Auditoria de dependências (npm audit ou Snyk) ausente.');
  }
  if (!hasStrictMergeGate) {
    errors.push('Regra de bloqueio estrito de merge (Quality Gate com exit 1) ausente.');
  }

  return {
    valid: errors.length === 0,
    errors,
    featuresDetected: {
      hasGitleaks,
      hasTruffleHog,
      hasSemgrep,
      hasSonarCloud,
      hasNpmAudit,
      hasSnyk,
      hasStrictMergeGate,
      hasPullRequestTrigger,
    },
  };
}

/**
 * Motor de Auditoria e Avaliação do Quality Gate de CI/CD
 */
export function evaluateDevSecOpsQualityGate(
  findings: SecurityVulnerability[]
): PipelineAuditResult {
  const criticalFindings = findings.filter((f) => f.severity === 'CRITICAL');
  const highFindings = findings.filter((f) => f.severity === 'HIGH');
  const mediumFindings = findings.filter((f) => f.severity === 'MEDIUM');
  const lowFindings = findings.filter((f) => f.severity === 'LOW');

  const blockMerge = criticalFindings.length > 0 || highFindings.length > 0;
  const passed = !blockMerge;

  const secretScanningFindings = findings.filter((f) => f.type === 'SECRET_LEAK');
  const sastFindings = findings.filter((f) => f.type === 'SAST_CODE_SMELL');
  const scaFindings = findings.filter((f) => f.type === 'SCA_VULNERABILITY');

  const secretJobPassed = !secretScanningFindings.some((f) =>
    ['HIGH', 'CRITICAL'].includes(f.severity)
  );
  const sastJobPassed = !sastFindings.some((f) =>
    ['HIGH', 'CRITICAL'].includes(f.severity)
  );
  const scaJobPassed = !scaFindings.some((f) =>
    ['HIGH', 'CRITICAL'].includes(f.severity)
  );

  return {
    passed,
    blockMerge,
    totalFindings: findings.length,
    criticalCount: criticalFindings.length,
    highCount: highFindings.length,
    mediumCount: mediumFindings.length,
    lowCount: lowFindings.length,
    jobs: {
      secretScanning: {
        passed: secretJobPassed,
        tool: 'Gitleaks v8.18 / TruffleHog v3.63',
        findings: secretScanningFindings,
      },
      sastAnalysis: {
        passed: sastJobPassed,
        tool: 'Semgrep CE (p/security-audit) & SonarCloud',
        findings: sastFindings,
      },
      dependencyAudit: {
        passed: scaJobPassed,
        tool: 'npm audit --audit-level=high & Snyk CLI',
        findings: scaFindings,
      },
    },
    policyVerdict: blockMerge
      ? 'FALHA DE SEGURANÇA: Vulnerabilidades de severidade Alta/Crítica detectadas. Merge bloqueado no Pull Request.'
      : 'APROVADO: Nenhuma vulnerabilidade bloqueante detectada. Código seguro para merge.',
    executionTimestamp: new Date().toISOString(),
  };
}

/**
 * Padrões de detecção rápida para simulação estática de segredos
 */
export const KNOWN_SECRET_PATTERNS = [
  { name: 'AWS Access Key ID', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g, severity: 'CRITICAL' },
  { name: 'Stripe Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/g, severity: 'CRITICAL' },
  { name: 'Mercado Pago Private Token', regex: /APP_USR-[0-9]{16}-[0-9]{6}-[a-zA-Z0-9]{32}/g, severity: 'CRITICAL' },
  { name: 'Private RSA/EC/OPENSSH Key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, severity: 'CRITICAL' },
  { name: 'Generic High-Entropy API Token', regex: /(?:api_key|access_token|secret_key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{32,}['"]/gi, severity: 'HIGH' },
];
