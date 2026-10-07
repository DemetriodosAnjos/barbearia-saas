#!/usr/bin/env node
/**
 * scripts/test-atomic-concurrency-http.js
 *
 * Script Executável Node.js para Auditoria de Performance e Segurança contra Race Conditions.
 *
 * Instruções Atendidas:
 * 1. Dispara 10 requisições HTTP paralelas simultâneas (via Promise.all) para o endpoint
 *    de agendamento (/api/appointments) utilizando o mesmo horário e o mesmo recurso.
 * 2. Confirma que apenas 1 requisição obtém sucesso (HTTP 201) e as outras 9 são rejeitadas
 *    com erro de conflito (HTTP 409 Conflict).
 * 3. Verifica no banco de dados se nenhum registro duplicado foi inserido.
 * 4. Gera relatório de validação estruturado para auditoria e conformidade técnica.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createFuzzingApiServer } from "../src/api/apiDispatcher.ts";
import {
  resetMemoryLockRegistry,
  getRegisteredAppointmentsForSlot,
  getDatabaseAppointmentCount,
} from "../src/api/atomicBookingService.ts";

async function runHttpRaceConditionAudit() {
  console.log("================================================================================");
  console.log("⚡ AUDITORIA DE PERFORMANCE & APPSEC: SCRIPT DE CONCORRÊNCIA HTTP CONTRA RACE CONDITIONS");
  console.log("================================================================================");
  console.log("Cenário de Teste       : 10 Requisições HTTP Paralelas Simultâneas (Promise.all)");
  console.log("Endpoint Alvo          : POST /api/appointments");
  console.log("Recurso / Barbeiro     : Diego Barber Pro (barber_diego)");
  console.log("Horário Disputado      : 2026-10-15 das 14:00 às 14:45 (45 min)");
  console.log("Tenant                 : Barbearia Matriz (tenant_matriz)");
  console.log("Mecanismo de Proteção  : Transação Atômica PostgreSQL + Advisory Lock + Mutex Anti-Overlap");
  console.log("--------------------------------------------------------------------------------");

  // 1. Inicializa repositório e sobe servidor HTTP em porta efêmera
  resetMemoryLockRegistry();
  const app = createFuzzingApiServer();
  app.setMaxListeners(30);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 3333;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`[INFO] Servidor HTTP de Teste Ativo em: ${baseUrl}`);

  // 2. Prepara os 10 clientes com payloads idênticos de horário
  const targetDate = "2026-10-15";
  const targetStart = "14:00";
  const targetEnd = "14:45";
  const targetBarber = "barber_diego";
  const targetTenant = "tenant_matriz";

  const clients = Array.from({ length: 10 }, (_, i) => ({
    tenant_id: targetTenant,
    barber_id: targetBarber,
    barber_name: "Diego Barber Pro",
    client_id: `client_http_${i + 1}`,
    client_name: `Cliente Concorrente HTTP #${i + 1}`,
    client_phone: `(11) 98765-432${i}`,
    service_id: "srv_corte_degrade",
    service_name: "Corte Degradê Navalhado",
    duration_minutes: 45,
    date: targetDate,
    start_time: targetStart,
    end_time: targetEnd,
    price: 70.0,
    notes: `Simulação de alta concorrência cliente #${i + 1}`,
  }));

  const startTime = performance.now();

  // 3. Disparo simultâneo das 10 requisições HTTP via Promise.all
  console.log(`[EXEC] Disparando 10 requisições HTTP paralelas simultâneas...`);
  const results = await Promise.all(
    clients.map(async (payload, idx) => {
      const reqStart = performance.now();
      try {
        const response = await fetch(`${baseUrl}/api/appointments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-correlation-id": `cli-race-${idx + 1}-${Date.now()}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        const duration = Math.round(performance.now() - reqStart);

        return {
          index: idx + 1,
          client: payload.client_name,
          httpStatus: response.status,
          success: response.status === 201,
          isConflict: response.status === 409,
          responseBody: data,
          latencyMs: duration,
        };
      } catch (err) {
        return {
          index: idx + 1,
          client: payload.client_name,
          httpStatus: 500,
          success: false,
          isConflict: false,
          error: err.message,
          latencyMs: Math.round(performance.now() - reqStart),
        };
      }
    })
  );

  const totalTime = Math.round(performance.now() - startTime);

  // 4. Consulta ao Banco de Dados para verificação de duplicidade
  const dbAppointments = getRegisteredAppointmentsForSlot(targetTenant, targetBarber, targetDate);
  const dbTotalCount = getDatabaseAppointmentCount(targetTenant, targetBarber, targetDate);

  // Consulta também via endpoint de auditoria GET /api/appointments/concurrency-audit
  const auditRes = await fetch(
    `${baseUrl}/api/appointments/concurrency-audit?tenantId=${targetTenant}&barberId=${targetBarber}&date=${targetDate}`
  );
  const auditData = await auditRes.json();

  // Encerra servidor HTTP de teste
  await new Promise((resolve) => server.close(resolve));

  // 5. Agregação e Análise dos Resultados
  const approved = results.filter((r) => r.httpStatus === 201);
  const conflicts = results.filter((r) => r.httpStatus === 409);
  const anomalies = results.filter((r) => r.httpStatus !== 201 && r.httpStatus !== 409);

  console.log("\n📊 RESULTADO DETALHADO POR REQUISIÇÃO HTTP:");
  console.log("--------------------------------------------------------------------------------");
  results.forEach((r) => {
    const symbol = r.httpStatus === 201 ? "✓ [APROVADO]" : "✕ [BLOQUEADO]";
    const info =
      r.httpStatus === 201
        ? `Transação confirmada (ID: ${r.responseBody.data?.id})`
        : `Erro 409 Conflict: ${r.responseBody.code || "SLOT_OCCUPIED_CONCURRENCY_CONFLICT"}`;
    console.log(`${symbol.padEnd(14)} ${r.client.padEnd(30)} -> HTTP ${r.httpStatus} (${r.latencyMs}ms) | ${info}`);
  });

  console.log("--------------------------------------------------------------------------------");
  console.log("🔍 AUDITORIA DO BANCO DE DADOS (POSTGRESQL / STORE ATÔMICO):");
  console.log(`- Total de Registros Inseridos no Banco : ${dbTotalCount} (Esperado: 1)`);
  console.log(`- Registros Duplicados (Double Booking) : ${Math.max(0, dbTotalCount - 1)} (Esperado: 0)`);
  console.log(`- ID do Agendamento Vencedor             : ${dbAppointments[0]?.id || "Nenhum"}`);
  console.log(`- Verificação via Endpoint de Auditoria : HTTP ${auditRes.status} (Total: ${auditData.totalAppointments}, Duplicatas: ${auditData.duplicateCount})`);
  console.log("--------------------------------------------------------------------------------");
  console.log(`Tempo Total de Execução : ${totalTime}ms`);
  console.log(`Requisições Totais      : ${results.length}`);
  console.log(`Requisições Aprovadas   : ${approved.length} (Esperado: 1)`);
  console.log(`Requisições Conflito 409: ${conflicts.length} (Esperado: 9)`);
  console.log(`Anomalias Inesperadas   : ${anomalies.length} (Esperado: 0)`);
  console.log("================================================================================");

  // 6. Geração do Relatório de Validação Estruturado
  const validationReport = {
    title: "Relatório de Validação de Segurança & Resiliência contra Race Conditions",
    timestamp: new Date().toISOString(),
    executionTimeMs: totalTime,
    environment: "Node.js Concurrency Test Runner",
    target: {
      endpoint: "POST /api/appointments",
      tenantId: targetTenant,
      barberId: targetBarber,
      date: targetDate,
      timeSlot: `${targetStart} - ${targetEnd}`,
    },
    metrics: {
      totalRequests: results.length,
      approvedCount: approved.length,
      conflictRejectedCount: conflicts.length,
      unexpectedErrorsCount: anomalies.length,
      databaseInsertedRecords: dbTotalCount,
      databaseDuplicatesCount: Math.max(0, dbTotalCount - 1),
      doubleBookingPrevented: dbTotalCount === 1,
    },
    auditStatus: approved.length === 1 && conflicts.length === 9 && dbTotalCount === 1 ? "PASSED" : "FAILED",
    conformanceCriteria: [
      {
        criterion: "Disparo de 10 requisições HTTP paralelas simultâneas via Promise.all",
        status: results.length === 10 ? "PASSED" : "FAILED",
        actual: `${results.length} requisições enviadas`,
      },
      {
        criterion: "Apenas 1 requisição com sucesso HTTP 200/201",
        status: approved.length === 1 ? "PASSED" : "FAILED",
        actual: `${approved.length} aprovada(s)`,
      },
      {
        criterion: "9 requisições rejeitadas com HTTP 409 Conflict",
        status: conflicts.length === 9 ? "PASSED" : "FAILED",
        actual: `${conflicts.length} rejeitada(s) com 409`,
      },
      {
        criterion: "Banco de dados sem nenhum registro duplicado (Double Booking = 0)",
        status: dbTotalCount === 1 ? "PASSED" : "FAILED",
        actual: `${dbTotalCount} registro(s) encontrado(s)`,
      },
    ],
    requestsDetail: results,
  };

  const reportsDir = path.resolve(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, "concurrency-race-validation-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2), "utf8");
  console.log(`📄 Relatório de Validação gerado em: ${reportPath}`);

  if (approved.length === 1 && conflicts.length === 9 && dbTotalCount === 1) {
    console.log("\n🎉 AUDITORIA APROVADA: A aplicação é 100% resiliente contra Race Conditions!");
    process.exit(0);
  } else {
    console.error("\n❌ FALHA CRÍTICA: Violação de integridade ou duplicidade detectada!");
    process.exit(1);
  }
}

runHttpRaceConditionAudit().catch((err) => {
  console.error("Erro fatal na execução do teste:", err);
  process.exit(1);
});
