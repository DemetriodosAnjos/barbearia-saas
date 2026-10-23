import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TechDocsAppSec from "../../pages/QAPanel/TechDocsAppSec";

describe("TechDocsAppSec - Documentação Técnica de AppSec & Cybersecurity", () => {
  const mockTestResults = {
    "SEC-01": {
      passed: true,
      durationMs: 15,
      message: "Aprovado: Nenhuma chave administrativa exposta no bundle cliente.",
      logs: ["Log 1", "Log 2"],
    },
    "SEC-02": {
      passed: true,
      durationMs: 8,
      message: "Aprovado: Token anon válido.",
      logs: ["JWT validado"],
    },
    "SEC-07": {
      passed: false,
      durationMs: 25,
      message: "FALHA: Negação por padrão permitiu acesso não autenticado.",
      logs: ["Alerta"],
    },
  };

  it("renderiza o cabeçalho e título da documentação técnica de AppSec", () => {
    render(<TechDocsAppSec testResults={mockTestResults} />);

    expect(
      screen.getByText(/Documentação Técnica: 1\. AppSec & Cybersecurity/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Laudo Oficial & Processos/i)).toBeInTheDocument();
  });

  it("exibe badges de status para testes aprovados e testes reprovados", () => {
    render(<TechDocsAppSec testResults={mockTestResults} />);

    // Verifica badges de APROVADO e REPROVADO no DOM
    const approvedBadges = screen.getAllByText(/APROVADO/i);
    expect(approvedBadges.length).toBeGreaterThan(0);

    const failedBadges = screen.getAllByText(/REPROVADO/i);
    expect(failedBadges.length).toBeGreaterThan(0);

    // Verifica que as asserções de status foram computadas com precisão
    expect(approvedBadges.length).toBeGreaterThanOrEqual(1);
    expect(failedBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("renderiza a estrutura de navegação com menus e submenus técnicos", () => {
    render(<TechDocsAppSec testResults={mockTestResults} />);

    expect(screen.getByText(/1\. Resumo Executivo & Compliance/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Controle de Acesso & RBAC/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Injeção SQL & Caso D'Angelo/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Sanitização, XSS & Prototype/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Gestão de Segredos & Bundles/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Isolamento de Tenants, BOLA e IDOR/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Laudo Consolidado & Exportações/i)).toBeInTheDocument();
    expect(screen.getByText(/8\. Autenticação, CAPTCHA & Anti-Brute Force/i)).toBeInTheDocument();
  });

  it("permite navegar para o menu de Autenticação, CAPTCHA e Anti-Brute Force e exibe detalhes de segurança", () => {
    const customTestResults = {
      ...mockTestResults,
      "SEC-12": {
        passed: true,
        durationMs: 12,
        message: "Aprovado: Validação de CAPTCHA server-side íntegra.",
      },
      "SEC-13": {
        passed: true,
        durationMs: 15,
        message: "Aprovado: Bloqueio estrito de 15 minutos acionado na 5ª tentativa.",
      },
    };

    render(<TechDocsAppSec testResults={customTestResults} />);

    const authMenuButton = screen.getByText(/8\. Autenticação, CAPTCHA & Anti-Brute Force/i);
    fireEvent.click(authMenuButton);

    expect(
      screen.getByText(/8\. Autenticação, CAPTCHA e Anti-Brute Force \(Supabase Auth\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Pipeline de Autenticação Segura/i)).toBeInTheDocument();

    // Navega para submenu de testes SEC-12 a 15
    const testsSubmenuButton = screen.getByText(/8\.6 Evidências e Testes Automatizados/i);
    fireEvent.click(testsSubmenuButton);

    expect(screen.getByText("SEC-12")).toBeInTheDocument();
    expect(screen.getByText("SEC-13")).toBeInTheDocument();
    expect(screen.getByText("SEC-14")).toBeInTheDocument();
    expect(screen.getByText("SEC-15")).toBeInTheDocument();
  });

  it("permite navegar para o menu RBAC e exibe os testes SEC-07 e SEC-08", () => {
    render(<TechDocsAppSec testResults={mockTestResults} />);

    const rbacMenuButton = screen.getByText(/2\. Controle de Acesso & RBAC/i);
    fireEvent.click(rbacMenuButton);

    expect(
      screen.getByText(/Princípio de Negação por Padrão \(Default Deny\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Segregação Semântica: HTTP 401 vs HTTP 403/i)).toBeInTheDocument();
    expect(screen.getByText("SEC-07")).toBeInTheDocument();
    expect(screen.getByText("SEC-08")).toBeInTheDocument();
  });

  it("permite navegar para o menu de Isolamento de Tenants, BOLA e IDOR e exibe mapeamento e testes", () => {
    render(<TechDocsAppSec testResults={mockTestResults} />);

    const tenantMenuButton = screen.getByText(/6\. Isolamento de Tenants, BOLA e IDOR/i);
    fireEvent.click(tenantMenuButton);

    expect(
      screen.getByText(/Mapeamento de Rotas com Identificadores/i)
    ).toBeInTheDocument();

    const attackMatrixTabs = screen.getAllByText(/6\.2 Matriz de Ataque BOLA/i);
    fireEvent.click(attackMatrixTabs[0]);
    expect(
      screen.getByText(/Simulação de Penetration Test: Tenant A atacando Tenant B/i)
    ).toBeInTheDocument();

    const jwtTabs = screen.getAllByText(/6\.3 Defesa Estrita via JWT/i);
    fireEvent.click(jwtTabs[0]);
    expect(
      screen.getByText(/Regra de Ouro: Escopo Estritamente Derivado de auth\.uid\(\)/i)
    ).toBeInTheDocument();

    const testsTabs = screen.getAllByText(/6\.4 Testes Automatizados/i);
    fireEvent.click(testsTabs[0]);
    expect(screen.getByText("SEC-04")).toBeInTheDocument();
  });

  it("permite navegar para o menu de Injeção SQL e detalha o caso D'Angelo", () => {
    render(<TechDocsAppSec testResults={mockTestResults} />);

    const sqliMenuButton = screen.getByText(/3\. Injeção SQL & Caso D'Angelo/i);
    fireEvent.click(sqliMenuButton);

    expect(screen.getByText(/O Incidente Forense: O Nome "D'Angelo"/i)).toBeInTheDocument();
    expect(screen.getByText(/SafeQueryBuilder & Whitelist Estrita/i)).toBeInTheDocument();
  });

  it("aciona callback de cópia ao clicar em 'Copiar Resumo'", () => {
    const mockCopy = vi.fn();
    render(<TechDocsAppSec testResults={mockTestResults} onCopyText={mockCopy} />);

    const copyBtn = screen.getByText(/Copiar Resumo/i);
    fireEvent.click(copyBtn);

    expect(mockCopy).toHaveBeenCalledTimes(1);
    expect(mockCopy.mock.calls[0][0]).toContain("LAUDO TÉCNICO DE CIBERSEGURANÇA");
  });

  it("abre a modal de exportação / impressão de laudo PDF", () => {
    render(<TechDocsAppSec testResults={mockTestResults} />);

    const exportPdfBtn = screen.getByText(/Exportar PDF/i);
    fireEvent.click(exportPdfBtn);

    expect(
      screen.getByText(/Laudo Técnico de Auditoria de Cibersegurança/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Imprimir \/ Salvar como PDF/i)).toBeInTheDocument();
  });

  it("abre a modal de visualização de laudo estruturado JSON e permite copiar", () => {
    const mockCopy = vi.fn();
    render(<TechDocsAppSec testResults={mockTestResults} onCopyText={mockCopy} />);

    const viewJsonBtn = screen.getByText(/Visualizar JSON/i);
    fireEvent.click(viewJsonBtn);

    expect(
      screen.getByText(/Laudo Estruturado de Cibersegurança & AppSec \(Visualizador JSON\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/JSON de Auditoria AppSec v2\.5/i)).toBeInTheDocument();

    const copyJsonBtn = screen.getByText(/Copiar JSON/i);
    fireEvent.click(copyJsonBtn);
    expect(mockCopy).toHaveBeenCalled();
  });

  it("permite navegar para o menu de Modelagem de Ameaças & Pentest e exibe matriz STRIDE e DREAD", () => {
    render(<TechDocsAppSec testResults={mockTestResults} />);

    const threatMenuBtn = screen.getByText(/9\. Modelagem de Ameaças & Pentest/i);
    fireEvent.click(threatMenuBtn);

    expect(screen.getByText(/9\. Modelagem de Ameaças, Testes de Invasão & AppSec/i)).toBeInTheDocument();
    expect(screen.getByText(/Matriz de Modelagem de Ameaças STRIDE & Classificação DREAD/i)).toBeInTheDocument();
    expect(screen.getByText(/S - Spoofing/i)).toBeInTheDocument();
    expect(screen.getByText(/T - Tampering/i)).toBeInTheDocument();
  });

  it("permite navegar para o menu do Módulo 5 (Injeções SQLi e XSS) e exibe Tasks 5.1 e 5.2", () => {
    render(<TechDocsAppSec testResults={mockTestResults} />);

    const injectionsMenuBtn = screen.getByText(/11\. Módulo 5: Injeções \(SQLi e XSS\)/i);
    fireEvent.click(injectionsMenuBtn);

    expect(screen.getAllByText(/11\.1 Panorama de Injeções/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Task 5\.1: Remoção de SQL Manual/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Task 5\.2: Sanitizador de XSS no React/i).length).toBeGreaterThan(0);
  });

  it("permite navegar para o menu do Módulo 8 (Atomicidade & Concorrência) e rodar o benchmark ao vivo", async () => {
    const customTestResults = {
      ...mockTestResults,
      "CONC-01": {
        passed: true,
        durationMs: 9,
        message: "Aprovado: Transação serializada com sucesso! 1 aprovado e 9 conflitos.",
      },
    };

    render(<TechDocsAppSec testResults={customTestResults} />);

    const concMenuBtn = screen.getByText(/14\. Módulo 8: Atomicidade & Concorrência/i);
    fireEvent.click(concMenuBtn);

    expect(screen.getAllByText(/14\.1 Rotas Críticas & Riscos de Race Condition/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/\/api\/appointments\/book/i)).toBeInTheDocument();

    // Navega para submenu de benchmark
    const benchSubmenuBtn = screen.getByText(/14\.4 Benchmark de Concorrência Paralela/i);
    fireEvent.click(benchSubmenuBtn);

    const triggerBenchBtn = screen.getAllByText(/Disparar Benchmark ao Vivo/i)[0];
    expect(triggerBenchBtn).toBeInTheDocument();

    fireEvent.click(triggerBenchBtn);

    // Deve exibir o resultado com aprovados e conflitos
    expect(await screen.findByText(/Double Booking/i)).toBeInTheDocument();
    expect(await screen.findByText(/0 \(ZERO\)/i)).toBeInTheDocument();
  });

  it("permite navegar para o menu 15 (Trilha de Auditoria Imutável WORM), testar simulação e abrir modais de exportação", async () => {
    const mockCopy = vi.fn();
    const customTestResults = {
      ...mockTestResults,
      "SEC-21": {
        passed: true,
        durationMs: 11,
        message: "Aprovado: Tabela audit_logs imutável validada com triggers e RLS.",
      },
    };

    render(<TechDocsAppSec testResults={customTestResults} onCopyText={mockCopy} />);

    // 1. Navega para Menu 15
    const auditMenuBtn = screen.getByText(/15\. Módulo 9: Trilha de Auditoria Imutável/i);
    fireEvent.click(auditMenuBtn);

    // Submenu 15.1
    expect(screen.getByText(/15\.1 Visão Geral, Normas Regulatórias & Princípio WORM/i)).toBeInTheDocument();
    expect(screen.getByText(/LGPD \(Lei 13\.709\/18\)/i)).toBeInTheDocument();
    expect(screen.getByText(/PCI-DSS v4\.0/i)).toBeInTheDocument();

    // 2. Navega para Submenu 15.2
    const sub152Btn = screen.getByText(/15\.2 Estrutura da Tabela audit_logs/i);
    fireEvent.click(sub152Btn);
    expect(screen.getByText(/Estrutura Canônica da Tabela audit_logs/i)).toBeInTheDocument();

    // 3. Navega para Submenu 15.3
    const sub153Btn = screen.getByText(/15\.3 Triggers de Automação em Tabelas Críticas/i);
    fireEvent.click(sub153Btn);
    expect(screen.getAllByText(/Triggers de Automação em Tabelas Críticas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/public\.appointments/i).length).toBeGreaterThan(0);

    // 4. Navega para Submenu 15.4
    const sub154Btn = screen.getByText(/15\.4 Políticas RLS & Bloqueio Irrestrito/i);
    fireEvent.click(sub154Btn);
    expect(screen.getAllByText(/Políticas RLS & Bloqueio Irrestrito de UPDATE\/DELETE/i).length).toBeGreaterThan(0);

    // 5. Navega para Submenu 15.5
    const sub155Btn = screen.getByText(/15\.5 Validação no QA Studio, Simulador Interativo/i);
    fireEvent.click(sub155Btn);
    expect(screen.getAllByText("SEC-21").length).toBeGreaterThan(0);

    // Dispara simulação interativa
    const insertTriggerBtn = screen.getByText(/1\. Disparar Trigger INSERT/i);
    fireEvent.click(insertTriggerBtn);
    expect(screen.getByText(/Registro de Auditoria Gravado na Tabela/i)).toBeInTheDocument();

    // 6. Navega para Submenu 15.6 (Resumo & Exportação)
    const sub156Btn = screen.getByText(/15\.6 Resumo Técnico, Exportação/i);
    fireEvent.click(sub156Btn);
    expect(screen.getAllByText(/Resumo Técnico, Exportação \(PDF \/ JSON\) & Central de Cópia/i).length).toBeGreaterThan(0);

    // Testa botão de copiar resumo da auditoria
    const copySummaryBtn = screen.getAllByText(/Copiar Resumo/i)[0];
    fireEvent.click(copySummaryBtn);
    expect(mockCopy).toHaveBeenCalled();

    // Testa abertura do modal de visualização JSON
    const viewJsonBtns = screen.getAllByText(/Visualizar JSON/i);
    fireEvent.click(viewJsonBtns[viewJsonBtns.length - 1]);
    expect(screen.getByText(/Laudo Estruturado: Trilha de Auditoria Imutável/i)).toBeInTheDocument();

    // Fecha modal JSON
    const closeJsonBtn = screen.getByText(/Fechar Visualizador/i);
    fireEvent.click(closeJsonBtn);

    // Testa abertura do modal de exportação PDF
    const exportPdfBtns = screen.getAllByText(/Visualizar \/ Exportar PDF/i);
    fireEvent.click(exportPdfBtns[exportPdfBtns.length - 1]);
    expect(screen.getByText(/Laudo Pericial: Trilha de Auditoria Imutável \(PostgreSQL WORM - PDF \/ Impressão\)/i)).toBeInTheDocument();
  });

  it("permite navegar para o menu 21 (Validação HMAC e Idempotência de Webhooks), testar simulação e modais", () => {
    const mockCopy = vi.fn();
    render(<TechDocsAppSec testResults={mockTestResults} onCopyText={mockCopy} />);

    // 1. Clica no Menu 21
    const menu21Btn = screen.getByText(/21\. Validação HMAC e Idempotência de Webhooks/i);
    fireEvent.click(menu21Btn);

    expect(screen.getByText(/21\.1 Visão Geral & Ameaças em Webhooks de Terceiros/i)).toBeInTheDocument();

    // 2. Navega para Submenu 21.2
    const sub212Btn = screen.getAllByText(/21\.2 Middleware HMAC-SHA256/i)[0];
    fireEvent.click(sub212Btn);
    expect(screen.getAllByText(/21\.2 Middleware Criptográfico HMAC-SHA256/i).length).toBeGreaterThan(0);

    // 3. Navega para Submenu 21.3
    const sub213Btn = screen.getAllByText(/21\.3 Idempotência & Schema SQL/i)[0];
    fireEvent.click(sub213Btn);
    expect(screen.getAllByText(/21\.3 Controle de Idempotência, Schema SQL & Tabela Única/i).length).toBeGreaterThan(0);

    // 4. Navega para Submenu 21.4
    const sub214Btn = screen.getAllByText(/21\.4 Fast ACK HTTP 200\/202/i)[0];
    fireEvent.click(sub214Btn);
    expect(screen.getAllByText(/21\.4 Resposta Imediata HTTP 200\/202/i).length).toBeGreaterThan(0);

    // 5. Navega para Submenu 21.5 (Simulador)
    const sub215Btn = screen.getAllByText(/21\.5 Simulador & Suíte 35/i)[0];
    fireEvent.click(sub215Btn);
    expect(screen.getAllByText(/21\.5 Bancada Interativa de Testes & Simulador ao Vivo/i).length).toBeGreaterThan(0);

    // Dispara webhook simulado
    const triggerWhkBtn = screen.getByText(/Disparar Webhook Simulado/i);
    fireEvent.click(triggerWhkBtn);

    // 6. Navega para Submenu 21.6 (Laudo & Exportação)
    const sub216Btn = screen.getAllByText(/21\.6 Laudo & Exportação/i)[0];
    fireEvent.click(sub216Btn);
    expect(screen.getAllByText(/21\.6 Laudo Técnico de Conformidade, Cópia & Exportação/i).length).toBeGreaterThan(0);

    // Copia resumo
    const copyMdBtn = screen.getByText(/Copiar Resumo \(MD\)/i);
    fireEvent.click(copyMdBtn);
    expect(mockCopy).toHaveBeenCalled();

    // Abre modal PDF
    const pdfModalBtn = screen.getByText(/Visualizar \/ Imprimir PDF/i);
    fireEvent.click(pdfModalBtn);
    expect(screen.getAllByText(/Laudo Oficial: Validação HMAC e Idempotência de Webhooks \(PDF\)/i).length).toBeGreaterThan(0);

    // Fecha modal PDF
    const closePdfBtns = screen.getAllByText(/Fechar/i);
    fireEvent.click(closePdfBtns[closePdfBtns.length - 1]);

    // Abre modal JSON
    const jsonModalBtn = screen.getByText(/Visualizar \/ Baixar JSON/i);
    fireEvent.click(jsonModalBtn);
    expect(screen.getAllByText(/Laudo Estruturado: Validação HMAC e Idempotência de Webhooks \(Visualizador JSON\)/i).length).toBeGreaterThan(0);
  });
});
