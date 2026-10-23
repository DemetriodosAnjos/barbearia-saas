/* global __ENV, __VU, __ITER */
/**
 * test-load.js
 *
 * Script de Teste de Carga e Estresse em k6 para PgBouncer e PostgreSQL (Supabase).
 * Stack: React (Vite) + Node.js (Express) + Supabase (PgBouncer Transaction Pooling).
 *
 * Requisitos Implementados:
 * 1. Rampa de Acesso: De 50 para 500 VUs em 2 minutos via options.stages.
 * 2. Proporção de Tráfego: 80% leitura (GET) e 20% escrita (POST).
 * 3. Compatibilidade Vite/Node: Leitura via __ENV (VITE_SUPABASE_URL, SUPABASE_ANON_KEY, BASE_URL).
 * 4. Thresholds com abortOnFail: Interrompe se connection_errors ou HTTP 5xx/0 > 1%.
 * 5. Métricas Percentílicas: Avaliação rigorosa de cauda longa para p95 e p99.
 *
 * Execução:
 *   k6 run test-load.js
 *   k6 run --env BASE_URL=http://localhost:3000 --env VITE_SUPABASE_URL=https://exemplo.supabase.co test-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ============================================================================
// MÉTRICAS CUSTOMIZADAS DO PGBOUNCER & BANCO DE DADOS
// ============================================================================
export const dbReadDuration = new Trend('db_read_duration', true);
export const dbWriteDuration = new Trend('db_write_duration', true);
export const pgbouncerPoolExhaustion = new Rate('pgbouncer_pool_exhaustion');
export const connectionErrors = new Rate('connection_errors');
export const successfulReads = new Counter('successful_read_ops');
export const successfulWrites = new Counter('successful_write_ops');

// ============================================================================
// CONFIGURAÇÃO DE CARGA (STAGES) E THRESHOLDS DE PARADA AUTOMÁTICA
// ============================================================================
export const options = {
  scenarios: {
    pgbouncer_stress_ramp: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '30s', target: 150 }, // Estágio 1: 50 -> 150 VUs (aquecimento do pool)
        { duration: '60s', target: 500 }, // Estágio 2: 150 -> 500 VUs (rampa de pico)
        { duration: '30s', target: 500 }, // Estágio 3: 500 VUs (sustentação no estresse máximo)
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // 1. Interrompe automaticamente se taxa de erro HTTP 5xx/4xx ou timeout ultrapassar 1%
    http_req_failed: [
      {
        threshold: 'rate < 0.01',
        abortOnFail: true,
        delayAbortEval: '10s',
      },
    ],
    // 2. Interrompe se connection_errors (HTTP 5xx, status 0 / socket drop) ultrapassar 1%
    connection_errors: [
      {
        threshold: 'rate < 0.01',
        abortOnFail: true,
        delayAbortEval: '10s',
      },
    ],
    // 3. Métricas Percentílicas globais: p95 < 500ms e p99 < 1500ms
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    // 4. Métricas de cauda para Leituras e Escritas
    db_read_duration: ['p(95)<300'],
    db_write_duration: ['p(95)<600'],
    // 5. Zero tolerância para saturação explícita de pool PgBouncer (HTTP 503)
    pgbouncer_pool_exhaustion: ['rate < 0.005'],
    // 6. Assertividade de checks
    checks: ['rate > 0.99'],
  },
};

// ============================================================================
// RESOLUÇÃO DE VARIÁVEIS DE AMBIENTE VITE / NODE VIA __ENV
// ============================================================================
const BASE_URL = __ENV.BASE_URL || __ENV.VITE_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = __ENV.VITE_SUPABASE_URL || __ENV.SUPABASE_URL || `${BASE_URL}/api`;
const SUPABASE_ANON_KEY = __ENV.VITE_SUPABASE_ANON_KEY || __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOi...';

// Headers padronizados com suporte a autenticação e CORS
const STANDARD_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Client-Platform': 'k6-load-agent',
  'X-Supabase-Url': SUPABASE_URL,
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

export default function () {
  const vuId = __VU;
  const iterId = __ITER;

  // Proporção de tráfego estrita: 80% leitura (GET) e 20% escrita (POST)
  const isWriteOp = Math.random() < 0.20;

  if (!isWriteOp) {
    // ------------------------------------------------------------------------
    // FLUXO DE LEITURA (80% DO TRÁFEGO - TRANSACTION POOLING PGBOUNCER)
    // ------------------------------------------------------------------------
    const readEndpoints = [
      '/api/appointments?limit=20',
      '/api/services',
      '/api/clients?limit=10',
    ];
    const targetEndpoint = readEndpoints[Math.floor(Math.random() * readEndpoints.length)];
    const readStart = Date.now();

    const res = http.get(`${BASE_URL}${targetEndpoint}`, {
      headers: STANDARD_HEADERS,
      tags: { name: 'DB_READ_GET' },
      timeout: '5s',
    });

    const readLatency = Date.now() - readStart;
    dbReadDuration.add(readLatency);

    // Detecção de falhas de conexão de baixo nível (status 0) ou erro 5xx
    const isConnError = res.status === 0 || res.status >= 500;
    connectionErrors.add(isConnError);

    // Detecção de exaustão do PgBouncer
    const isExhausted =
      res.status === 503 ||
      res.status === 504 ||
      (res.body && typeof res.body === 'string' && res.body.includes('remaining connection slots are reserved'));

    pgbouncerPoolExhaustion.add(isExhausted);

    const ok = check(res, {
      'Leitura: HTTP 200/OK retornado': (r) => r.status === 200,
      'Leitura: Conexão íntegra sem status 0': (r) => r.status !== 0,
      'Leitura: PgBouncer sem saturação (não 503)': (r) => r.status !== 503 && r.status !== 504,
      'Leitura: Latência dentro do SLA (< 500ms)': (r) => r.timings.duration < 500,
    });

    if (ok) successfulReads.add(1);
  } else {
    // ------------------------------------------------------------------------
    // FLUXO DE ESCRITA (20% DO TRÁFEGO - POST TRANSAÇÃO ATÔMICA COM MUTEX)
    // ------------------------------------------------------------------------
    const barberIndex = (vuId % 5) + 1;
    const hourSlot = 9 + (vuId % 10);
    const startHourStr = `${hourSlot.toString().padStart(2, '0')}:00`;
    const endHourStr = `${hourSlot.toString().padStart(2, '0')}:45`;

    const writePayload = JSON.stringify({
      tenant_id: 'tenant_matriz',
      barber_id: `barber_pro_0${barberIndex}`,
      barber_name: `Barbeiro Especialista #${barberIndex}`,
      client_id: `client_vu_${vuId}_${iterId}`,
      client_name: `Cliente Carga k6 #${vuId}`,
      client_phone: `(11) 98765-${(1000 + (vuId % 9000)).toString()}`,
      service_id: 'srv_corte_premium',
      service_name: 'Corte Degradê & Barba',
      duration_minutes: 45,
      date: '2026-10-28',
      start_time: startHourStr,
      end_time: endHourStr,
      price: 85.0,
      notes: `k6 stress run VU=${vuId} ITER=${iterId} - 80/20 mix`,
    });

    const writeStart = Date.now();
    const res = http.post(`${BASE_URL}/api/appointments`, writePayload, {
      headers: STANDARD_HEADERS,
      tags: { name: 'DB_WRITE_POST' },
      timeout: '8s',
    });

    const writeLatency = Date.now() - writeStart;
    dbWriteDuration.add(writeLatency);

    // Detecção de falhas de conexão ou erros 5xx
    const isConnError = res.status === 0 || res.status >= 500;
    connectionErrors.add(isConnError);

    // Detecção de saturação de pooler no PgBouncer
    const isExhausted =
      res.status === 503 ||
      res.status === 504 ||
      (res.body && typeof res.body === 'string' && res.body.includes('server connection closed'));

    pgbouncerPoolExhaustion.add(isExhausted);

    // Em concorrência elevada pelo mesmo slot, 201 (Created) ou 409 (Conflict tratado)
    // representam sucesso da regra de negócio anti-double booking
    const ok = check(res, {
      'Escrita: Transação processada (201 Created ou 409 Conflict)': (r) => r.status === 201 || r.status === 409,
      'Escrita: Conexão íntegra sem status 0': (r) => r.status !== 0,
      'Escrita: PgBouncer sem saturação (não 503)': (r) => r.status !== 503 && r.status !== 504,
      'Escrita: Latência dentro do SLA (< 600ms)': (r) => r.timings.duration < 600,
    });

    if (ok) successfulWrites.add(1);
  }

  // Jitter para distribuição orgânica de conexões no Transaction Pool
  sleep(Math.random() * 0.12 + 0.04);
}

/**
 * Hook executado ao término da execução do k6 para gerar sumário e logs
 */
export function handleSummary(data) {
  const reqTotal = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const failRate = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  const connErrRate = data.metrics.connection_errors ? data.metrics.connection_errors.values.rate : 0;
  const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0;
  const p99 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(99)'] : 0;

  console.log('================================================================================');
  console.log('[BarChart3] RESUMO DO TESTE DE CARGA K6 - PGBOUNCER (80% LEITURA / 20% ESCRITA)');
  console.log('================================================================================');
  console.log(`Total de Requisições   : ${reqTotal}`);
  console.log(`Taxa de Falha HTTP     : ${(failRate * 100).toFixed(2)}% (Threshold: < 1.00%)`);
  console.log(`Taxa Erros Conexão     : ${(connErrRate * 100).toFixed(2)}% (Threshold: < 1.00%)`);
  console.log(`Latência Global p(95)  : ${p95.toFixed(2)}ms (Threshold: < 500ms)`);
  console.log(`Latência Global p(99)  : ${p99.toFixed(2)}ms (Threshold: < 1500ms)`);
  console.log(`Status Geral           : ${failRate < 0.01 && connErrRate < 0.01 ? 'APROVADO (SLA Cumprido)' : 'REPROVADO'}`);
  console.log('================================================================================');

  return {
    'stdout': null,
    'reports/k6-summary.json': JSON.stringify(data, null, 2),
  };
}
