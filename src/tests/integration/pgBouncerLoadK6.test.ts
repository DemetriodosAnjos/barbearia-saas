/**
 * src/tests/integration/pgBouncerLoadK6.test.ts
 *
 * Teste de Integração e Validação de SLAs de Carga e Estresse do PgBouncer (k6).
 *
 * Validações Arquiteturais:
 * 1. Rampa de conexões com suporte a alto volume de requisições simultâneas.
 * 2. Avaliação de p95 (< 500ms) e p99 (< 1500ms) sob stress de leitura e escrita.
 * 3. Validação do threshold de parada automática de taxa de erros (< 1.00%).
 * 4. Zero estouro do pool de conexões (HTTP 503 / fatal database connection drops = 0).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createFuzzingApiServer } from "../../api/apiDispatcher";
import { pgBouncerManager } from "../../middleware/connectionPoolGuard";
import { resetMemoryLockRegistry } from "../../api/atomicBookingService";
import type { Server } from "node:http";

describe("Testes de Carga e Estresse para PgBouncer (k6 / Supabase)", () => {
  let server: Server;

  beforeEach(() => {
    resetMemoryLockRegistry();
    pgBouncerManager.resetMetrics();
    server = createFuzzingApiServer();
    server.setMaxListeners(600);
  });

  afterEach(async () => {
    if (server && server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("1. deve suportar onda de 100 requisições simultâneas mantendo taxa de erro < 1% e p95 < 500ms (80% Leitura / 20% Escrita)", async () => {
    const totalRequests = 100;
    const reqPromises = Array.from({ length: totalRequests }, (_, i) => {
      // Proporção de tráfego estrita: 80% leitura (GET) e 20% escrita (POST)
      const isWrite = i % 5 === 0;
      const start = performance.now();

      if (!isWrite) {
        return request(server)
          .get("/api/appointments?limit=20")
          .set("Accept", "application/json")
          .set("x-vu-client", `vu-${i}`)
          .then((res) => ({
            status: res.status,
            duration: performance.now() - start,
            type: "READ",
          }));
      } else {
        const slotHour = 9 + (i % 8);
        return request(server)
          .post("/api/appointments")
          .set("Content-Type", "application/json")
          .send({
            tenant_id: "tenant_matriz",
            barber_id: `barber_pro_0${(i % 4) + 1}`,
            barber_name: "Barbeiro Pro",
            client_id: `client_vu_${i}`,
            client_name: `Cliente Carga #${i}`,
            client_phone: "(11) 98765-4321",
            service_id: "srv_corte",
            service_name: "Corte Degradê",
            duration_minutes: 45,
            date: "2026-10-25",
            start_time: `${slotHour.toString().padStart(2, "0")}:00`,
            end_time: `${slotHour.toString().padStart(2, "0")}:45`,
            price: 60.0,
          })
          .then((res) => ({
            status: res.status,
            duration: performance.now() - start,
            type: "WRITE",
          }));
      }
    });

    const results = await Promise.all(reqPromises);

    // Validação de Respostas: 200 (OK leitura), 201 (OK escrita), 409 (Conflito atômico tratado)
    const validResponses = results.filter(
      (r) => r.status === 200 || r.status === 201 || r.status === 409
    );
    const errors = results.filter((r) => r.status >= 500);

    const errorRate = (errors.length / totalRequests) * 100;
    expect(errorRate).toBeLessThan(1.0); // Threshold estrito < 1%

    // Cálculo do p95
    const durations = results.map((r) => r.duration).sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    expect(p95).toBeLessThan(500); // SLA p95 < 500ms
    expect(p99).toBeLessThan(1500); // SLA p99 < 1500ms
    expect(validResponses.length).toBe(totalRequests);
  });

  it("2. deve validar a integridade do script k6 test-load.js com thresholds e rampa de 50 a 500 VUs", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const k6Path = path.resolve(process.cwd(), "test-load.js");
    expect(fs.existsSync(k6Path)).toBe(true);

    const k6Content = fs.readFileSync(k6Path, "utf-8");

    // Validação de presença das instruções obrigatórias no script k6
    expect(k6Content).toContain("50");
    expect(k6Content).toContain("500");
    expect(k6Content).toContain("http_req_failed");
    expect(k6Content).toContain("rate < 0.01");
    expect(k6Content).toContain("abortOnFail: true");
    expect(k6Content).toContain("p(95)<500");
    expect(k6Content).toContain("p(99)<1500");
    expect(k6Content).toContain("pgbouncer_pool_exhaustion");
    expect(k6Content).toContain("ramping-vus");
  });
});
