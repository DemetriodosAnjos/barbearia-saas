import { useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import ProjectIcon from "../../components/ui/ProjectIcon";
import {
  validateDestinationUrl,
  DEFAULT_EGRESS_ALLOWLIST,
  FORBIDDEN_CIDR_RANGES,
} from "../../security/ssrfProtectionEngine";

export default function TechDocsSsrfEgressSection({ activeSubmenu = "sub-ssrf-overview", onCopyText }) {
  const [testUrl, setTestUrl] = useState("https://169.254.169.254/latest/meta-data/");
  const [simResult, setSimResult] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);

  const samplePayloads = [
    { label: "AWS IMDS Metadata", url: "https://169.254.169.254/latest/meta-data/" },
    { label: "GCP Metadata Server", url: "http://metadata.google.internal/computeMetadata/v1/" },
    { label: "Loopback Localhost", url: "http://127.0.0.1:5432" },
    { label: "Zero Network", url: "http://0.0.0.0:80" },
    { label: "IPv6 Loopback", url: "http://[::1]:8080" },
    { label: "RFC 1918 Class C", url: "http://192.168.1.1/admin" },
    { label: "RFC 1918 Class A", url: "http://10.0.0.1/status" },
    { label: "Decimal IP Evasion (127.0.0.1)", url: "http://2130706433/" },
    { label: "Mercado Pago (Válido)", url: "https://api.mercadopago.com/v1/payments" },
    { label: "Supabase (Válido)", url: "https://qjws6a4e4cnvqyyyizt365.supabase.co/rest/v1" },
  ];

  const handleTestUrl = (urlToTest) => {
    const target = urlToTest || testUrl;
    const result = validateDestinationUrl(target);
    setSimResult(result);
  };

  const getDocSummary = () => {
    return `# Resumo Técnico: Restrição de Saída de Rede & Prevenção de SSRF (CWE-918)
Data: ${new Date().toISOString()}
Padrão: OWASP Top 10 A10:2021 / NIST SP 800-53 SC-7

## 1. Controles Ativos
- Bloqueio Incondicional de Provedores Cloud IMDS (169.254.169.254 e instâncias metadata.google.internal).
- Bloqueio de Redes Locais RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).
- Bloqueio de Loopbacks e Endereços Especiais (127.0.0.0/8, ::1, 0.0.0.0/8, Multicast, CGNAT).
- Mitigação de Evasão por DNS Rebinding via resolução prévia do socket address com cache seguro.
- Egress Allowlist Restrita para tráfego HTTPS homologado (Supabase, Mercado Pago).
`;
  };

  const exportData = {
    standard: "OWASP Top 10 A10:2021 - Server-Side Request Forgery",
    timestamp: new Date().toISOString(),
    allowedDomains: DEFAULT_EGRESS_ALLOWLIST,
    forbiddenCidrs: FORBIDDEN_CIDR_RANGES,
    protectionStatus: "ENFORCED",
    testSuite: "src/tests/unit/ssrfProtectionEngine.test.ts",
  };

  return (
    <div className="space-y-6 text-neutral-200">
      {/* 27.1 VISÃO GERAL */}
      {activeSubmenu === "sub-ssrf-overview" && (
        <Card className="bg-neutral-900/90 border-neutral-800 p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <ProjectIcon name="Globe" size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                27.1 Arquitetura de Defesa contra SSRF & Egress Control
              </h3>
              <p className="text-xs text-neutral-400">
                Prevenção ativa contra falsificação de requisições no lado do servidor (CWE-918) e isolamento de tráfego de saída.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-amber-400 font-bold font-mono">01. IMDS Protection</span>
              <p className="text-neutral-400">
                Bloqueio incondicional do link-local 169.254.169.254 impedindo extração de tokens IAM e credenciais do nó de computação.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-amber-400 font-bold font-mono">02. Private IP Blocking</span>
              <p className="text-neutral-400">
                Prevenção de varreduras em redes internas RFC 1918 (bancos de dados, Redis, microserviços e switches locais).
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-amber-400 font-bold font-mono">03. Strict Allowlist</span>
              <p className="text-neutral-400">
                Comunicação externa permitida exclusivamente para domínios homologados de pagamento e banco de dados.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 27.2 VALIDAÇÃO DE IPs E CIDRs */}
      {activeSubmenu === "sub-ssrf-ip-validation" && (
        <Card className="bg-neutral-900/90 border-neutral-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ProjectIcon name="Shield" size={16} className="text-amber-400" />
            <span>27.2 Faixas de CIDRs Privados e Loopbacks Bloqueados</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
            {FORBIDDEN_CIDR_RANGES.map((cidr) => (
              <div key={cidr.name} className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                <span className="text-neutral-300 font-semibold">{cidr.name}</span>
                <span className="text-amber-400 text-[11px]">{cidr.start} - {cidr.end}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 27.3 CLOUD METADATA */}
      {activeSubmenu === "sub-ssrf-cloud-metadata" && (
        <Card className="bg-neutral-900/90 border-neutral-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ProjectIcon name="Cloud" size={16} className="text-amber-400" />
            <span>27.3 Proteção Contra Acesso a Metadados de Provedores Cloud (IMDS)</span>
          </h3>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Em instâncias AWS EC2, GCP Compute Engine e Azure VMs, serviços de metadados respondem no endereço link-local <strong>169.254.169.254</strong>. O módulo intercepta e rejeita chamadas para esse IP e seus hostnames canônicos antes de qualquer conexão de rede.
          </p>
        </Card>
      )}

      {/* 27.4 DNS REBINDING */}
      {activeSubmenu === "sub-ssrf-dns-rebinding" && (
        <Card className="bg-neutral-900/90 border-neutral-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ProjectIcon name="RefreshCw" size={16} className="text-amber-400" />
            <span>27.4 Mitigação de DNS Rebinding e Condições de Corrida (TOCTOU)</span>
          </h3>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Ataques de DNS Rebinding alteram o TTL do DNS para apontar para um IP público na primeira checagem e para um IP privado (127.0.0.1) no momento do request. O SafeFetch resolve o hostname e faz o socket connect diretamente no IP validado, impedindo a evasão.
          </p>
        </Card>
      )}

      {/* 27.5 ALLOWLIST */}
      {activeSubmenu === "sub-ssrf-allowlist" && (
        <Card className="bg-neutral-900/90 border-neutral-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ProjectIcon name="ClipboardList" size={16} className="text-amber-400" />
            <span>27.5 Allowlist de Domínios e Portas Permitidas (Egress Control)</span>
          </h3>
          <div className="space-y-2">
            {DEFAULT_EGRESS_ALLOWLIST.map((domain) => (
              <div key={domain} className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs flex justify-between">
                <span className="text-emerald-400 font-bold">{domain}</span>
                <span className="text-neutral-400 text-[10px]">Porta 443 (HTTPS)</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 27.6 TESTES E PAYLOADS */}
      {activeSubmenu === "sub-ssrf-tests-matrix" && (
        <Card className="bg-neutral-900/90 border-neutral-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ProjectIcon name="FlaskConical" size={16} className="text-amber-400" />
            <span>27.6 Matriz de Testes Automatizados (Vitest)</span>
          </h3>
          <p className="text-xs text-neutral-300">
            Suíte implementada em <code>src/tests/unit/ssrfProtectionEngine.test.ts</code> com 100% de aprovação para vetores de ataque OWASP SSRF.
          </p>
        </Card>
      )}

      {/* 27.7 SIMULADOR INTERATIVO */}
      {activeSubmenu === "sub-ssrf-interactive-simulator" && (
        <Card className="bg-neutral-900/90 border-neutral-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ProjectIcon name="Target" size={16} className="text-amber-400" />
            <span>27.7 Simulador Interativo de Egress & SSRF</span>
          </h3>

          <div className="flex flex-wrap gap-1.5 pb-2">
            {samplePayloads.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setTestUrl(p.url);
                  handleTestUrl(p.url);
                }}
                className="px-2.5 py-1 text-[11px] rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="Digite uma URL para testar proteção SSRF..."
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
            />
            <Button variant="primary" onClick={() => handleTestUrl()} className="text-xs font-bold px-4">
              Validar Saída
            </Button>
          </div>

          {simResult && (
            <div
              className={`p-3.5 rounded-xl border space-y-1.5 ${
                simResult.allowed
                  ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/20 border-rose-500/40 text-rose-300"
              }`}
            >
              <div className="flex justify-between items-center text-xs font-bold">
                <span>{simResult.allowed ? "REQUISIÇÃO PERMITIDA (EGRESS OK)" : "REQUISIÇÃO BLOQUEADA (SSRF PREVENTED)"}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">{simResult.code}</span>
              </div>
              <p className="text-xs">{simResult.reason || "URL atende a todos os critérios da allowlist e políticas de rede."}</p>
            </div>
          )}
        </Card>
      )}

      {/* 27.8 RESUMO E EXPORTAÇÃO */}
      {activeSubmenu === "sub-ssrf-compliance-export" && (
        <Card className="bg-neutral-900/90 border-neutral-800 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-white">27.8 Central de Laudos & Exportação</h3>
              <p className="text-xs text-neutral-400">Copie o resumo ou exporte laudos nos formatos PDF e JSON.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => onCopyText && onCopyText(getDocSummary(), "Resumo Técnico de SSRF & Egress")}
                className="text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <ProjectIcon name="Copy" size={12} className="text-neutral-300" />
                <span>Copiar Resumo</span>
              </Button>
              <Button variant="secondary" onClick={() => setShowPdfModal(true)} className="text-xs py-1.5 px-3 flex items-center gap-1.5">
                <ProjectIcon name="FileText" size={12} className="text-neutral-300" />
                <span>Ver PDF</span>
              </Button>
              <Button variant="primary" onClick={() => setShowJsonModal(true)} className="text-xs py-1.5 px-3 font-bold flex items-center gap-1.5">
                <ProjectIcon name="Download" size={12} className="text-neutral-950" />
                <span>Ver JSON</span>
              </Button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {getDocSummary()}
          </pre>
        </Card>
      )}

      {/* MODAL PDF */}
      {showPdfModal && (
        <Modal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)} title="Laudo Técnico: Restrição de Saída & Prevenção de SSRF">
          <div className="space-y-4 p-4 text-neutral-800 bg-white rounded-xl font-sans max-h-[75vh] overflow-y-auto">
            <h2 className="text-base font-bold text-neutral-900 border-b pb-2">Relatório de Conformidade AppSec - SSRF Prevention</h2>
            <div className="whitespace-pre-wrap font-mono text-xs text-neutral-700 bg-neutral-50 p-3 rounded border">
              {getDocSummary()}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="secondary" onClick={() => setShowPdfModal(false)} className="text-xs">Fechar</Button>
              <Button variant="primary" onClick={() => window.print()} className="text-xs font-bold flex items-center gap-1.5">
                <ProjectIcon name="Printer" size={13} className="text-neutral-950" />
                <span>Imprimir / Salvar PDF</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL JSON */}
      {showJsonModal && (
        <Modal isOpen={showJsonModal} onClose={() => setShowJsonModal(false)} title="Laudo Estruturado SSRF (JSON)">
          <div className="space-y-4 p-4 text-neutral-200 bg-neutral-900 rounded-xl font-mono text-xs max-h-[75vh] flex flex-col">
            <pre className="flex-1 overflow-auto bg-neutral-950 p-3 rounded border border-neutral-800 text-emerald-400">
              {JSON.stringify(exportData, null, 2)}
            </pre>
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <Button variant="secondary" onClick={() => setShowJsonModal(false)} className="text-xs">Fechar</Button>
              <Button
                variant="primary"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "ssrf-egress-compliance.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-xs font-bold flex items-center gap-1.5"
              >
                <ProjectIcon name="Download" size={13} className="text-neutral-950" />
                <span>Baixar JSON</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
