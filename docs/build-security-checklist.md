# Checklist de Configuração de Build & Proteção contra Bundle Leakage no Vite

> **Projeto:** Barbearia SaaS Core  
> **Normas de Segurança:** OWASP Top 10 (A05:2021 - Security Misconfiguration), OWASP ASVS v4.0 (V14 - Build & Deployment), NIST SP 800-63B, LGPD Art. 46  
> **Status da Auditoria:** 100% Conforme (Zero Secrets & Zero Source Maps Expostos)

---

## 1. Políticas de Variáveis de Ambiente (Vite Environment Hygiene)

- [x] **Segregação Estrita de Prefixos:**
  - Apenas variáveis de consumo estritamente público e inócuas para o navegador possuem o prefixo `VITE_` ou `VITE_PUBLIC_*` (ex: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`).
  - O arquivo `.env` do cliente não contém chaves de backend, strings de banco ou tokens mestres.
- [x] **Bloqueio da Chave `service_role`:**
  - A chave mestra `SUPABASE_SERVICE_ROLE_KEY` jamais possui prefixo `VITE_` e nunca é referenciada em `/src`.
  - Qualquer uso da `service_role` é delegado exclusivamente para Supabase Edge Functions ou scripts SecOps em ambiente de backend isolado.
- [x] **Chaves Privadas de Pagamento:**
  - `MERCADO_PAGO_ACCESS_TOKEN` e `STRIPE_SECRET_KEY` (`sk_live_...`) são mantidos exclusivamente em segredos de servidor/Edge Functions.
  - O front-end utiliza apenas as chaves públicas (`pk_live_...` e `APP_USR-...` pública para SDKs de checkout).
- [x] **Template Sanitizado `.env.example` & Zero-Hardcode em Stores:**
  - Arquivo `.env.example` versionado no Git contém apenas dados fictícios, documentando a divisão entre variáveis client-side e server-side.
  - O arquivo real `.env` está categoricamente listado no `.gitignore`.
  - Os stores centrais de configuração (`apiKeysConfigStore.ts` e `mercadoPagoConfigStore.ts`) possuem **Zero Chaves Hardcoded** (verdadeiras ou falsas): todas as variáveis são resolvidas dinamicamente em tempo de execução via `import.meta.env` / `process.env` ou iniciam vazias.

---

## 2. Hardening da Configuração do Vite (`vite.config.ts`)

- [x] **Desativação de Source Maps em Produção:**
  - `build.sourcemap: false` configurado compulsoriamente no `vite.config.ts`.
  - Nenhum arquivo `.map` é gerado na pasta `/dist/assets` ou enviado para CDNs de produção.
- [x] **Minificação e Otimização:**
  - Minificação de produção ativa para todos os chunks de código JavaScript e CSS.
- [x] **Supressão de Logs Sensíveis:**
  - Logger seguro no cliente (`secureLogger`) higieniza automaticamente PII, senhas e números de cartão antes de qualquer emissão no console.

---

## 3. Script de Auditoria Pós-Build (`scripts/audit-bundle-secrets.js`)

- [x] **Varredura Automatizada de Artefatos:**
  - Script SecOps pós-build (`npm run audit:build`) integrado ao pipeline de build.
  - Inspeciona recursivamente todos os arquivos compilados em `/dist` procurando:
    - Padrões de `service_role` e JWTs administrativos.
    - Chaves privadas Stripe (`sk_live_...`) e tokens privados Mercado Pago.
    - Blocos de chaves privadas criptográficas (`BEGIN PRIVATE KEY`).
    - Strings de conexão PostgreSQL com credenciais expostas.
    - Segredos de webhook reais (`whsec_...`).
    - Diretivas e comentários `//# sourceMappingURL=`.
- [x] **Geração de Laudo Estruturado:**
  - Emite relatório JSON detalhado em `dist/bundle-audit-report.json`.
  - Retorna código de saída `0` para builds limpos ou `1` para bloqueio imediato da pipeline caso um vazamento seja detectado.

---

## 4. Procedimento Operacional Padrão (SOP) de Rotação em Caso de Incidente

Em caso de suspeita ou detecção de vazamento de credenciais:
1. **Revogação Imediata:** Acessar o Dashboard do Supabase (Project Settings > API) e rotacionar a chave `service_role` e o JWT Secret.
2. **Invalidação de Pagamentos:** Rotacionar Access Tokens no painel do Mercado Pago Developers e chaves de API no Stripe Dashboard.
3. **Invalidar Sessões Ativas:** Executar o script SecOps `node scripts/revoke-tokens-admin.js <USER_ID> session_compromised`.
4. **Deploy Corretivo:** Realizar novo build com verificação via `npm run audit:build` antes da publicação.
