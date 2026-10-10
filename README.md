# Barbearia SaaS (V1.5.1.9)

Sistema SaaS multi-tenant completo e de alta performance para barbearias, com controle de agendamentos em tempo real, comissões automáticas por profissional, frente de caixa (PDV), portal do cliente e integração nativa com o gateway **Mercado Pago** (PIX Instantâneo e Checkout Pro).

---

## 🔐 Autenticação & Tela de Login (`Login`)

A tela de autenticação oficial foi configurada com os seguintes padrões de UX e segurança:

1. **Identidade Visual**:
   - Título oficial atualizado: **Barbearia SaaS**.
   - Subtítulo e branding integrado com tema dark/amber.

2. **Proteção Anti-Automação (Cloudflare Turnstile)**:
   - Ativação manual mediante **clique do mouse** do usuário no desafio de segurança.
   - Validação criptográfica do token antes de permitir o envio das credenciais.
   - Proteção estrita contra força bruta (máximo de 5 tentativas com bloqueio temporário).

3. **Ordem dos Botões de Login**:
   - **Botão Primário**: `Entrar na Plataforma` (envio de e-mail e senha validados).
   - **Acesso Social**: Botão `Entrar com o Google` (OAuth Supabase) posicionado imediatamente **abaixo** do botão primário.
   - Remoção de botões de atalho/teste não autenticados no fluxo de login em produção.

4. **Recuperação de Senha**:
   - Modal integrada com verificação OTP via Supabase Auth e redefinição segura de credenciais.

---

## 🚀 Principais Módulos

- **Portal de Agendamento do Cliente (`client-app`)**:
  - Funil responsivo para clientes agendarem serviços, escolherem barbeiro preferido, visualizarem horários livres em tempo real e receberem confirmação via WhatsApp.

- **Painel Administrativo da Barbearia (`barbershop`)**:
  - **Agenda Interativa**: Marcação de horários com timeline dos barbeiros.
  - **Frente de Caixa (PDV)**: Abertura e fechamento de comandas, comissões automáticas e baixa imediata.
  - **Equipe e Cadeiras**: Escalas, comissões percentuais e perfis.
  - **Catálogo & Estoque**: Gestão de serviços e produtos para venda no balcão.
  - **Relatórios Financeiros**: Faturamento bruto, repasses, ticket médio e lucro líquido.

- **Painel SuperAdmin (`superadmin`)**:
  - Gestão global de barbearias/tenants cadastrados na plataforma.
  - Configuração do gateway Mercado Pago (Chave Pública, Access Token, telemetria e teste de conectividade).
  - Gestão de planos (Starter, Pro, Enterprise) e assinaturas.

- **Onboarding de Novas Barbearias (`onboarding`)**:
  - Wizard guiado passo a passo para cadastrar unidade, slug personalizado e dados fiscais.

- **DevSecOps & QA Studio (`qa-panel`)**:
  - Central de testes de segurança OWASP, verificação de cabeçalhos SSRF e matriz de controle de acesso (RBAC).

---

## 🛠️ Tecnologias

- **Front-end**: React 19 + TypeScript + Vite + Tailwind CSS.
- **Back-end & Banco de Dados**: Supabase (PostgreSQL) com Row Level Security (RLS).
- **Segurança**: Cloudflare Turnstile, sanitização DOMPurify, Zod schemas e proteção CSRF/SSRF.
- **Pagamentos**: Mercado Pago REST API & SDK oficial.
- **Recuperação de Senha**: Supabase SQL (`tenants`/`barbers`), código de 6 dígitos via SMTP, timer regressivo de 3 min e modal de erro padronizado (`docs/recuperacao-de-senha-auth.md`).

---

## 📦 Execução Local

```bash
# Iniciar servidor de desenvolvimento (porta 3000)
npm run dev

# Compilar para produção
npm run build

# Executar checagem de tipos
npm run lint
```
