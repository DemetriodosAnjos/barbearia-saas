# Barbearia SaaS (V1.5.1.8)

Sistema SaaS multi-tenant completo e de alta performance para barbearias, com controle de agendamentos em tempo real, comissões automáticas por profissional, frente de caixa (PDV), portal do cliente e integração nativa com o gateway **Mercado Pago** (PIX Instantâneo e Checkout Pro).

---

## 🚀 Principais Módulos

- **Portal de Agendamento do Cliente (`client-app`)**: Funil responsivo para clientes agendarem serviços, escolherem barbeiro preferido, visualizarem horários livres em tempo real e receberem confirmações.
- **Painel Administrativo da Barbearia (`barbershop`)**:
  - Agenda interativa em tempo real com timeline de barbeiros.
  - Gestão de equipe, cadeiras, escalas e cálculo automatizado de comissões.
  - Frente de caixa (PDV) com comandas abertas/fechadas e baixa imediata.
  - Catálogo de serviços e controle de estoque de produtos.
  - Métricas e relatórios financeiros (faturamento bruto, ticket médio, lucro líquido e repasses).
- **Modal de Planos & Assinaturas (`TrialBanner`)**:
  - Título oficial: *"Escolha o plano ideal para sua barbearia"*.
  - **Plano de Teste**: 7 dias de avaliação gratuita com todas as ferramentas liberadas.
  - **Starter**: 1 cadeira / barbeiro para autônomos.
  - **Pro**: Até 6 barbeiros, comissões automáticas, lembretes via WhatsApp e Checkout Pro em até 12x.
  - **Entreprise**: Cadeiras ilimitadas, multi-unidades, pacote white-label e suporte prioritário VIP.
  - Botões integrados à API oficial do Mercado Pago para geração dinâmica de links de pagamento.
  - Botão de confirmação: *"Continuar para pagamento seguro"*.
- **Painel SuperAdmin (`superadmin`)**: Gestão global de barbearias/tenants, parâmetros da plataforma e credenciais de pagamento.

---

## 🛡️ DevSecOps & Segurança

- **Secret Scanning**: Verificação automatizada de credenciais com Gitleaks e TruffleHog.
- **SAST (Static Application Security Testing)**: Regras do OWASP Top 10 e AppSec analisadas via Semgrep.
- **SCA (Software Composition Analysis)**: Auditoria estrita de dependências com `npm audit` (0 vulnerabilidades High/Critical).
- **Proteção XSS**: Sanitização de saídas com `<SafeHtml>` e DOMPurify.
- **Defesa contra SSRF**: Validação rigorosa de URLs de saída (`SafeHttpClient` / `ssrfGuard`).
- **Validação de Schemas**: Validação de todas as entradas de API com Zod.

---

## 🛠️ Tecnologias

- **Front-end**: React 19 + TypeScript + Vite + Tailwind CSS.
- **Back-end & Banco de Dados**: Supabase (PostgreSQL) com Row Level Security (RLS).
- **Pagamentos**: Mercado Pago REST API & SDK oficial.
- **Testes & CI/CD**: GitHub Actions, Playwright, Vitest.

---

## 📦 Instalação e Execução Local

```bash
# Instalar dependências
npm install --legacy-peer-deps

# Iniciar servidor de desenvolvimento (porta 3000)
npm run dev

# Compilar para produção
npm run build

# Executar linting de tipos
npm run lint
```
