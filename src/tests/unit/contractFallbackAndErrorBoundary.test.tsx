/**
 * src/tests/unit/contractFallbackAndErrorBoundary.test.tsx
 *
 * Suíte de Testes Unitários de Resiliência de Contrato de API, Validação Zod Client-Side e Error Boundaries.
 *
 * Cobertura de Testes:
 * 1. Validação Zod de contratos intactos (100% conformes).
 * 2. Recuperação resiliente de contratos parciais (sanitização de campos corrompidos sem perder a lista).
 * 3. Fallback de contingência para contratos totalmente quebrados (respostas de erro 500 ou formato inesperado).
 * 4. Isolamento de exceções em tempo de renderização com ErrorBoundary (sem colapsar a aplicação inteira).
 * 5. Restauração de componente via retry no ErrorBoundary.
 * 6. Renderização dos estados de fallback visual (DataCorruptedFallback, PartialDataNotice, EmptyDataFallback).
 */

import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  validateArrayContract,
  validateSingleContract,
  validateServicesContract,
  validateBarbersContract,
  validateAppointmentsContract,
  clientServiceContractSchema,
} from "../../security/apiContractValidator";
import { ErrorBoundary } from "../../components/ui/ErrorBoundary";
import {
  DataCorruptedFallback,
  PartialDataNotice,
  EmptyDataFallback,
} from "../../components/ui/ContractFallback";

// Componente de teste para simular exceções de renderização
const BuggyComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error("Simulated rendering failure: TypeError: Cannot read property of undefined");
  }
  return <div data-testid="buggy-child">Conteúdo Renderizado com Sucesso</div>;
};

// Componente interativo para testar restauração via retry
const RecoverableWrapper: React.FC = () => {
  const [hasCrash, setHasCrash] = useState(true);

  return (
    <ErrorBoundary
      componentName="Módulo Recuperável"
      onReset={() => setHasCrash(false)}
    >
      <BuggyComponent shouldThrow={hasCrash} />
    </ErrorBoundary>
  );
};

describe("UI/UX Resiliência: Validação de Contrato Client-Side & Error Boundaries", () => {
  it("1. Deve validar com sucesso cargas de API 100% íntegras contra schemas Zod", () => {
    const rawServicesFromApi = [
      {
        id: "serv-1",
        name: "Corte Degradê",
        category: "Cabelo",
        duration_minutes: 35,
        price: 45,
        active: true,
      },
      {
        id: "serv-2",
        name: "Barba Terapia",
        category: "Barba",
        duration_minutes: 30,
        price: 35,
        active: true,
      },
    ];

    const result = validateServicesContract(rawServicesFromApi);

    expect(result.status).toBe("INTACT");
    expect(result.isIntact).toBe(true);
    expect(result.isCorrupted).toBe(false);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].durationMinutes).toBe(35);
    expect(result.data[0].name).toBe("Corte Degradê");
  });

  it("2. Deve aplicar contingência resiliente em contratos parciais ou tipos trocados (Partial Recovery)", () => {
    const rawWithFlaws = [
      {
        id: "serv-ok",
        name: "Corte Tradicional",
        price: "40", // string numérica -> coerção Zod
        duration_minutes: "45",
      },
      {
        // Item sem nome (violando schema de string não vazia)
        id: "serv-invalid",
        name: "",
        price: -10,
      },
    ];

    const result = validateServicesContract(rawWithFlaws);

    expect(result.status).toBe("PARTIAL_RECOVERED");
    expect(result.isPartial).toBe(true);
    expect(result.validCount).toBe(1);
    expect(result.droppedCount).toBe(1);
    expect(result.data[0].name).toBe("Corte Tradicional");
    expect(result.data[0].price).toBe(40);
  });

  it("3. Deve acionar Fallback de contingência quando a API retornar formato totalmente corrompido (ex: 500 error object)", () => {
    const corruptApiResponse = {
      statusCode: 500,
      error: "Internal Server Error",
      message: "Database connection failed",
    };

    const fallbackServices = [
      {
        id: "serv-fallback",
        name: "Serviço Padrão (Contingência)",
        category: "Geral",
        durationMinutes: 30,
        price: 30,
        active: true,
      },
    ];

    const result = validateServicesContract(corruptApiResponse, fallbackServices);

    expect(result.status).toBe("CORRUPTED_FALLBACK");
    expect(result.isCorrupted).toBe(true);
    expect(result.data).toEqual(fallbackServices);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("4. Deve validar contratos de Agendamentos e Barbeiros com normalização tolerante", () => {
    const rawBarbers = [
      {
        id: "b-1",
        name: "Carlos Silva",
        display_name: "Carlos",
        rating: "4.9",
        review_count: "42",
      },
    ];

    const barberResult = validateBarbersContract(rawBarbers);
    expect(barberResult.isIntact).toBe(true);
    expect(barberResult.data[0].rating).toBe(4.9);
    expect(barberResult.data[0].reviewCount).toBe(42);

    const rawAppointments = [
      {
        id: "apt-1",
        barber_id: "b-1",
        client_name: "Marcos Paulo",
        client_phone: "11999998888",
        service_name: "Corte",
        start_time: "10:00",
        end_time: "10:30",
        price: "50",
      },
    ];

    const aptResult = validateAppointmentsContract(rawAppointments);
    expect(aptResult.isIntact).toBe(true);
    expect(aptResult.data[0].price).toBe(50);
  });

  it("5. Deve conter exceções de renderização no ErrorBoundary sem derrubar componentes vizinhos", () => {
    const onErrorSpy = vi.fn();

    render(
      <div>
        <div data-testid="safe-header">Header Saudável da Aplicação</div>
        <ErrorBoundary componentName="Widget de Agendamentos" onError={onErrorSpy}>
          <BuggyComponent shouldThrow={true} />
        </ErrorBoundary>
        <div data-testid="safe-footer">Rodapé Saudável da Aplicação</div>
      </div>
    );

    // O header e footer externos devem continuar renderizados intactos
    expect(screen.getByTestId("safe-header")).toBeInTheDocument();
    expect(screen.getByTestId("safe-footer")).toBeInTheDocument();

    // O componente quebrado não deve estar no DOM
    expect(screen.queryByTestId("buggy-child")).not.toBeInTheDocument();

    // O Fallback do Error Boundary deve estar visível
    expect(screen.getByText(/Falha Isolada: Widget de Agendamentos/i)).toBeInTheDocument();
    expect(screen.getByText(/Error Boundary Ativo/i)).toBeInTheDocument();
    expect(onErrorSpy).toHaveBeenCalledTimes(1);
  });

  it("6. Deve restaurar o componente ao clicar no botão de reset/retry do ErrorBoundary", () => {
    render(<RecoverableWrapper />);

    // Inicialmente com erro contido
    expect(screen.getByText(/Falha Isolada: Módulo Recuperável/i)).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /Restaurar Componente/i });

    // Clica no botão de restaurar
    fireEvent.click(retryButton);

    // Agora deve renderizar o conteúdo com sucesso
    expect(screen.getByTestId("buggy-child")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo Renderizado com Sucesso")).toBeInTheDocument();
  });

  it("7. Deve renderizar os componentes visuais de contingência (DataCorruptedFallback, PartialDataNotice, EmptyDataFallback)", () => {
    const retryMock = vi.fn();

    const { rerender } = render(
      <DataCorruptedFallback
        entityName="Produtos do Caixa"
        errors={[{ field: "price", message: "Deve ser um número positivo" }]}
        onRetry={retryMock}
      />
    );

    expect(screen.getByText(/Instabilidade no Contrato de Produtos do Caixa/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);
    expect(retryMock).toHaveBeenCalledTimes(1);

    // Renderiza PartialDataNotice
    rerender(
      <PartialDataNotice
        entityName="Barbeiros"
        totalItems={5}
        recoveredItems={4}
        droppedItems={1}
      />
    );

    expect(screen.getByText(/Exibindo/i)).toBeInTheDocument();
    expect(screen.getByText(/1 item\(ns\) com schema divergente omitido\(s\)/i)).toBeInTheDocument();

    // Renderiza EmptyDataFallback
    const actionMock = vi.fn();
    rerender(
      <EmptyDataFallback
        title="Nenhum agendamento"
        description="A agenda do dia está livre."
        actionLabel="Novo Agendamento"
        onAction={actionMock}
      />
    );

    expect(screen.getByText("Nenhum agendamento")).toBeInTheDocument();
    const actionBtn = screen.getByRole("button", { name: "Novo Agendamento" });
    fireEvent.click(actionBtn);
    expect(actionMock).toHaveBeenCalledTimes(1);
  });
});
