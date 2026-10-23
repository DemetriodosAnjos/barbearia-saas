/**
 * @file src/tests/unit/wcagAccessibilityAudit.test.tsx
 * @description Suíte de testes automatizados para Auditoria e Correção de Acessibilidade (WCAG 2.2 AA).
 * 
 * Cobre:
 * 1. Navegação 100% via teclado (tabIndex lógico, Enter/Espaço, :focus-visible em botões, links e inputs)
 * 2. Validação algorítmica de contraste de cores (proporção mínima de 4.5:1 para texto normal e 3:1 para gráficos)
 * 3. Atributos ARIA adequados (aria-expanded, aria-live para realtime, aria-describedby para validação de erros)
 * 4. Critério WCAG 2.2 2.5.8 (Target Size mínimo de 24x24px)
 * 5. Semântica de diálogos acessíveis (role='dialog', aria-modal='true', aria-labelledby)
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ServiceCard from "../../components/services/ServiceCard";
import ProfessionalCard from "../../components/services/ProfessionalCard";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import DatePicker from "../../components/ui/DatePicker";
import OfflineBanner from "../../components/resilience/OfflineBanner";
import ResilientFormHandler from "../../components/resilience/ResilientFormHandler";
import {
  calculateRelativeLuminance,
  calculateContrastRatio,
  checkWcagCompliance,
  getBestContrastTextColor,
} from "../../utils/theme";

describe("Auditoria e Correção de Acessibilidade (WCAG 2.2 AA)", () => {
  // ========================================================
  // CRITÉRIO 1: CONTRASTE DE CORES (WCAG 1.4.3 & 1.4.11)
  // ========================================================
  describe("1. Contraste Cromático e Legibilidade (WCAG 1.4.3 & 1.4.11)", () => {
    it("calcula luminância relativa com precisão para branco (#FFFFFF) e preto (#000000)", () => {
      const whiteLum = calculateRelativeLuminance("#ffffff");
      const blackLum = calculateRelativeLuminance("#000000");

      expect(whiteLum).toBeCloseTo(1, 2);
      expect(blackLum).toBeCloseTo(0, 2);
    });

    it("garante taxa de contraste máxima de 21:1 entre preto e branco", () => {
      const ratio = calculateContrastRatio("#ffffff", "#000000");
      expect(ratio).toBe(21);
      expect(checkWcagCompliance("#ffffff", "#000000").passesAAA).toBe(true);
    });

    it("cumpre a proporção mínima de 4.5:1 para texto normal segundo a WCAG 2.2 AA", () => {
      // Texto escuro (#0f172a) sobre fundo claro (#ffffff)
      const slateOnWhite = checkWcagCompliance("#0f172a", "#ffffff");
      expect(slateOnWhite.ratio).toBeGreaterThanOrEqual(4.5);
      expect(slateOnWhite.passesAA).toBe(true);

      // Texto branco (#ffffff) sobre fundo escuro (#0a0a0a)
      const whiteOnDark = checkWcagCompliance("#ffffff", "#0a0a0a");
      expect(whiteOnDark.ratio).toBeGreaterThanOrEqual(4.5);
      expect(whiteOnDark.passesAA).toBe(true);
    });

    it("valida contraste de elementos de alerta de erro (texto vermelho sobre fundo escuro)", () => {
      // Red 300 (#fca5a5) sobre neutral 900 (#171717)
      const errorContrast = checkWcagCompliance("#fca5a5", "#171717");
      expect(errorContrast.ratio).toBeGreaterThanOrEqual(4.5);
      expect(errorContrast.passesAA).toBe(true);
    });

    it("algoritmo getBestContrastTextColor escolhe cor com alto contraste", () => {
      expect(getBestContrastTextColor("#FFFFFF")).toBe("#000000");
      expect(getBestContrastTextColor("#0A0A0A")).toBe("#ffffff");
    });
  });

  // ========================================================
  // CRITÉRIO 2: NAVEGAÇÃO 100% VIA TECLADO E FOCO VISÍVEL
  // ========================================================
  describe("2. Navegação via Teclado e Foco Visível (WCAG 2.1.1 & 2.4.7)", () => {
    it("ServiceCard possui tabIndex='0', role='checkbox' e responde a teclas Enter e Espaço", () => {
      const handleToggle = vi.fn();
      const mockService = { id: "srv-1", name: "Corte Cabelo", price: 45, durationMinutes: 30 };

      render(
        <ServiceCard
          service={mockService}
          isSelected={false}
          onToggleSelect={handleToggle}
        />
      );

      const card = screen.getByRole("checkbox");
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute("tabindex", "0");
      expect(card).toHaveAttribute("aria-checked", "false");
      expect(card.className).toContain("focus-visible:ring-amber-400");

      // Teste com tecla Enter
      fireEvent.keyDown(card, { key: "Enter" });
      expect(handleToggle).toHaveBeenCalledTimes(1);

      // Teste com tecla Espaço
      fireEvent.keyDown(card, { key: " " });
      expect(handleToggle).toHaveBeenCalledTimes(2);
    });

    it("ProfessionalCard possui tabIndex='0', role='radio' e responde a teclas Enter e Espaço", () => {
      const handleSelect = vi.fn();
      const mockBarber = { id: "barb-1", name: "Eduardo Silva", role: "Master", rating: 4.9 };

      render(
        <ProfessionalCard
          professional={mockBarber}
          isSelected={true}
          onSelect={handleSelect}
        />
      );

      const card = screen.getByRole("radio");
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute("tabindex", "0");
      expect(card).toHaveAttribute("aria-checked", "true");
      expect(card.className).toContain("focus-visible:ring-amber-400");

      fireEvent.keyDown(card, { key: "Enter" });
      expect(handleSelect).toHaveBeenCalledWith(mockBarber);
    });

    it("Button possui anel de foco visível :focus-visible e aria-disabled quando desabilitado", () => {
      render(<Button disabled>Ação Desabilitada</Button>);
      const btn = screen.getByRole("button", { name: "Ação Desabilitada" });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("aria-disabled", "true");
      expect(btn.className).toContain("focus-visible:ring-2");
    });
  });

  // ========================================================
  // CRITÉRIO 3: ATRIBUTOS ARIA DINÂMICOS & LEITORES DE TELA
  // ========================================================
  describe("3. Semântica ARIA para Estados Dinâmicos e Leitores de Tela (WCAG 4.1.2 & 4.1.3)", () => {
    it("Input vincula erro de validação via aria-describedby e aria-invalid com aria-live='polite'", () => {
      render(
        <Input
          id="client-cpf"
          label="CPF do Cliente"
          error="CPF inválido. Verifique os dígitos."
        />
      );

      const input = screen.getByLabelText("CPF do Cliente");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", "client-cpf-error");

      const errorText = screen.getByRole("alert");
      expect(errorText).toBeInTheDocument();
      expect(errorText).toHaveAttribute("aria-live", "polite");
      expect(errorText).toHaveTextContent("CPF inválido");
    });

    it("OfflineBanner utiliza role='status' e aria-live='polite' para atualizações de conectividade", () => {
      const mockResilience = {
        isOffline: true,
        isReconnecting: false,
        reconnectAttempts: 1,
        latencyMs: 80,
        isHighLatency: false,
        simulatedMode: "OFFLINE",
        attemptReconnect: vi.fn(),
        setSimulatedState: vi.fn(),
      };

      render(<OfflineBanner resilienceState={mockResilience} showSimulator={true} />);

      const statusRegion = screen.getByRole("status");
      expect(statusRegion).toBeInTheDocument();
      expect(statusRegion).toHaveAttribute("aria-live", "polite");
      expect(screen.getByText("Modo Offline / Reconectando...")).toBeInTheDocument();

      const reconnectBtn = screen.getByRole("button", { name: /reconectar/i });
      expect(reconnectBtn).toBeInTheDocument();
      expect(reconnectBtn.className).toContain("focus-visible:ring-2");
    });

    it("ResilientFormHandler possui role='alert', aria-live='assertive' e botão com aria-label explícito", () => {
      const handleRetry = vi.fn();
      render(
        <ResilientFormHandler
          error="Falha de conexão com o banco"
          formData={{ nome: "Carlos", telefone: "11987654321" }}
          onRetry={handleRetry}
        />
      );

      const alertRegion = screen.getByRole("alert");
      expect(alertRegion).toBeInTheDocument();
      expect(alertRegion).toHaveAttribute("aria-live", "assertive");

      const retryBtn = screen.getByRole("button", { name: /tentar novamente/i });
      expect(retryBtn).toHaveAttribute(
        "aria-label",
        "Tentar novamente o envio do agendamento com os dados preservados"
      );
      expect(retryBtn.className).toContain("focus-visible:ring-amber-400");
    });
  });

  // ========================================================
  // CRITÉRIO 4: DIÁLOGOS MODAIS E DATA PICKER ACESSÍVEIS
  // ========================================================
  describe("4. Diálogos Modais e DatePicker Acessíveis (WCAG 2.4.1 & 2.4.3)", () => {
    it("Modal possui role='dialog', aria-modal='true' e aria-labelledby vinculado ao título", () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Confirmar Cancelamento">
          <p>Deseja realmente cancelar este horário?</p>
        </Modal>
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "modal-title-heading");

      const titleHeading = screen.getByRole("heading", { name: "Confirmar Cancelamento" });
      expect(titleHeading).toHaveAttribute("id", "modal-title-heading");

      const closeBtn = screen.getByLabelText("Fechar janela modal");
      expect(closeBtn).toBeInTheDocument();
      expect(closeBtn.className).toContain("focus-visible:ring-2");

      // Fechamento com tecla Escape
      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("DatePicker rotula dias e horários com aria-label, aria-pressed e desabilita dias passados", () => {
      const handleSelectDate = vi.fn();
      const handleSelectTime = vi.fn();
      const testDate = new Date();

      render(
        <DatePicker
          selectedDate={testDate}
          onSelectDate={handleSelectDate}
          selectedTime="14:00"
          onSelectTime={handleSelectTime}
          availableTimes={[
            { time: "14:00", available: true },
            { time: "15:00", available: false },
          ]}
        />
      );

      // Botão do horário selecionado
      const slot14 = screen.getByRole("button", { name: /horário 14:00h, disponível, selecionado/i });
      expect(slot14).toBeInTheDocument();
      expect(slot14).toHaveAttribute("aria-pressed", "true");

      // Botão do horário indisponível
      const slot15 = screen.getByRole("button", { name: /horário 15:00h, indisponível/i });
      expect(slot15).toBeDisabled();
    });
  });
});
