import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QANavbar from "../../pages/QAPanel/QANavbar";

describe("Component: QANavbar (Centro de Ações e Menus do QA Studio)", () => {
  const defaultProps = {
    activeTab: "test-runner",
    setActiveTab: vi.fn(),
    qaLogsSubTab: "LOGS",
    setQaLogsSubTab: vi.fn(),
    handleManualRefreshTestsData: vi.fn(),
    isRealtimeRefreshing: false,
    runAllTests: vi.fn(),
    isRunningAll: false,
    exportFullQAReport: vi.fn(),
    onResetStates: vi.fn(),
    lastRefreshTime: "10:00:00",
    totalSuitesCount: 31,
    totalIndividualTests: 243,
  };

  it("renderiza todos os botões de ação globais solicitados", () => {
    render(<QANavbar {...defaultProps} />);

    // 1. Atualizar dados dos testes
    expect(screen.getByText(/atualizar dados dos testes/i)).toBeInTheDocument();
    // 2. Executar todas as suítes
    expect(screen.getByText(/executar todas as suítes/i)).toBeInTheDocument();
    // 3. Copiar relatório geral
    expect(screen.getByText(/copiar relatório geral/i)).toBeInTheDocument();
    // 4. Resetar estados
    expect(screen.getByText(/resetar estados/i)).toBeInTheDocument();
  });

  it("chama handleManualRefreshTestsData ao clicar em 'Atualizar dados dos testes'", () => {
    const handleRefresh = vi.fn();
    render(<QANavbar {...defaultProps} handleManualRefreshTestsData={handleRefresh} />);

    fireEvent.click(screen.getByText(/atualizar dados dos testes/i));
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it("chama runAllTests ao clicar em 'Executar todas as suítes'", () => {
    const runAll = vi.fn();
    render(<QANavbar {...defaultProps} runAllTests={runAll} />);

    fireEvent.click(screen.getByText(/executar todas as suítes/i));
    expect(runAll).toHaveBeenCalledTimes(1);
  });

  it("chama exportFullQAReport ao clicar em 'Copiar relatório geral'", () => {
    const exportReport = vi.fn();
    render(<QANavbar {...defaultProps} exportFullQAReport={exportReport} />);

    fireEvent.click(screen.getByText(/copiar relatório geral/i));
    expect(exportReport).toHaveBeenCalledTimes(1);
  });

  it("chama onResetStates ao clicar em 'Resetar estados'", () => {
    const resetStates = vi.fn();
    render(<QANavbar {...defaultProps} onResetStates={resetStates} />);

    fireEvent.click(screen.getByText(/resetar estados/i));
    expect(resetStates).toHaveBeenCalledTimes(1);
  });

  it("abre o dropdown de Bancadas de Teste e permite selecionar Central de testes, Simulações e Componentes Sandbox", () => {
    const setActiveTab = vi.fn();
    render(<QANavbar {...defaultProps} setActiveTab={setActiveTab} />);

    // Clica no dropdown 'Bancadas de Teste'
    fireEvent.click(screen.getByText(/bancadas de teste/i));

    // Verifica que os submenus aparecem
    const centralBtn = screen.getAllByText(/central de testes/i);
    expect(centralBtn.length).toBeGreaterThan(0);

    const simulacoesBtn = screen.getAllByText(/simulações/i);
    expect(simulacoesBtn.length).toBeGreaterThan(0);

    const sandboxBtn = screen.getAllByText(/componentes sandbox/i);
    expect(sandboxBtn.length).toBeGreaterThan(0);

    // Clica em 'Simulações'
    fireEvent.click(simulacoesBtn[0]);
    expect(setActiveTab).toHaveBeenCalledWith("security-simulations");
  });

  it("abre o dropdown de Auditoria & Código e permite selecionar Matriz QA, Doc Técnica AppSec e Upload & Análise", () => {
    const setActiveTab = vi.fn();
    render(<QANavbar {...defaultProps} setActiveTab={setActiveTab} />);

    // Clica no dropdown 'Auditoria & Código'
    fireEvent.click(screen.getByText(/auditoria & código/i));

    const matrizBtn = screen.getAllByText(/matriz qa/i);
    expect(matrizBtn.length).toBeGreaterThan(0);

    const techDocsBtn = screen.getAllByText(/doc técnica appsec/i);
    expect(techDocsBtn.length).toBeGreaterThan(0);

    const uploadBtn = screen.getAllByText(/upload & análise/i);
    expect(uploadBtn.length).toBeGreaterThan(0);

    // Clica em 'Matriz QA'
    fireEvent.click(matrizBtn[0]);
    expect(setActiveTab).toHaveBeenCalledWith("checklist");
  });

  it("abre o dropdown de Logs & Squads e permite selecionar Console de Logs & Correções, Logs SuperAdmin e Correções / Squads", () => {
    const setActiveTab = vi.fn();
    const setQaLogsSubTab = vi.fn();
    render(
      <QANavbar
        {...defaultProps}
        setActiveTab={setActiveTab}
        setQaLogsSubTab={setQaLogsSubTab}
      />
    );

    // Clica no dropdown 'Logs & Squads'
    fireEvent.click(screen.getByText(/logs & squads/i));

    const logsBtn = screen.getByText(/logs superadmin/i);
    expect(logsBtn).toBeInTheDocument();

    const squadsBtn = screen.getByText(/correções \/ squads/i);
    expect(squadsBtn).toBeInTheDocument();

    // Clica em 'Logs SuperAdmin'
    fireEvent.click(logsBtn);
    expect(setActiveTab).toHaveBeenCalledWith("qa-logs");
    expect(setQaLogsSubTab).toHaveBeenCalledWith("LOGS");
  });

  it("permite navegação direta pelos botões de acesso rápido da barra inferior", () => {
    const setActiveTab = vi.fn();
    render(<QANavbar {...defaultProps} setActiveTab={setActiveTab} />);

    // Clica no botão direto de Doc Técnica AppSec
    const directDocBtn = screen.getAllByText(/doc técnica appsec/i);
    fireEvent.click(directDocBtn[directDocBtn.length - 1]);
    expect(setActiveTab).toHaveBeenCalledWith("tech-docs");
  });
});
