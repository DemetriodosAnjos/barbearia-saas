/**
 * @file src/tests/unit/networkResilienceAndSkeletons.test.tsx
 * @description Suíte de testes unitários para UI de Resiliência: Latência, Offline e Realtime.
 * 
 * Cobre:
 * 1. Skeleton Screen para feedback de carregamento em requisições de alta latência (SkeletonCard, SkeletonBookingView, SkeletonDashboard)
 * 2. Indicador discreto de conexão ("Modo Offline / Reconectando...") com WebSocket Supabase Realtime (OfflineBanner, useNetworkResilience)
 * 3. Tratamento amigável de falhas de requisição com retenção de dados e botão "Tentar Novamente" (ResilientFormHandler)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SkeletonCard from "../../components/resilience/SkeletonCard";
import SkeletonBookingView from "../../components/resilience/SkeletonBookingView";
import SkeletonDashboard from "../../components/resilience/SkeletonDashboard";
import OfflineBanner from "../../components/resilience/OfflineBanner";
import ResilientFormHandler, { FormRetentionRecovery } from "../../components/resilience/ResilientFormHandler";

describe("UI de Resiliência: Skeleton Screens (Alta Latência)", () => {
  it("1.1 Deve renderizar SkeletonCard na variante 'service' com classe animate-pulse", () => {
    const { container } = render(<SkeletonCard variant="service" count={2} />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBe(2);
  });

  it("1.2 Deve renderizar SkeletonCard na variante 'barber' com estrutura de avatar e equipe", () => {
    const { container } = render(<SkeletonCard variant="barber" count={3} />);
    const avatars = container.querySelectorAll(".rounded-full.bg-neutral-800");
    expect(avatars.length).toBe(3);
  });

  it("1.3 Deve renderizar SkeletonCard na variante 'appointment' com slots de horário", () => {
    const { container } = render(<SkeletonCard variant="appointment" count={4} />);
    const cards = container.querySelectorAll(".animate-pulse");
    expect(cards.length).toBe(4);
  });

  it("1.4 Deve renderizar SkeletonCard na variante 'metric' com grid de KPIs", () => {
    const { container } = render(<SkeletonCard variant="metric" count={4} />);
    const metrics = container.querySelectorAll(".animate-pulse");
    expect(metrics.length).toBe(4);
  });

  it("1.5 Deve renderizar SkeletonBookingView espelhando a hierarquia do wizard de agendamento", () => {
    const { container } = render(<SkeletonBookingView latencyNotice={true} />);
    expect(container.textContent).toContain("Rede com alta latência detectada");
    expect(container.textContent).toContain("Modo Resiliente");
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });

  it("1.6 Deve renderizar SkeletonDashboard completo para carregamento suave de painéis analíticos", () => {
    const { container } = render(<SkeletonDashboard latencyNotice={true} />);
    expect(container.textContent).toContain("Sincronizando métricas do painel em modo resiliente");
    expect(container.textContent).toContain("Latência Alta");
  });
});

describe("UI de Resiliência: Indicador de Conexão ('Modo Offline / Reconectando...')", () => {
  it("2.1 Deve exibir 'Realtime Ativo' quando a conexão estiver normal e latência for baixa", () => {
    const mockResilience = {
      isOnline: true,
      isOffline: false,
      isWebSocketConnected: true,
      isReconnecting: false,
      reconnectAttempts: 0,
      latencyMs: 38,
      isHighLatency: false,
      simulatedMode: "NORMAL",
      attemptReconnect: vi.fn(),
      setSimulatedState: vi.fn(),
    };

    render(<OfflineBanner resilienceState={mockResilience} showSimulator={true} />);
    expect(screen.getByText("Realtime Ativo")).toBeDefined();
    expect(screen.getByText("(38ms)")).toBeDefined();
  });

  it("2.2 Deve exibir indicador discreto 'Modo Offline / Reconectando...' ao perder a rede ou desconectar o WebSocket", () => {
    const mockResilience = {
      isOnline: false,
      isOffline: true,
      isWebSocketConnected: false,
      isReconnecting: false,
      reconnectAttempts: 1,
      latencyMs: 9999,
      isHighLatency: false,
      simulatedMode: "OFFLINE",
      attemptReconnect: vi.fn(),
      setSimulatedState: vi.fn(),
    };

    render(<OfflineBanner resilienceState={mockResilience} showSimulator={true} />);
    expect(screen.getByText("Modo Offline / Reconectando...")).toBeDefined();
    expect(screen.getByText(/Sem conexão com o Supabase Realtime/i)).toBeDefined();
    expect(screen.getByText("Tentar Reconectar")).toBeDefined();
  });

  it("2.3 Deve permitir acionar a tentativa manual de reconexão ao clicar no botão", () => {
    const mockAttempt = vi.fn();
    const mockResilience = {
      isOnline: false,
      isOffline: true,
      isWebSocketConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      latencyMs: 9999,
      isHighLatency: false,
      simulatedMode: "OFFLINE",
      attemptReconnect: mockAttempt,
      setSimulatedState: vi.fn(),
    };

    render(<OfflineBanner resilienceState={mockResilience} showSimulator={true} />);
    const reconnectBtn = screen.getByText("Tentar Reconectar");
    fireEvent.click(reconnectBtn);
    expect(mockAttempt).toHaveBeenCalledTimes(1);
  });

  it("2.4 Deve alertar quando alta latência (>1200ms) for detectada", () => {
    const mockResilience = {
      isOnline: true,
      isOffline: false,
      isWebSocketConnected: true,
      isReconnecting: false,
      reconnectAttempts: 0,
      latencyMs: 2400,
      isHighLatency: true,
      simulatedMode: "HIGH_LATENCY",
      attemptReconnect: vi.fn(),
      setSimulatedState: vi.fn(),
    };

    render(<OfflineBanner resilienceState={mockResilience} showSimulator={true} />);
    expect(screen.getByText("Alta Latência Detectada")).toBeDefined();
    expect(screen.getByText(/Tempo de resposta elevado/i)).toBeDefined();
  });
});

describe("UI de Resiliência: Tratamento de Falhas com Retenção de Dados e 'Tentar Novamente'", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("3.1 Deve reter os dados preenchidos no formulário e persistir em sessionStorage", () => {
    const formData = {
      clientName: "Rodrigo Mendonça",
      clientPhone: "(11) 98765-4321",
      serviceName: "Corte Degradê + Barba",
      barberName: "Carlos Silva",
      time: "14:30",
    };

    render(
      <ResilientFormHandler
        error="Falha de conexão com a API de agendamento."
        formData={formData}
        fieldLabels={{
          clientName: "Cliente",
          clientPhone: "Telefone",
          serviceName: "Serviço",
          barberName: "Barbeiro",
          time: "Horário",
        }}
        storageKey="test_form_draft"
      />
    );

    expect(screen.getByText("Rodrigo Mendonça")).toBeDefined();
    expect(screen.getByText("(11) 98765-4321")).toBeDefined();
    expect(screen.getByText(/Fique tranquilo: todos os seus dados e seleções foram preservados!/i)).toBeDefined();

    const stored = JSON.parse(sessionStorage.getItem("test_form_draft") || "{}");
    expect(stored.data?.clientName).toBe("Rodrigo Mendonça");
  });

  it("3.2 Deve disparar onRetry retendo os dados intactos ao clicar em 'Tentar Novamente'", async () => {
    const handleRetry = vi.fn();
    const formData = {
      clientName: "Marcelo Rocha",
      clientPhone: "(11) 91234-5678",
      serviceName: "Barba Terapia",
    };

    render(
      <ResilientFormHandler
        error="Network request failed (net::ERR_CONNECTION_TIMED_OUT)"
        formData={formData}
        onRetry={handleRetry}
      />
    );

    const retryBtn = screen.getByText("Tentar Novamente");
    fireEvent.click(retryBtn);

    expect(handleRetry).toHaveBeenCalledWith(formData);
  });

  it("3.3 Deve permitir acionar 'Editar Dados' sem perda de digitação prévia", () => {
    const handleEdit = vi.fn();
    const formData = {
      clientName: "Ana Paula",
      notes: "Preferência por navalha descartável",
    };

    render(
      <ResilientFormHandler
        error="Erro 503 Service Unavailable"
        formData={formData}
        onEdit={handleEdit}
      />
    );

    const editBtn = screen.getByText("Editar Dados");
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledTimes(1);
  });

  it("3.4 Não deve renderizar nada caso não haja erro ativo (estado limpo)", () => {
    const { container } = render(
      <ResilientFormHandler
        error={null}
        formData={{ clientName: "Teste" }}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
