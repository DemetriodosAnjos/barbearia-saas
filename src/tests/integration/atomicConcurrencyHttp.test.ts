/**
 * src/tests/integration/atomicConcurrencyHttp.test.ts
 *
 * Teste de Integração HTTP e Resiliência contra Race Conditions.
 *
 * Cenário de Auditoria de Segurança e Performance:
 * Dispara 10 requisições HTTP POST paralelas simultâneas (via Promise.all)
 * para o endpoint de agendamento (/api/appointments) disputando exatamente:
 * - O mesmo tenant (tenant_matriz)
 * - O mesmo recurso/barbeiro (barber_diego)
 * - A mesma data (2026-10-15)
 * - O mesmo intervalo de horário (14:00 às 14:45)
 *
 * Assertivas Estritas:
 * 1. Exatamente 1 requisição obtém sucesso (HTTP 201 Created).
 * 2. As outras 9 requisições são rejeitadas com erro de conflito (HTTP 409 Conflict - SLOT_OCCUPIED_CONCURRENCY_CONFLICT).
 * 3. Verificação no banco de dados / repositório persistente de que exatamente 1 registro foi inserido e zero duplicidades existem.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createFuzzingApiServer } from "../../api/apiDispatcher";
import {
  resetMemoryLockRegistry,
  getRegisteredAppointmentsForSlot,
  getDatabaseAppointmentCount,
} from "../../api/atomicBookingService";
import type { Server } from "node:http";

describe("Auditoria de Concorrência HTTP & Race Conditions (/api/appointments)", () => {
  let server: Server;
  const targetTenant = "tenant_matriz";
  const targetBarber = "barber_diego";
  const targetDate = "2026-10-15";
  const targetStartTime = "14:00";
  const targetEndTime = "14:45";

  beforeEach(() => {
    resetMemoryLockRegistry();
    server = createFuzzingApiServer();
    server.setMaxListeners(25);
  });

  afterEach(async () => {
    if (server && server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("deve disparar 10 requisições HTTP paralelas simultâneas, aprovar apenas 1 (HTTP 201), rejeitar 9 (HTTP 409) e garantir zero duplicidades no banco", async () => {
    // 1. Preparação dos 10 payloads concorrentes disputando o mesmo slot de horário
    const clientsPayloads = Array.from({ length: 10 }, (_, i) => ({
      tenant_id: targetTenant,
      barber_id: targetBarber,
      barber_name: "Diego Barber Pro",
      client_id: `client_http_race_${i + 1}`,
      client_name: `Cliente Concorrente HTTP #${i + 1}`,
      client_phone: `(11) 98765-432${i}`,
      service_id: "srv_corte_degrade",
      service_name: "Corte Degradê Navalhado",
      duration_minutes: 45,
      date: targetDate,
      start_time: targetStartTime,
      end_time: targetEndTime,
      price: 70.0,
      notes: `Disparo simultâneo concorrente #${i + 1}`,
    }));

    // 2. Disparo de 10 requisições HTTP simultâneas paralelas com Promise.all
    const responses = await Promise.all(
      clientsPayloads.map((payload) =>
        request(server)
          .post("/api/appointments")
          .set("Content-Type", "application/json")
          .set("x-correlation-id", `race-test-${payload.client_id}`)
          .send(payload)
      )
    );

    // 3. Validação das respostas HTTP recebidas
    const approvedResponses = responses.filter((res) => res.status === 201);
    const conflictResponses = responses.filter((res) => res.status === 409);
    const otherResponses = responses.filter(
      (res) => res.status !== 201 && res.status !== 409
    );

    // Assertiva 1: Nenhum erro inesperado (ex: 500, 400, 422)
    expect(otherResponses.length).toBe(0);

    // Assertiva 2: Exatamente 1 requisição obteve sucesso HTTP 201
    expect(approvedResponses.length).toBe(1);
    const approvedBody = approvedResponses[0].body;
    expect(approvedBody.success).toBe(true);
    expect(approvedBody.data).toBeDefined();
    expect(approvedBody.data.id).toMatch(/^apt_atom_/);
    expect(approvedBody.data.start_time).toBe(targetStartTime);
    expect(approvedBody.data.end_time).toBe(targetEndTime);

    // Assertiva 3: Exatamente 9 requisições foram rejeitadas com HTTP 409 Conflict
    expect(conflictResponses.length).toBe(9);
    conflictResponses.forEach((res) => {
      expect(res.body.status).toBe(409);
      expect(res.body.isConcurrencyConflict).toBe(true);
      expect(res.body.code).toBe("SLOT_OCCUPIED_CONCURRENCY_CONFLICT");
      expect(res.body.message).toMatch(/(conflitante|já possui um agendamento|reservado)/i);
    });

    // 4. Verificação no banco de dados / repositório persistente
    const registeredInDb = getRegisteredAppointmentsForSlot(
      targetTenant,
      targetBarber,
      targetDate
    );
    const totalCount = getDatabaseAppointmentCount(
      targetTenant,
      targetBarber,
      targetDate
    );

    // Assertiva 4: Exatamente 1 registro persistido no banco
    expect(totalCount).toBe(1);
    expect(registeredInDb.length).toBe(1);
    expect(registeredInDb[0].id).toBe(approvedBody.data.id);

    // Assertiva 5: Verificação via endpoint de auditoria GET /api/appointments/concurrency-audit
    const auditRes = await request(server)
      .get(
        `/api/appointments/concurrency-audit?tenantId=${targetTenant}&barberId=${targetBarber}&date=${targetDate}`
      )
      .send();

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.totalAppointments).toBe(1);
    expect(auditRes.body.duplicateCount).toBe(0);
    expect(auditRes.body.hasDoubleBooking).toBe(false);
  });
});
