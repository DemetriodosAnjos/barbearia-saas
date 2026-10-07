# Contexto do Projeto: SaaS de Agendamento e Gestão para Barbearias (SaaS V1.5.1.0)

## 1. Visão Geral do Sistema
Plataforma SaaS Multi-tenant completa para gestão de barbearias, atendendo três públicos principais:
- **Cliente Final (App do Cliente / `client-app`):** Funil de agendamento online público, escolha de profissional, data, grade de horários disponíveis em tempo real e confirmação.
- **Dono & Equipe da Barbearia (Painel Administrativo / `barbershop`):** Gestão da agenda em tempo real (timeline/colunas por barbeiro), equipe e escala de trabalho, comissões de serviços/produtos, cadastro de serviços/produtos, comandas/POS, financeiro e clientes.
- **Fundadores da Plataforma (Painel SuperAdmin / `superadmin`):** Gestão global de barbearias (tenants), planos e assinaturas, credenciais Mercado Pago (Sandbox e Produção) e configurações globais de infraestrutura.

---

## 2. Arquitetura e Stack Tecnológica
- **Front-end:** React 18 (SPA) + Vite + TypeScript / JavaScript JSX + Tailwind CSS.
- **Back-end & Banco de Dados:** Supabase (PostgreSQL) com RLS (Row Level Security) e cliente unificado `@supabase/supabase-js`.
- **Gerenciamento de Estado:** React Context API (`BarbershopContext`, `AuthContext`) + TanStack React Query + estados locais tolerantes a falhas.
- **Camada de Armazenamento Seguro:** Adaptador `safeStorage` (`src/utils/safeStorage.ts`) com fallback transparente em memória (`InMemoryStorage`), blindado contra `SecurityError: Access is denied for this document` em ambientes isolados (Cursor IDE, iframes, modo privativo).
- **Integração de Pagamentos:** Mercado Pago SDK / REST API (Split de pagamentos, Sandbox/Live, suporte a chaves `APP_USR-` e `TEST-`, Webhook HMAC).
- **Estilização:** Tailwind CSS modularizado com classes isoladas em arquivos `*.styles.js` e tokens dinâmicos no `:root` (`theme.js`).

---

## 3. Diretrizes Inegociáveis para Geração e Manutenção de Código
1. **NUNCA REMOVER FUNCIONALIDADES EXISTENTES:** NUNCA remova funções, componentes, props, rotas, hooks ou tipos já existentes na base de código a menos que haja instrução explícita do usuário.
2. **PERSISTÊNCIA RESILIENTE (Safe Storage):** NUNCA acesse `window.localStorage` ou `window.sessionStorage` diretamente sem o adapter `safeStorage` / `safeSessionStorage` (`src/utils/safeStorage.ts`) ou blocos `try...catch` com valores de contingência, prevenindo acionamento de `ErrorBoundary`.
3. **FIDELIDADE AO SCHEMA DO BANCO:** Respeite rigorosamente as colunas e tipos das tabelas do Supabase (`appointments`, `barbers`, `barbershops`, `clients`, `comandas`, `plans`, `products`, `profiles`, `queue_tickets`, `saas_config`, `services`, `tenants`). Mantenha compatibilidade com propriedades duplas (snake_case para SQL e camelCase para o React).
4. **MULTI-TENANCY OBRIGATÓRIO:** Toda inserção no banco de dados deve vincular o `barbershop_id` / `tenant_id` (UUID) correspondente ao salão ativo.
5. **GRADE DE HORÁRIOS EM TEMPO REAL:** Na Agenda de Atendimentos, se a data do agendamento for hoje, a grade de horários NUNCA deve exibir horários iguais ou menores que o horário atual do relógio em tempo real.
6. **INTERFACE LIMPA (Clean UI):** NUNCA exibir telemetrias internas, logs de sistema, termos técnicos de segurança (ex: badges OWASP ASVS, Zero-XSS) ou detalhes de infraestrutura na interface final do usuário.
7. **MODAIS DE AÇÃO COM FEEDBACK VISUAL:** Operações críticas de persistência (como "Confirmar e Agendar") devem fornecer feedback visual imediato (Spinner / Overlay modal de 2s a 3s) indicando o progresso antes do fechamento.

---

## 4. Módulos do Sistema
1. **Agenda de Atendimentos (`ScheduleView` / `NewAppointmentModal` - CORE):**
   - Grade por barbeiro, cartões de atendimento, status dinâmicos (`confirmed`, `in_service`, `completed`, `cancelled`).
   - Modal de novo agendamento com grade estrita pós-horário atual, cálculo automático de tempo de cadeira e gravação direta no Supabase.
2. **Gestão de Equipe e Barbeiros (`BarbersTeamView`):**
   - Cadastro com cálculo de comissões (serviços e produtos), chave PIX com suporte a chave aleatória (EVP/UUID), escalas de trabalho e status.
3. **Catálogo de Serviços e Estoque de Produtos (`ServicesAndProductsView`):**
   - Categorias (Cabelo, Barba, Combo, Vitrine, Bar), preços, duração, custos e estoque.
4. **Frente de Caixa e Comandas (`CashierPosView`):**
   - Abertura de comandas por cliente/barbeiro, adição de serviços e itens do bar, fechamento com cálculo de comissões e repasses.
5. **Painel Financeiro & Métricas (`FinancialDashboardView`):**
   - Faturamento bruto, comissões a pagar, lucro líquido, ticket médio e fluxo diário.
6. **Diretório de Clientes (`ClientsDirectoryView`):**
   - Histórico de cortes, frequência, preferências e contato via WhatsApp.
7. **Configurações da Barbearia (`BarbershopSettingsView`):**
   - Identidade visual, horários de funcionamento, regras de agendamento e dados da empresa.
8. **Controle Global SaaS (`SuperAdminDashboard`):**
   - Visão consolidada de todas as barbearias, planos de assinatura e integração Mercado Pago.
