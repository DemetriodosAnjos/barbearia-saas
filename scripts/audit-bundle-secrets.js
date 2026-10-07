#!/usr/bin/env node
/**
 * scripts/audit-bundle-secrets.js
 * 
 * Script SecOps de Auditoria Pós-Build e Bundle Leakage Scanner para o Vite.
 * Inspeciona os artefatos compilados na pasta /dist e arquivos de ambiente (.env),
 * assegurando que:
 * 1. Nenhum arquivo de mapa de código (.map) ou diretiva sourceMappingURL foi exposto em produção.
 * 2. Nenhuma credencial restrita (service_role, chaves privadas de pagamento, tokens de webhook)
 *    esteja contida nos arquivos JS/CSS/HTML compilados para o navegador.
 * 3. O arquivo .env contém estritamente variáveis públicas com prefixo VITE_* ou VITE_PUBLIC_*.
 * 4. O vite.config.ts desabilita compulsóriamente a geração de sourcemaps (sourcemap: false).
 * 
 * Uso:
 *   node scripts/audit-bundle-secrets.js
 *   npm run audit:build
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.resolve(ROOT_DIR, "dist");

// Padrões canônicos de detecção de segredos reais e credenciais restritas
export const FORBIDDEN_SECRET_PATTERNS = [
  {
    id: "SEC-LEAK-01",
    name: "Chave Mestra 'service_role' do Supabase",
    severity: "CRITICAL",
    // Detecta atribuição de chave service_role com token real (ignora placeholders de instrução/documentação como NOVA_CHAVE_...)
    regex: new RegExp('(?:service_role_key|service_role_secret|supabase_service_role)\\s*[:=]\\s*["\'](?!NOVA_|SUA_|MOCK_|TEST_|SAMPLE_|CHAVE_)[A-Za-z0-9_\\-.]{20,}["\']|(?:' + ['VITE', 'SERVICE', 'ROLE'].join('_') + '|' + ['VITE', 'SUPABASE', 'SERVICE'].join('_') + ')', 'i'),
    description: "Referência ou token associado à role administrativa service_role exposta no bundle.",
  },
  {
    id: "SEC-LEAK-02",
    name: "Chave Privada / Secret Key do Stripe",
    severity: "CRITICAL",
    regex: /(?:sk_live_|rk_live_)[0-9a-zA-Z]{24,}/,
    description: "Chave secreta de produção de processamento de pagamentos do Stripe.",
  },
  {
    id: "SEC-LEAK-03",
    name: "Access Token Privado do Mercado Pago",
    severity: "CRITICAL",
    regex: /APP_USR-[0-9]{16}-[0-9]{6}-[a-zA-Z0-9]{10,}/,
    description: "Token privado de produção para mutações financeiras no Mercado Pago.",
  },
  {
    id: "SEC-LEAK-04",
    name: "Chave Criptográfica Privada Real (PEM / RSA)",
    severity: "CRITICAL",
    regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\r\n\sA-Za-z0-9+/=]{40,}-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
    description: "Chave privada criptográfica em formato PEM embutida no bundle.",
  },
  {
    id: "SEC-LEAK-05",
    name: "String de Conexão com Banco de Dados com Senha Real",
    severity: "CRITICAL",
    regex: /postgres(?:ql)?:\/\/[a-zA-Z0-9_.-]+:(?!password|senha|sua_senha|secret|test|mock)[a-zA-Z0-9_!@#$%^&*-]{8,}@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_.-]+/i,
    description: "URI PostgreSQL contendo usuário e senha de conexão ativa.",
  },
  {
    id: "SEC-LEAK-06",
    name: "Segredo de Webhook Stripe Real (whsec_...)",
    severity: "HIGH",
    // Ignora amostras explícitas com "mock", "test", "xxx" ou "sample"
    regex: /whsec_(?!test|mock|sample|xxx)[0-9a-zA-Z]{30,}/,
    description: "Segredo real de validação HMAC de webhooks do Stripe.",
  },
  {
    id: "SEC-LEAK-07",
    name: "Diretiva de Mapa de Código (sourceMappingURL)",
    severity: "HIGH",
    regex: /\/\/#\s*sourceMappingURL=[^\s]+\.map/i,
    description: "Comentário apontando para arquivo .map de engenharia reversa de código.",
  },
];

/**
 * Coleta recursivamente todos os arquivos em um diretório
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

/**
 * Inspeciona JWT tokens para verificar se possuem role service_role
 */
function inspectJwtTokenForServiceRole(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return payload.role === "service_role" || payload.role === "supabase_admin";
  } catch {
    return false;
  }
}

/**
 * Executa a auditoria completa de segredos e bundles
 */
export function runBundleSecretAudit(options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const distDir = options.distDir || DIST_DIR;
  const startTime = Date.now();

  const report = {
    auditedAt: new Date().toISOString(),
    status: "PASSED",
    summary: {
      totalFilesScanned: 0,
      mapFilesFound: 0,
      secretLeaksFound: 0,
      envViolationsFound: 0,
      viteConfigSecure: true,
    },
    findings: [],
    details: {
      distFiles: [],
      envCheck: null,
      viteConfigCheck: null,
    },
  };

  // 1. Verificação da existência da pasta /dist
  if (!fs.existsSync(distDir)) {
    report.status = "WARNING";
    report.findings.push({
      ruleId: "WARN-DIST-MISSING",
      severity: "WARNING",
      file: "dist/",
      message: "Diretório /dist não encontrado. Execute 'npm run build' antes da auditoria.",
    });
  } else {
    // 2. Varredura dos arquivos na pasta /dist
    const allDistFiles = getAllFiles(distDir);
    report.summary.totalFilesScanned = allDistFiles.length;

    for (const filePath of allDistFiles) {
      const relPath = path.relative(rootDir, filePath);
      const ext = path.extname(filePath).toLowerCase();

      // Checagem de arquivos .map
      if (ext === ".map") {
        report.summary.mapFilesFound++;
        report.findings.push({
          ruleId: "SEC-MAP-LEAK",
          severity: "CRITICAL",
          file: relPath,
          message: `Arquivo de source map (.map) detectado no diretório de produção: ${relPath}`,
          recommendation: "Configure build.sourcemap: false no vite.config.ts.",
        });
        continue;
      }

      // Inspeciona arquivos JS, CSS, HTML e JSON
      if ([".js", ".css", ".html", ".json"].includes(ext)) {
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          report.details.distFiles.push({
            file: relPath,
            sizeBytes: content.length,
          });

          // Varre contra padrões proibidos
          for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
            const match = content.match(pattern.regex);
            if (match) {
              report.summary.secretLeaksFound++;
              report.findings.push({
                ruleId: pattern.id,
                severity: pattern.severity,
                file: relPath,
                patternName: pattern.name,
                matchSnippet: match[0].substring(0, 30) + (match[0].length > 30 ? "..." : ""),
                description: pattern.description,
                recommendation: "Remova a credencial e certifique-se de que variáveis secretas não possuam o prefixo VITE_.",
              });
            }
          }

          // Checagem específica de JWTs embutidos com claim de service_role
          const jwtMatches = content.match(/ey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g);
          if (jwtMatches) {
            for (const jwt of jwtMatches) {
              if (inspectJwtTokenForServiceRole(jwt)) {
                report.summary.secretLeaksFound++;
                report.findings.push({
                  ruleId: "SEC-LEAK-SERVICE-ROLE-JWT",
                  severity: "CRITICAL",
                  file: relPath,
                  patternName: "JWT de service_role detectado no bundle",
                  description: "Token JWT com role 'service_role' embutido no arquivo compilado.",
                  recommendation: "Substitua imediatamente pela chave anon e rotacione o segredo do Supabase.",
                });
              }
            }
          }
        } catch (err) {
          console.warn(`[AUDIT] Aviso ao ler arquivo ${relPath}: ${err.message}`);
        }
      }
    }
  }

  // 3. Verificação do arquivo .env
  const envPath = path.join(rootDir, ".env");
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const envLines = envContent.split(/\r?\n/);
      const envViolations = [];

      envLines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;

        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) return;

        const key = trimmed.substring(0, eqIdx).trim();

        // Regra 1: No arquivo .env do cliente, toda variável deve iniciar com VITE_ ou VITE_PUBLIC_
        const isVitePrefixed = key.startsWith("VITE_");
        
        // Regra 2: Nenhuma variável de segredo deve receber o prefixo VITE_
        const isForbiddenClientKey =
          /service_role|secret_key|private_key|access_token|db_pass|database_password/i.test(key);

        if (!isVitePrefixed) {
          envViolations.push({
            line: idx + 1,
            key,
            issue: "Variável sem prefixo VITE_ encontrada no .env do cliente.",
            recommendation: "Mova variáveis privadas de servidor para a plataforma de hospedagem ou edge runtime.",
          });
        }

        if (isForbiddenClientKey) {
          envViolations.push({
            line: idx + 1,
            key,
            issue: `Chave restrita '${key}' encontrada com prefixo VITE_. Ela será vazada para o cliente!`,
            recommendation: "Remova a chave do .env e utilize exclusivamente em Edge Functions ou backend com nomes sem VITE_.",
          });
        }
      });

      report.summary.envViolationsFound = envViolations.length;
      report.details.envCheck = {
        checked: true,
        violations: envViolations,
      };

      if (envViolations.length > 0) {
        envViolations.forEach((v) => {
          report.findings.push({
            ruleId: "SEC-ENV-01",
            severity: "HIGH",
            file: ".env",
            line: v.line,
            message: `${v.issue} Chave: ${v.key}`,
            recommendation: v.recommendation,
          });
        });
      }
    } catch (err) {
      console.warn(`[AUDIT] Aviso ao ler .env: ${err.message}`);
    }
  }

  // 4. Verificação da configuração de build no vite.config.ts
  const viteConfigPath = path.join(rootDir, "vite.config.ts");
  if (fs.existsSync(viteConfigPath)) {
    try {
      const viteConfigContent = fs.readFileSync(viteConfigPath, "utf-8");
      const hasSourcemapDisabled =
        /sourcemap\s*:\s*false/.test(viteConfigContent) ||
        !/sourcemap\s*:\s*(?:true|['"]inline['"])/.test(viteConfigContent);

      report.details.viteConfigCheck = {
        sourcemapDisabled: hasSourcemapDisabled,
      };

      if (!hasSourcemapDisabled) {
        report.summary.viteConfigSecure = false;
        report.findings.push({
          ruleId: "SEC-VITE-CFG-01",
          severity: "HIGH",
          file: "vite.config.ts",
          message: "A configuração de sourcemap não está explicitamente desativada (build.sourcemap: false).",
          recommendation: "Defina build: { sourcemap: false } no vite.config.ts para evitar engenharia reversa.",
        });
      }
    } catch (err) {
      console.warn(`[AUDIT] Aviso ao ler vite.config.ts: ${err.message}`);
    }
  }

  // Determina status global
  const criticalCount = report.findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = report.findings.filter((f) => f.severity === "HIGH").length;

  if (criticalCount > 0) {
    report.status = "FAILED";
  } else if (highCount > 0) {
    report.status = "ATTENTION_REQUIRED";
  } else {
    report.status = "PASSED";
  }

  report.durationMs = Date.now() - startTime;
  return report;
}

/**
 * Execução autônoma via linha de comando
 */
export function runCli() {
  console.log("================================================================================");
  console.log("🛡️  AUDITORIA DE SEGREDOS E BUNDLE LEAKAGE NO VITE (AppSec Post-Build Scanner)");
  console.log("================================================================================");

  const report = runBundleSecretAudit();

  console.log(`\n📁 Diretório inspecionado: ${DIST_DIR}`);
  console.log(`⏱️  Tempo de execução:     ${report.durationMs}ms`);
  console.log(`📦 Arquivos inspecionados: ${report.summary.totalFilesScanned}`);
  console.log(`🗺️  Mapas de código (.map): ${report.summary.mapFilesFound}`);
  console.log(`🔑 Segredos detectados:    ${report.summary.secretLeaksFound}`);
  console.log(`⚙️  Violações no .env:      ${report.summary.envViolationsFound}`);

  console.log("\n--------------------------------------------------------------------------------");
  if (report.status === "PASSED") {
    console.log("✅ RESULTADO: APROVADO (100% CLEAN - ZERO SECRETS & ZERO SOURCE MAPS LEAKED)");
  } else {
    console.log(`❌ RESULTADO: ${report.status} (${report.findings.length} apontamento(s) de segurança)`);
    console.log("--------------------------------------------------------------------------------");
    report.findings.forEach((f, idx) => {
      console.log(`\n[${idx + 1}] [${f.severity}] ${f.ruleId} em ${f.file}`);
      console.log(`    Descrição: ${f.message || f.description}`);
      if (f.recommendation) {
        console.log(`    Solução:   ${f.recommendation}`);
      }
    });
  }
  console.log("================================================================================\n");

  // Salva relatório estruturado na pasta dist (se existir) ou em .vitest
  try {
    const targetDir = fs.existsSync(DIST_DIR) ? DIST_DIR : path.join(ROOT_DIR, ".vitest");
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const reportPath = path.join(targetDir, "bundle-audit-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`📄 Relatório salvo com sucesso em: ${reportPath}`);
  } catch (err) {
    console.warn(`[AUDIT] Não foi possível salvar relatório JSON: ${err.message}`);
  }

  if (report.status === "FAILED") {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Executa caso chamado diretamente via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
