# Guia DevSecOps: Headers de Segurança e Content Security Policy (CSP) na Borda

> **Autor:** Equipe de DevSecOps & Cloud Engineering  
> **Status:** Homologado & Ativo em Produção  
> **Provedores Suportados:** Vercel Edge Network, Cloudflare Pages / CDN, Netlify Edge  
> **Conformidade:** OWASP Secure Headers Project, OWASP ASVS v4.0 (V14 - Configuration), PCI-DSS 4.0 (Req 6.4.3 e 11.6.1)

---

## 1. Visão Geral da Arquitetura de Defesa na Borda

A proteção de aplicações web modernas deve ser aplicada no ponto mais próximo possível do usuário final (Edge Network). Aplicar os cabeçalhos de segurança HTTP na CDN/borda garante:
1. **Proteção antes da chegada à origem:** Bloqueio de Clickjacking, MIME confusion e ataques baseados em protocolo antes de qualquer processamento da aplicação.
2. **Defesa em profundidade contra XSS:** O `Content-Security-Policy` atua como a última e mais poderosa linha de defesa no navegador caso algum vetor XSS consiga transpor a sanitização na camada de aplicação.
3. **Imunidade contra SSL Stripping:** O cabeçalho `Strict-Transport-Security` (HSTS) força a utilização perene de HTTPS com preloading nos navegadores.

---

## 2. Matriz de Cabeçalhos HTTP Mandatórios

| Cabeçalho HTTP | Valor Configurado | Objetivo e Impacto de Segurança |
| :--- | :--- | :--- |
| **`Content-Security-Policy`** | `default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://*.supabase.co https://*.mercadopago.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https: https://*.supabase.co https://images.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.mercadopago.com https://api.mercadopago.com https://*.googleapis.com; frame-src 'self' https://*.mercadopago.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;` | Restringe de onde recursos executáveis, estilos, conexões de dados (incluindo WebSockets do Supabase) e imagens podem ser carregados, eliminando canais não autorizados de exfiltração de dados e injeção XSS. |
| **`Strict-Transport-Security`** | `max-age=31536000; includeSubDomains; preload` | Força conexões HTTPS durante 1 ano (31.536.000s) e engloba todos os subdomínios, qualificando a aplicação para o catálogo HSTS Preload do Google Chrome e Firefox. |
| **`X-Frame-Options`** | `DENY` | Rejeita categoricamente a renderização da aplicação dentro de `<frame>`, `<iframe>` ou `<object>`, mitigando 100% dos ataques de Clickjacking (UI Redress). |
| **`X-Content-Type-Options`** | `nosniff` | Proíbe o navegador de deduzir dinamicamente (MIME sniffing) o tipo do arquivo, forçando a interpretação estrita do `Content-Type` declarado pelo servidor. |
| **`Referrer-Policy`** | `strict-origin-when-cross-origin` | Envia a URL de origem completa apenas em requisições de mesma origem HTTPS. Em requisições de terceiros, envia apenas o domínio base, evitando vazamento de tokens ou IDs confidenciais na query string. |
| **`Permissions-Policy`** | `camera=(), microphone=(), geolocation=(), payment=(self "https://*.mercadopago.com"), usb=(), interest-cohort=()` | Desativa recursos invasivos de hardware no navegador que a aplicação não utiliza e restringe a API de pagamento. |
| **`X-XSS-Protection`** | `1; mode=block` | Ativa o filtro heurístico de XSS em navegadores legados que ainda o suportem. |

---

## 3. Detalhamento da Content Security Policy (CSP)

A política foi construída especificamente para a stack React + Vite + Tailwind CSS + Supabase + Mercado Pago, balanceando rigor de segurança com funcionalidade:

1. **`connect-src 'self' https://*.supabase.co wss://*.supabase.co ...`:**  
   * **Essencial:** A inclusão de `wss://*.supabase.co` é obrigatória para permitir que os canais de **Supabase Realtime / WebSockets** (escuta de mudanças nas tabelas `appointments` e `transactions`) funcionem sem serem bloqueados pelo navegador.
2. **`script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ...`:**  
   * Permite que scripts do bundle Vite sejam executados e aceita scripts inline controlados gerados por frameworks modernos, mantendo compatibilidade com plugins Wasm e bibliotecas de SDK.
3. **`style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`:**  
   * Habilita a injeção dinâmica de regras de estilo do Tailwind CSS e fontes do Google.
4. **`object-src 'none'` e `base-uri 'self'`:**  
   * Bloqueia plugins legados (Flash, Java Applets) e impede a manipulação da tag `<base>` que poderia desviar o carregamento de scripts relativos.
5. **`frame-ancestors 'none'`:**  
   * Complementa o `X-Frame-Options: DENY` no padrão moderno CSP Level 3.

---

## 4. Arquivos de Configuração Prontos para Uso

### 4.1 Vercel (`vercel.json`)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://*.supabase.co https://*.mercadopago.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https: https://*.supabase.co https://images.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.mercadopago.com https://api.mercadopago.com https://*.googleapis.com; frame-src 'self' https://*.mercadopago.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=(self 'https://*.mercadopago.com'), usb=(), interest-cohort=()"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 4.2 Cloudflare Pages (`public/_headers` e `_headers`)
```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://*.supabase.co https://*.mercadopago.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https: https://*.supabase.co https://images.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.mercadopago.com https://api.mercadopago.com https://*.googleapis.com; frame-src 'self' https://*.mercadopago.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self 'https://*.mercadopago.com'), usb=(), interest-cohort=()
  X-XSS-Protection: 1; mode=block

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

### 4.3 Netlify (`netlify.toml`)
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://*.supabase.co https://*.mercadopago.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https: https://*.supabase.co https://images.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.mercadopago.com https://api.mercadopago.com https://*.googleapis.com; frame-src 'self' https://*.mercadopago.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), payment=(self 'https://*.mercadopago.com'), usb=(), interest-cohort=()"
    X-XSS-Protection = "1; mode=block"
```

---

## 5. Resumo Consolidado de Validação HMAC & Idempotência de Webhooks

A arquitetura de segurança da aplicação integra de ponta a ponta as seguintes blindagens em webhooks:

1. **Validação Criptográfica HMAC-SHA256:**
   * O payload bruto (`rawBody`) da requisição HTTP POST recebida de gateways (Mercado Pago, Stripe, etc.) é preservado como Buffer em memória antes de qualquer decodificação JSON.
   * A assinatura recebida no cabeçalho (ex: `x-signature` ou `v1,ts=...`) é comparada em **tempo constante** via `crypto.timingSafeEqual()` contra o HMAC calculado com a chave simétrica `WEBHOOK_SECRET`.
   * Bloqueio imediato (HTTP 401 Unauthorized) em casos de divergência ou ausência da assinatura, mitigando 100% dos ataques de Timing e falsificação de pagamento.

2. **Idempotência Transacional e Anti-Replay:**
   * Cada evento possui um identificador unívoco (`Idempotency-Key` ou `data.id`).
   * Verificação de janela temporal (tolerância de no máximo 300 segundos / 5 minutos) contra timestamps recebidos, neutralizando ataques de repetição (Replay Attacks).
   * Persistência na tabela relacional `webhook_idempotency_log` (com constraint UNIQUE em `idempotency_key` e locks atômicos).
   * Se um webhook repetido chegar, a resposta original concluída (HTTP 200) é recuperada do cache/banco sem reprocessar saldo ou agendamentos, impedindo dupla cobrança.

3. **Convergência com Headers de Borda:**
   * As chamadas de webhook recebem proteção de borda contra spoofing e têm origens de conectividade declaradas no `connect-src` e `frame-src` do CSP.

---

## 6. Comandos CLI para Auditoria dos Cabeçalhos em Produção

```bash
# Inspecionar cabeçalhos HTTP na borda
curl -sI https://sua-barbearia-saas.com.br | grep -Ei 'content-security|strict-transport|x-frame|x-content-type|referrer-policy'

# Testar se a conexão WebSockets com o Supabase é permitida pelo CSP
curl -sI https://sua-barbearia-saas.com.br | grep -i 'wss://*.supabase.co'

# Validar resposta com HSTS configurado
curl -sI https://sua-barbearia-saas.com.br | grep -i 'max-age=31536000'
```
