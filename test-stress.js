/* global __ENV, __VU, __ITER */
/**
 * test-stress.js
 *
 * Script de Estresse Agressivo / Spike Test em k6 para o PgBouncer (Supabase/PostgreSQL).
 *
 * Objetivo:
 * - Localizar o ponto de quebra (breaking point) do Transaction Pool do PgBouncer.
 * - Rampa ultra-agressiva: saltar de 50 para 1.500 VUs em 1 minuto.
 * - Monitorar e categorizar falhas específicas de infraestrutura:
 *     1. Timeout Errors (HTTP 504 / Latência > 5s / ETIMEDOUT).
 *     2. Connection Refused Errors (HTTP 503 / Recusa de socket / Pool Esgotado / Slots Excedidos).
 * - Thresholds de Parada Automática (abortOnFail: true):
 *     1. Interrupção imediata se a taxa de erros ultrapassar 5%.
 *     2. Interrupção imediata se o p(95) exceder 2.000ms (2 segundos).
 *     3. Interrupção se taxa de recusa de conexão pelo PgBouncer ultrapassar 1%.
 * - Compatibilidade direta com variáveis do Vite/Node (__ENV.VITE_SUPABASE_URL, etc.).
 *
 * Execução:
 *   k6 run test-stress.js
 *   k6 run --env BASE_URL=http://localhost:3000 --env VITE_SUPABASE_URL=https://exemplo.supabase.co test-stress.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ============================================================================
// MÉTRICAS CUSTOMIZADAS: CATEGORIZAÇÃO DE FALHAS & LATÊNCIA DE PICO
// ============================================================================
export const timeoutErrors = new Rate('timeout_errors');
export const connectionRefusedErrors = new Rate('connection_refused_errors');
export const connectionErrors = new Rate('connection_errors');
export const dbReadDuration = new Trend('db_read_duration', true);
export const dbWriteDuration = new Trend('db_write_duration', true);
export const successfulReads = new Counter('successful_read_ops');
export const successfulWrites = new Counter('successful_write_ops');

// ============================================================================
// CONFIGURAÇÃO DA RAMPA AGRESSIVA (SPIKE) E THRESHOLDS DE CORTE
// ============================================================================
export const options = {
  scenarios: {
    pgbouncer_spike_breaking_point: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '10s', target: 50 },    // Baseline inicial de aquecimento
        { duration: '50s', target: 1500 },  // Salto brutal: 50 -> 1500 VUs em menos de 1 minuto
        { duration: '30s', target: 1500 },  // Sustentação no estresse extremo para forçar saturação
        { duration: '10s', target: 0 },     // Recuperação e cooldown
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // 1. Parada Automática: Taxa global de falhas HTTP não pode ultrapassar 5%
    http_req_failed: [
      {
        threshold: 'rate < 0.05',
        abortOnFail: true,
        delayAbortEval: '10s',
      },
    ],
    // 2. Parada Automática: Taxa de falhas de conexão de baixo nível não pode ultrapassar 5%
    connection_errors: [
      {
        threshold: 'rate < 0.05',
        abortOnFail: true,
        delayAbortEval: '10s',
      },
    ],
    // 3. Parada Automática: Se a recusa explícita de conexão pelo PgBouncer ultrapassar 1%
    connection_refused_errors: [
      {
        threshold: 'rate < 0.01',
        abortOnFail: true,
        delayAbortEval: '10s',
      },
    ],
    // 4. Parada Automática: Se o p(95) exceder 2000ms (2s), corta imediatamente o teste
    http_req_duration: [
      {
        threshold: 'p(95) < 2000',
        abortOnFail: true,
        delayAbortEval: '10s',
      },
      'p(99) < 4000',
    ],
    // 5. Métricas de cauda específicas para leituras e escritas
    db_read_duration: ['p(95) < 1200'],
    db_write_duration: ['p(95) < 2000'],
  },
};

// ============================================================================
// ISOLAMENTO DE VARIÁVEIS DE AMBIENTE VITE / NODE VIA __ENV
// ============================================================================
const BASE_URL = __ENV.BASE_URL || __ENV.VITE_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = __ENV.VITE_SUPABASE_URL || __ENV.SUPABASE_URL || `${BASE_URL}/api`;
const SUPABASE_ANON_KEY = __ENV.VITE_SUPABASE_ANON_KEY || __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOi...';

const STANDARD_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Client-Platform': 'k6-spike-agent',
  'X-Supabase-Url': SUPABASE_URL,
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

export default function () {
  const vuId = __VU;
  const iterId = __ITER;

  // Proporção de carga: 80% leitura (GET) e 20% escrita transacional (POST)
  const isWriteOp = Math.random() < 0.20;

  if (!isWriteOp) {
    // ------------------------------------------------------------------------
    // FLUXO DE LEITURA (GET): TESTA CONSUMO RÁPIDO DO POOL TRANSACTION
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
      tags: { name: 'SPIKE_READ_GET' },
      timeout: '6s',
    });

    const latency = Date.now() - readStart;
    dbReadDuration.add(latency);

    // ----------------------------------------------------------------------
    // CATEGORIZAÇÃO DE FALHAS ESPECÍFICAS DE INFRAESTRUTURA
    // ----------------------------------------------------------------------
    // 1. Falha por Timeout de Conexão ou Resposta (504 ou esgotamento de tempo)
    const isTimeout = res.status === 504 || res.timings.duration >= 5000;
    timeoutErrors.add(isTimeout);

    // 2. Falha por Recusa de Conexão pelo PgBouncer (503, pool cheio, status 0 / socket drop)
    const isRefused =
      res.status === 503 ||
      res.status === 0 ||
      (res.body && typeof res.body === 'string' && (
        res.body.includes('remaining connection slots are reserved') ||
        res.body.includes('server connection closed') ||
        res.body.includes('pool_timeout') ||
        res.body.includes('max client connections reached')
      ));
    connectionRefusedErrors.add(isRefused);

    // 3. Taxa agregada de erros de conexão
    const isGenericConnError = isTimeout || isRefused || res.status >= 500;
    connectionErrors.add(isGenericConnError);

    const ok = check(res, {
      'Leitura: HTTP 200 retornado': (r) => r.status === 200,
      'Leitura: Sem recusa de pool PgBouncer (não 503)': (r) => r.status !== 503 && r.status !== 0,
      'Leitura: Sem timeout de gateway (não 504)': (r) => r.status !== 504,
      'Leitura: Latência dentro do teto crítico (< 2000ms)': (r) => r.timings.duration < 2000,
    });

    if (ok) successfulReads.add(1);
  } else {
    // ------------------------------------------------------------------------
    // FLUXO DE ESCRITA (POST): TESTA CONTENÇÃO TRANSACIONAL SOB 1.500 VUs
    // ------------------------------------------------------------------------
    const barberIndex = (vuId % 5) + 1;
    const hourSlot = 9 + (vuId % 10);
    const startHourStr = `${hourSlot.toString().padStart(2, '0')}:00`;
    const endHourStr = `${hourSlot.toString().padStart(2, '0')}:45`;

    const writePayload = JSON.stringify({
      tenant_id: 'tenant_matriz',
      barber_id: `barber_pro_0${barberIndex}`,
      barber_name: `Barbeiro Especialista #${barberIndex}`,
      client_id: `spike_client_${vuId}_${iterId}`,
      client_name: `Cliente Spike 1500VUs #${vuId}`,
      client_phone: `(11) 98888-${(1000 + (vuId % 9000)).toString()}`,
      service_id: 'srv_corte_premium',
      service_name: 'Corte Degradê & Barba',
      duration_minutes: 45,
      date: '2026-10-28',
      start_time: startHourStr,
      end_time: endHourStr,
      price: 85.0,
      notes: `k6 breaking point stress test VU=${vuId} ITER=${iterId}`,
    });

    const writeStart = Date.now();
    const res = http.post(`${BASE_URL}/api/appointments`, writePayload, {
      headers: STANDARD_HEADERS,
      tags: { name: 'SPIKE_WRITE_POST' },
      timeout: '8s',
    });

    const latency = Date.now() - writeStart;
    dbWriteDuration.add(latency);

    // ----------------------------------------------------------------------
    // CATEGORIZAÇÃO DE FALHAS ESPECÍFICAS DE INFRAESTRUTURA
    // ----------------------------------------------------------------------
    const isTimeout = res.status === 504 || res.timings.duration >= 7000;
    timeoutErrors.add(isTimeout);

    const isRefused =
      res.status === 503 ||
      res.status === 0 ||
      (res.body && typeof res.body === 'string' && (
        res.body.includes('remaining connection slots are reserved') ||
        res.body.includes('server connection closed') ||
        res.body.includes('pool_timeout') ||
        res.body.includes('max client connections reached')
      ));
    connectionRefusedErrors.add(isRefused);

    const isGenericConnError = isTimeout || isRefused || res.status >= 500;
    connectionErrors.add(isGenericConnError);

    // Sob concorrência de 1500 VUs, o endpoint com advisory lock atômico responde
    // 201 Created para quem obteve o lock e 409 Conflict para as tentativas concorrentes
    const ok = check(res, {
      'Escrita: Transação atendida (201 Created ou 409 Conflict)': (r) => r.status === 201 || r.status === 409,
      'Escrita: Sem recusa de pool PgBouncer (não 503)': (r) => r.status !== 503 && r.status !== 0,
      'Escrita: Sem timeout de gateway (não 504)': (r) => r.status !== 504,
      'Escrita: Latência dentro do teto crítico (< 2000ms)': (r) => r.timings.duration < 2000,
    });

    if (ok) successfulWrites.add(1);
  }

  // Jitter mínimo para simular rajada intensa
  sleep(Math.random() * 0.08 + 0.02);
}

/**
 * Hook de sumarização executado ao término do Spike Test k6
 */
export function handleSummary(data) {
  const reqTotal = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const failRate = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  const connErrorsRate = data.metrics.connection_errors ? data.metrics.connection_errors.values.rate : 0;
  const timeoutRate = data.metrics.timeout_errors ? data.metrics.timeout_errors.values.rate : 0;
  const refusedRate = data.metrics.connection_refused_errors ? data.metrics.connection_refused_errors.values.rate : 0;
  const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0;
  const p99 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(99)'] : 0;

  console.log('================================================================================');
  console.log('[Zap] RESUMO DO TESTE DE ESTRESSE / SPIKE (BREAKING POINT 1.500 VUs) - PGBOUNCER');
  console.log('================================================================================');
  console.log(`Total de Requisições   : ${reqTotal}`);
  console.log(`Taxa de Falhas HTTP    : ${(failRate * 100).toFixed(2)}% (Threshold Limite: < 5.00%)`);
  console.log(`Erros de Conexão       : ${(connErrorsRate * 100).toFixed(2)}% (Threshold Limite: < 5.00%)`);
  console.log(`Timeouts (504 / >5s)   : ${(timeoutRate * 100).toFixed(2)}%`);
  console.log(`Recusas de Pool (503/0): ${(refusedRate * 100).toFixed(2)}% (Threshold Limite: < 1.00%)`);
  console.log(`Latência Global p(95)  : ${p95.toFixed(2)}ms (Threshold Limite: < 2000ms)`);
  console.log(`Latência Global p(99)  : ${p99.toFixed(2)}ms (Threshold: < 4000ms)`);
  console.log(`Status de Conexão      : ${failRate < 0.05 && p95 < 2000 && refusedRate < 0.01 ? 'RESILIENTE AO SPIKE' : 'PONTO DE QUEBRA ATINGIDO'}`);
  console.log('================================================================================');

  return {
    'stdout': null,
    'reports/k6-stress-summary.json': JSON.stringify(data, null, 2),
  };
}
