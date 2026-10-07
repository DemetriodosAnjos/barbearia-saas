/* global __ENV, __VU, __ITER */
/**
 * test-metrics-audit.js
 *
 * Módulo 4: Roteiro de Análise de Métricas e Logs do PgBouncer & PostgreSQL (Supabase).
 * Perfil: Performance Engineer / SRE.
 *
 * Requisitos Atendidos:
 * 1. Compatibilidade Vite/Node: Leitura via __ENV (VITE_SUPABASE_URL, SUPABASE_ANON_KEY, BASE_URL).
 * 2. Thresholds Estritos: Interrupção automática (abortOnFail: true) se a taxa de erros
 *    (connection_errors ou HTTP 5xx/0) ultrapassar 1% (rate < 0.01).
 * 3. Métricas Percentílicas: Avaliação de cauda longa para p95 (< 500ms) e p99 (< 1500ms).
 * 4. Cruzamento de Métricas: Instrumentação voltada a correlacionar cl_active, cl_waiting,
 *    sv_active e sv_idle do PgBouncer com a latência observada pelo cliente.
 * 5. Código limpo, desacoplado e 100% comentado para execução via CLI com flags -e.
 *
 * Comandos CLI com injeção de variáveis via -e:
 *   k6 run test-metrics-audit.js
 *   k6 run -e BASE_URL=http://localhost:3000 -e VITE_SUPABASE_URL=https://<project-ref>.supabase.co -e SUPABASE_ANON_KEY=<sua-anon-key> test-metrics-audit.js
 *   k6 run -e BASE_URL=http://localhost:3000 -e VUS=100 -e DURATION=1m test-metrics-audit.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ============================================================================
// 1. MÉTRICAS CUSTOMIZADAS PARA CORRELAÇÃO COM PGBOUNCER & POSTGRESQL
// ============================================================================

// Taxa de falhas de conexão de baixo nível (HTTP 5xx, status 0 / socket drop / reset)
export const connectionErrors = new Rate('connection_errors');

// Taxa de recusa explícita por exaustão de pool (HTTP 503 / pool_timeout)
export const poolExhaustionErrors = new Rate('pool_exhaustion_errors');

// Tendência de latência para operações de leitura (GET)
export const dbReadDuration = new Trend('db_read_duration', true);

// Tendência de latência para operações transacionais de escrita (POST)
export const dbWriteDuration = new Trend('db_write_duration', true);

// Contadores de operações com sucesso
export const successfulReads = new Counter('successful_reads');
export const successfulWrites = new Counter('successful_writes');

// ============================================================================
// 2. CONFIGURAÇÃO DE CENÁRIOS DE CARGA & THRESHOLDS COM ABORT ON FAIL
// ============================================================================

export const options = {
  scenarios: {
    // Cenário de rampa progressiva calibrado para testar limites do Transaction Pooler
    pgbouncer_metrics_audit: {
      executor: 'ramping-vus',
      startVUs: parseInt(__ENV.START_VUS || '20', 10),
      stages: [
        { duration: '20s', target: 50 },  // Estágio 1: 20 -> 50 VUs (Warm-up do pool e sockets)
        { duration: '40s', target: 200 }, // Estágio 2: 50 -> 200 VUs (Saturação média)
        { duration: '30s', target: 500 }, // Estágio 3: 200 -> 500 VUs (Estresse máximo do pool)
        { duration: '20s', target: 500 }, // Estágio 4: Sustentação em 500 VUs
        { duration: '10s', target: 0 },   // Estágio 5: Rampa de descida / Cooldown
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // REGRA DE OURO: Interrompe o teste imediatamente se taxa de erro HTTP 5xx/4xx > 1%
    http_req_failed: [
      {
        threshold: 'rate < 0.01',
        abortOnFail: true,
        delayAbortEval: '10s', // Margem de segurança de 10s para estabilização de cold-starts
      },
    ],

    // Interrompe o teste imediatamente se erros de conexão (HTTP 5xx ou status 0) > 1%
    connection_errors: [
      {
        threshold: 'rate < 0.01',
        abortOnFail: true,
        delayAbortEval: '10s',
      },
    ],

    // SLA Global de Latência: p95 < 500ms e p99 < 1500ms
    http_req_duration: ['p(95)<500', 'p(99)<1500'],

    // SLA específico para consultas de leitura: p95 < 300ms e p99 < 800ms
    db_read_duration: ['p(95)<300', 'p(99)<800'],

    // SLA específico para transações de escrita: p95 < 600ms e p99 < 1200ms
    db_write_duration: ['p(95)<600', 'p(99)<1200'],

    // Zero tolerância para saturação explícita de pool PgBouncer (HTTP 503)
    pool_exhaustion_errors: ['rate < 0.005'],

    // Assertividade geral de asserções > 99%
    checks: ['rate > 0.99'],
  },
};

// ============================================================================
// 3. RESOLUÇÃO DE VARIÁVEIS DE AMBIENTE VITE / NODE VIA __ENV
// ============================================================================

// Compatibilidade direta com as variáveis do projeto Vite (.env e .env.production)
const BASE_URL = __ENV.BASE_URL || __ENV.VITE_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = __ENV.VITE_SUPABASE_URL || __ENV.SUPABASE_URL || `${BASE_URL}/api`;
const SUPABASE_ANON_KEY = __ENV.VITE_SUPABASE_ANON_KEY || __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOi...anon-key';

// Cabeçalhos HTTP padronizados para autenticação e rastreabilidade
const REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Client-Platform': 'k6-performance-engineer',
  'X-Supabase-Url': SUPABASE_URL,
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

// ============================================================================
// 4. FLUXO PRINCIPAL DE EXECUÇÃO DO TESTE
// ============================================================================

export default function () {
  const vuId = __VU;
  const iterId = __ITER;

  // Proporção de tráfego recomendada: 80% leitura (GET) e 20% escrita (POST)
  const isWriteTransaction = Math.random() < 0.20;

  if (!isWriteTransaction) {
    // ------------------------------------------------------------------------
    // FLUXO DE LEITURA (80%): Validação de Transaction Pooling sem Locks
    // Correlaciona com: cl_active crescendo, sv_idle baixo e cl_waiting zerado
    // ------------------------------------------------------------------------
    const endpoints = [
      '/api/appointments?limit=20',
      '/api/services',
      '/api/clients?limit=10',
    ];
    const chosenEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const readUrl = `${BASE_URL}${chosenEndpoint}`;

    const res = http.get(readUrl, {
      headers: REQUEST_HEADERS,
      tags: { name: 'PGBOUNCER_READ_TRANSACTION' },
      timeout: '5s',
    });

    // Registra latência da consulta no Trend
    dbReadDuration.add(res.timings.duration);

    // Avalia falha de conexão de baixo nível (status 0 ou 5xx)
    const isConnErr = res.status === 0 || res.status >= 500;
    connectionErrors.add(isConnErr);

    // Avalia esgotamento explícito de pool (HTTP 503)
    const isPoolExhausted = res.status === 503;
    poolExhaustionErrors.add(isPoolExhausted);

    if (res.status === 200) {
      successfulReads.add(1);
    }

    // Asserções estritas
    check(res, {
      'leitura bem-sucedida (HTTP 200)': (r) => r.status === 200,
      'conexão não recusada pelo PgBouncer (!= 503)': (r) => r.status !== 503,
      'sem timeout de gateway (!= 504)': (r) => r.status !== 504,
      'latência de leitura < 1000ms': (r) => r.timings.duration < 1000,
    });
  } else {
    // ------------------------------------------------------------------------
    // FLUXO DE ESCRITA (20%): Validação de Transação Atômica & Mutex
    // Correlaciona com: sv_active alto no Postgres e tempo de lock de linha
    // ------------------------------------------------------------------------
    const writeUrl = `${BASE_URL}/api/appointments`;
    const payload = JSON.stringify({
      barber_id: 'barber_thiago',
      service_id: 'srv_corte_degrade',
      client_name: `k6_perf_vu_${vuId}_iter_${iterId}`,
      client_phone: '(11) 98765-4321',
      booking_date: '2026-10-30',
      start_time: '14:30',
      end_time: '15:15',
      price: 55.0,
      request_source: 'k6-metrics-audit',
    });

    const res = http.post(writeUrl, payload, {
      headers: REQUEST_HEADERS,
      tags: { name: 'PGBOUNCER_WRITE_TRANSACTION' },
      timeout: '5s',
    });

    // Registra latência da transação
    dbWriteDuration.add(res.timings.duration);

    const isConnErr = res.status === 0 || res.status >= 500;
    connectionErrors.add(isConnErr);

    const isPoolExhausted = res.status === 503;
    poolExhaustionErrors.add(isPoolExhausted);

    if (res.status === 201 || res.status === 409) {
      // 201 = Criado com sucesso; 409 = Conflito de concorrência previsto (Double Booking bloqueado)
      successfulWrites.add(1);
    }

    check(res, {
      'escrita aceita ou conflito tratado (HTTP 201 ou 409)': (r) => r.status === 201 || r.status === 409,
      'zero esgotamento de pool PgBouncer (!= 503)': (r) => r.status !== 503,
      'sem timeout de transação Postgres (!= 504)': (r) => r.status !== 504,
      'latência de escrita < 1500ms': (r) => r.timings.duration < 1500,
    });
  }

  // Sleep dinâmico com jitter (50ms ~ 150ms) simulando comportamento de usuário real
  sleep(0.05 + Math.random() * 0.1);
}
