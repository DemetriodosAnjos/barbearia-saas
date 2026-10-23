# Módulo 4: Roteiro de Análise de Métricas e Logs do PgBouncer

> **Atuação:** Performance Engineer / SRE Lead  
> **Escopo:** Supabase PostgreSQL, PgBouncer (Transaction Pooling) & k6 Load/Stress Testing  
> **Artefatos:** `test-metrics-audit.js`, `test-load.js`, `test-stress.js`

---

## 1. Cruzamento de Métricas: Relatório k6 vs Dashboard Supabase / PostgreSQL

Para diagnosticar com precisão o comportamento da infraestrutura sob carga, o Performance Engineer deve cruzar as métricas de tempo de resposta e falhas reportadas pelo k6 com as quatro métricas fundamentais do pool PgBouncer extraídas via dashboard do Supabase ou consulta administrativa (`SHOW POOLS;`):

| Métrica PgBouncer | Definição Operacional | Comportamento Ideal em Carga | Alerta Crítico (Saturação) |
|---|---|---|---|
| **`cl_active`** *(Client Active)* | Conexões de clientes (VUs do k6 / Workers da API) que estão ativamente conectadas ao PgBouncer e transacionando. | Acompanha a curva de VUs do k6 de forma linear (ex: 50 a 500 conexões ativas). | Próximo ou igual a `max_client_conn` (ex: 1.000). Indica risco iminente de recusa de novas conexões HTTP. |
| **`cl_waiting`** *(Client Waiting)* | Conexões de clientes que enviaram uma query/transação mas estão **enfileiradas na memória do PgBouncer** aguardando uma conexão de servidor (`sv`) ficar livre. | **Deve ser 0** durante operação normal e picos rápidos. Valores esporádicos < 10 com duração < 50ms são toleráveis. | **`cl_waiting > 0` constante e crescente.** Indica que todas as conexões físicas do Postgres estão ocupadas; a latência percebida pelo k6 dispara em cauda longa (p95/p99). |
| **`sv_active`** *(Server Active)* | Conexões físicas reais com o processo do PostgreSQL que estão executando consultas SQL naquele exato instante. | Oscila entre 5 e `default_pool_size` (ex: 20 ~ 30). | **Fixado no valor máximo de `default_pool_size` (100% de ocupação do pool de backend).** |
| **`sv_idle`** *(Server Idle)* | Conexões físicas com o PostgreSQL que estão abertas, autenticadas e ociosas no pool, prontas para receber a próxima transação sem custo de handshake TCP/TLS. | Alto durante tráfego normal (> 15) e reduz temporariamente durante rajadas de carga. | **`sv_idle = 0` com `cl_waiting > 0`.** Significa que nenhuma conexão de servidor está livre para atender os clientes em espera. |

---

## 2. Diagnóstico de Gargalos: PgBouncer (Pool Exhaustion) vs PostgreSQL (CPU / Disco)

| Sintoma Observado | Diagnóstico | Causa Raiz | Ação Recomendada |
|---|---|---|---|
| • `cl_waiting` sobe continuamente.<br>• `sv_active` = `default_pool_size` (máximo).<br>• Latência k6 (p95 e p99) cresce linearmente.<br>• **CPU do PostgreSQL está BAIXA (< 50%).**<br>• **I/O de Disco (IOPS) está NORMAL.** | **Gargalo no PgBouncer (Pool Exhaustion)** | O pool de conexões do servidor (`default_pool_size = 30`) está subdimensionado para a concorrência de 500 VUs, mas o hardware do banco de dados ainda possui folga considerável de processamento. | 1. Elevar `default_pool_size` no Supabase Dashboard de 30 para 60 conexões.<br>2. Manter Pool Mode em **Transaction**.<br>3. Ajustar `pool_mode = transaction` e garantir que o ORM não utilize prepared statements nomeados. |
| • `cl_waiting` sobe.<br>• `sv_active` atinge o teto.<br>• Latência k6 dispara (> 2.000ms).<br>• **CPU do PostgreSQL atinge 90% ~ 100%.**<br>• **Disco atinge o teto de IOPS / Burst Credit esgotado.**<br>• Query durations altas no `pg_stat_activity`. | **Gargalo no Banco PostgreSQL (CPU / E-S de Disco)** | As queries SQL executadas pelas conexões ativas estão lentas (Sequential Scans por falta de índices, transações longas sem COMMIT rápido ou locks de linha concorrentes). O PgBouncer não consegue liberar as conexões `sv_active` porque o banco demora para responder. | 1. Inspecionar `pg_stat_statements` e adicionar índices nas colunas filtradas (`tenant_id`, `client_name`, `booking_date`).<br>2. Reduzir `statement_timeout` para 5s e `idle_in_transaction_session_timeout` para 3s.<br>3. Fazer upgrade de Compute Add-on no Supabase (Micro -> Small/Medium). |
| • Erros HTTP 503 / `connection_refused` no k6.<br>• `cl_active` atinge 1.000.<br>• PgBouncer log: *"server login failed: no more connections allowed"*. | **Esgotamento de Clientes PgBouncer** | O limite de clientes simultâneos (`max_client_conn`) foi ultrapassado. | Elevar `max_client_conn` de 1.000 para 2.000 ou desacoplar rotas públicas via Edge Caching / CDN. |

---

## 3. Comandos CLI do k6 com Injeção de Variáveis via `-e`

Execute os testes diretamente no terminal passando as variáveis de ambiente equivalentes às do projeto Vite/Node:

```bash
# 1. Execução padrão local lendo variáveis de ambiente customizadas via -e
k6 run \
  -e BASE_URL=http://localhost:3000 \
  -e VITE_SUPABASE_URL=https://<project-ref>.supabase.co \
  -e SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn... \
  test-metrics-audit.js

# 2. Execução com VUs e duração customizados em tempo de execução via CLI
k6 run \
  -e BASE_URL=http://localhost:3000 \
  -e START_VUS=50 \
  -e VITE_SUPABASE_URL=https://<project-ref>.supabase.co \
  -e SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn... \
  --vus 200 \
  --duration 2m \
  test-metrics-audit.js

# 3. Execução exportando sumário JSON para esteiras de CI/CD (GitHub Actions)
k6 run \
  -e BASE_URL=http://localhost:3000 \
  -e VITE_SUPABASE_URL=https://<project-ref>.supabase.co \
  -e SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn... \
  --summary-export=reports/k6-metrics-summary.json \
  test-metrics-audit.js
```

---

## 4. Checklist Prático para o Engenheiro de Performance

1. [ ] **Verificar Modo de Pooling:** Confirmar se o Supabase está operando na porta `6543` com `pool_mode = transaction`.
2. [ ] **Monitorar `cl_waiting`:** Garantir que `cl_waiting` permaneça em 0 durante o estágio de rampa (50 -> 500 VUs).
3. [ ] **Validar Thresholds:** Confirmar que `abortOnFail: true` interrompe o teste se `http_req_failed` ou `connection_errors` ultrapassar 1%.
4. [ ] **Auditar Cauda Longa (p95 e p99):** Garantir que p95 fique abaixo de 500ms e p99 abaixo de 1.500ms.
5. [ ] **Inspecionar CPU do Postgres:** Se p95 subir e CPU < 50%, aumentar o `default_pool_size`. Se CPU > 85%, otimizar queries e índices SQL.
