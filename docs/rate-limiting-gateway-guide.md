# Guia de Engenharia de Infraestrutura: Rate Limiting Multi-Camadas (Borda & Aplicação)

**Projeto:** Barbearia SaaS Multi-Tenant Core  
**Especialista:** Infrastructure Engineer / SRE & DevSecOps  
**Escopo:** Prompt 22 - Rate Limiting em Nível de Aplicação e Gateway de Borda  
**Classificação:** Confidencial / Engenharia de Segurança & Operações  

---

## 1. Visão Geral e Arquitetura de Defesa em Profundidade

O sistema adota uma estratégia de **Defesa em Profundidade (Defense-in-Depth)** para Rate Limiting, dividida em três perímetros concêntricos:

```
[ Cliente / Atacante / Botnet ]
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. BORDA (Cloudflare Anycast WAF / Gateway)                 │
│    • Limite Global: 300 req / min por IP                    │
│    • Ação: Managed Challenge / Drop nos 300+ PoPs Anycast   │
│    • CPU do backend poupada a 0% de custo de processamento  │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Tráfego legítimo filtrado)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. APLICAÇÃO (Express / Supabase Edge Functions Middleware) │
│    • /auth/login: max 5 tentativas / min por IP/usuário     │
│    • /api/payment: max 10 requisições / min por IP/tenant   │
│    • /api/* (Geral): max 100 requisições / min por IP       │
│    • Resposta RFC 6585: HTTP 429 Too Many Requests          │
│    • Cabeçalho Obrigatório: Retry-After: <segundos>         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. PERSISTÊNCIA & POOLING (PgBouncer / PostgreSQL)          │
│    • Transaction Pooling na porta 6543                      │
│    • Proteção contra saturação de pool de conexões (503)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Matriz de Cotas e Thresholds por Rota

| Escopo / Rota | Cota Máxima | Janela Temporal | Ação no Estouro | Cabeçalho `Retry-After` | Vulnerabilidade Mitigada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`/auth/login`** | **5 requisições** | 60 segundos (1 min) | **HTTP 429** (Block) | `Retry-After: 60s` | Força Bruta, Credential Stuffing e Enumeração de Contas |
| **`/api/payment`** | **10 requisições** | 60 segundos (1 min) | **HTTP 429** (Block) | `Retry-After: 60s` | Carding Attacks, Fraude de Teste de Cartões e Bloqueio de Gateway |
| **`/api/*` (Geral)** | **100 requisições** | 60 segundos (1 min) | **HTTP 429** (Block) | `Retry-After: 60s` | Esgotamento de Recursos, Scraping Agressivo e Exaustão de Pool |
| **Global Borda (IP)** | **300 requisições** | 60 segundos (1 min) | **Managed Challenge** | Desafio Cloudflare | Ataques Volumétricos DDoS L7 e Botnets Distribuídas |

---

## 3. Especificação RFC de Cabeçalhos HTTP de Resposta

Conforme a RFC 6585 e o draft IETF de RateLimit Headers, a aplicação emite os seguintes cabeçalhos em cada resposta:

### 3.1 Em Requisições Aceitas (HTTP 200 / 201)
```http
HTTP/1.1 200 OK
RateLimit-Limit: 10
RateLimit-Remaining: 9
RateLimit-Reset: 58
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 58
```

### 3.2 Em Requisições Bloqueadas por Estouro de Cota (HTTP 429 Too Many Requests)
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json; charset=utf-8
Retry-After: 54
RateLimit-Limit: 10
RateLimit-Remaining: 0
RateLimit-Reset: 54
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 54

{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Taxa de requisições excedida. Limite de 10 requisições por minuto atingido para a rota /api/payment.",
  "route": "/api/payment",
  "limit": 10,
  "windowSeconds": 60,
  "retryAfterSeconds": 54,
  "timestamp": "2026-09-29T13:45:00.000Z"
}
```

---

## 4. Implementação em Nível de Aplicação (Código no Projeto)

Arquivo: `src/middleware/multiTierRateLimiter.ts`

### 4.1 Uso no Express Server
```typescript
import express from "express";
import { multiTierRateLimiterMiddleware } from "./src/middleware/multiTierRateLimiter";

const app = express();

// Aplicação global do middleware inteligente (auto-detecta /auth/login, /api/payment ou geral)
app.use(multiTierRateLimiterMiddleware);
```

### 4.2 Uso em Supabase Edge Functions (Deno)
```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { wrapEdgeFunctionWithRateLimit, RATE_LIMIT_TIERS } from "./multiTierRateLimiter.ts";

const handler = async (req: Request): Promise<Response> => {
  return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
};

// Envelopa o handler com o rate limit estrito de pagamentos (10 req/min)
serve(wrapEdgeFunctionWithRateLimit(handler, RATE_LIMIT_TIERS.PAYMENT_API));
```

---

## 5. Regras para o Gateway de Borda (Cloudflare WAF / API)

Arquivo exportável: `cloudflare-rate-limiting-rules.json`

### 5.1 Aplicação via Cloudflare API v4
```bash
curl -X PUT "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/rulesets/phases/http_ratelimit/entrypoint" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data @cloudflare-rate-limiting-rules.json
```

### 5.2 Configuração Equivalente NGINX (Reverse Proxy Alternativo)
```nginx
# /etc/nginx/conf.d/rate_limits.conf
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=payment_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;

server {
  listen 443 ssl http2;
  server_name api.barbeariasaas.com.br;

  # Rota Sensível 1: Auth / Login
  location = /auth/login {
    limit_req zone=auth_limit burst=2 nodelay;
    limit_req_status 429;
    proxy_pass http://app_upstream;
  }

  # Rota Sensível 2: Pagamento
  location ^~ /api/payment {
    limit_req zone=payment_limit burst=3 nodelay;
    limit_req_status 429;
    proxy_pass http://app_upstream;
  }

  # Rota Geral: API
  location ^~ /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    limit_req_status 429;
    proxy_pass http://app_upstream;
  }
}
```

---

## 6. Procedimento de Teste e Validação (CLI & k6)

### 6.1 Teste com cURL e Inspeção de Cabeçalhos
```bash
# Executa 6 requisições consecutivas no endpoint de login
for i in {1..6}; do
  echo "--- Requisição #$i ---"
  curl -i -s -X POST https://api.barbeariasaas.com.br/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@barbearia.com","password":"wrong"}' | grep -E "HTTP/|Retry-After|RateLimit"
done
```

**Resultado Esperado:**
- Requisições 1 a 5: `HTTP/1.1 200 OK` (ou 401 por senha incorreta) com `RateLimit-Remaining: 4, 3, 2, 1, 0`.
- Requisição 6: `HTTP/1.1 429 Too Many Requests` com cabeçalho `Retry-After: 60`.
