# Estrutura do Banco de Dados: Supabase PostgreSQL (01-database-schema.md)

Este documento define a Fonte Única da Verdade (SSOT) para os schemas de banco de dados do projeto. Todas as mutações e consultas no Supabase devem aderir a estes tipos.

---

## 1. Tabela: `appointments` (Agendamentos da Barbearia)

Tabela central do núcleo (Core) da aplicação onde convergem clientes, profissionais, horários e valores.

| Nome da Coluna | Tipo de Dado (PostgreSQL) | Obrigatório | Descrição / Regra |
|---|---|---|---|
| `id` | `text` | Sim | Identificador único do agendamento (ex: `apt-17282829291` ou UUID). |
| `barbershop_id` | `uuid` | Sim | Chave estrangeira vinculando a barbearia/tenant (Multi-tenant). |
| `barber_id` | `text` | Sim | Identificador do barbeiro selecionado. |
| `barber_name` | `text` | Não | Nome do barbeiro para desnormalização de consulta rápida. |
| `client_name` | `text` | Sim | Nome completo do cliente agendado. |
| `client_phone` | `text` | Sim | Telefone/WhatsApp com DDD do cliente para confirmações. |
| `service_name` | `text` | Sim | Nome do serviço solicitado (ex: "Corte Tradicional"). |
| `date` | `date` | Sim | Data do atendimento no formato `YYYY-MM-DD`. |
| `start_time` | `text` | Sim | Horário de início no formato `HH:MM` (ex: "10:15"). |
| `end_time` | `text` | Sim | Horário de término estimado (`start_time` + `duration_minutes`). |
| `duration_minutes`| `integer` | Sim | Duração do atendimento em minutos (ex: 30, 45, 60). |
| `price` | `numeric` | Sim | Valor cobrado pelo serviço (ex: 45.00). |
| `status` | `text` | Sim | Status operacional: `'confirmed'`, `'in_service'`, `'completed'`, `'cancelled'`. |
| `is_paid` | `boolean` | Sim | Flag indicando se o atendimento já foi quitado no caixa. |
| `is_vip` | `boolean` | Não | Flag indicando atendimento VIP ou cliente prioritário. |
| `notes` | `text` | Não | Observações e preferências do cliente. |
| `created_at` | `timestamp with time zone` | Sim | Timestamp de criação do registro no banco. |

---

## 2. Tabela: `barbers` (Equipe de Barbeiros)

Mapeamento exato de todas as 20 colunas SQL oficiais no Supabase:

| Nome da Coluna | Tipo de Dado (PostgreSQL) | Obrigatório | Descrição / Regra |
|---|---|---|---|
| `id` | `text` | Sim | Identificador único do barbeiro (ex: `barb-1` ou UUID). |
| `barbershop_id` | `uuid` | Sim | Chave estrangeira da barbearia proprietária (Multi-tenant). |
| `name` | `text` | Sim | Nome completo do profissional. |
| `display_name` | `text` | Não | Nome de exibição na agenda de atendimentos. |
| `role` | `text` | Sim | Cargo/Nível (ex: `'Barbeiro Profissional'`, `'Master Barber'`). |
| `avatar` | `text` | Não | Iniciais, URL de foto ou ícone do profissional. |
| `rating` | `numeric` | Não | Avaliação média (0.0 a 5.0). Padrão: 5.0. |
| `review_count` | `integer` | Não | Total de avaliações recebidas. |
| `status` | `text` | Sim | Status operacional: `'active'`, `'vacation'`, `'inactive'`. |
| `specialties` | `ARRAY` (`text[]`) | Não | Lista de especialidades (ex: `['Degradê', 'Barboterapia']`). |
| `breaks` | `jsonb` | Não | Intervalos e pausas do profissional. |
| `created_at` | `timestamp with time zone` | Sim | Data e hora de cadastro no sistema. |
| `commission_percentage` | `numeric` | Não | Percentual geral de comissão padrão. |
| `schedule` | `jsonb` | Não | Escala semanal com horários de entrada e saída por dia. |
| `email` | `text` | Não | E-mail de contato / login. |
| `phone` | `text` | Não | Telefone / WhatsApp do profissional. |
| `pix_key` | `text` | Não | Chave PIX (CPF, E-mail, Telefone ou Aleatória/EVP). |
| `service_commission` | `numeric` | Sim | Comissão sobre serviços realizados (0 a 100%). |
| `product_commission` | `numeric` | Sim | Comissão sobre venda de produtos (0 a 100%). |
| `notes` | `text` | Não | Anotações administrativas sobre o membro da equipe. |

---

## 3. Tabela: `tenants` (Barbearias / Clientes SaaS - Painel SuperAdmin & Onboarding)

Mapeamento exato das **18 colunas SQL oficiais** da tabela `public.tenants` no Supabase, compartilhada de maneira unificada entre o fluxo de **Onboarding (`OnboardingWizard.jsx`)**, a sincronização de sessão (`App.jsx`) e o **Painel SuperAdmin (`SuperAdminDashboard.jsx`)**:

| Nome da Coluna | Tipo de Dado (PostgreSQL) | Obrigatório | Descrição / Regra |
|---|---|---|---|
| `id` | `uuid` | Sim | Identificador único da barbearia/tenant (chave primária compartilhada com `barbershops.id` e `profiles.barbershop_id`). |
| `name` | `text` | Sim | Nome comercial da barbearia (ex: `"Barbearia Dos Anjos"`). |
| `slug` | `text` | Sim | Identificador amigável de URL da barbearia (ex: `"barbearia-dos-anjos"`). |
| `created_at` | `timestamp with time zone` | Sim | Data e hora de criação do registro do tenant. |
| `updated_at` | `timestamp with time zone` | Sim | Data e hora da última atualização cadastral ou de plano. |
| `owner_name` | `text` | Sim | Nome completo do proprietário / gestor responsável. |
| `owner_email` | `text` | Sim | E-mail de login do proprietário (`auth.users.email` em minúsculas). |
| `phone` | `text` | Não | Telefone / WhatsApp comercial com DDD (ex: `"(11) 94060-3522"`). |
| `plan` | `text` | Sim | Plano contratado: `'starter'`, `'pro'` ou `'enterprise'`. |
| `status` | `text` | Sim | Status operacional da assinatura: `'active'`, `'trial'`, `'past_due'`, `'suspended'`, `'cancelled'`. |
| `barbers_count` | `integer` | Sim | Quantidade de profissionais vinculados / limite ativo (padrão inicial: `1`). |
| `mrr` | `numeric` | Sim | Receita recorrente mensal estimada do plano (ex: `69.90`, `149.90`, `279.90`). |
| `trial_days_left` | `integer` | Sim | Dias restantes de avaliação gratuita (padrão no Onboarding: `7`). |
| `trial_ends_at` | `timestamp with time zone` | Não | Data/hora limite do período de avaliação gratuita (`now() + 7 days`). |
| `has_white_label` | `boolean` | Sim | Indica se o recurso White-Label está habilitado para o tenant (`true` / `false`). |
| `brand_primary` | `text` | Não | Cor hexadecimal primária da marca (padrão: `'#ea580c'`). |
| `brand_secondary` | `text` | Não | Cor hexadecimal secundária da marca (padrão: `'#16a34a'`). |
| `logo_url` | `text` | Não | URL da logomarca customizada da barbearia. |

> **Atenção:** A tabela `public.tenants` **NÃO** possui coluna `owner_id`. O vínculo com o proprietário autenticado ocorre via `id` (`user_metadata.barbershop_id` / `profiles.barbershop_id`) e `owner_email`. Toda criação ou atualização deve utilizar `buildTenantRecordPayload()` (`src/lib/supabase.js`).

---

## 4. Tabela: `authentication / users` & `profiles` (Supabase Auth & Perfis)

| Nome da Coluna | Tipo de Dado | Descrição |
|---|---|---|
| `id` | `uuid` | ID único do usuário no Supabase Auth (`auth.users.id` / `profiles.id`). |
| `email` | `text` | E-mail corporativo / credencial de acesso (`owner_email` na tabela `tenants`). |
| `raw_user_meta_data` | `jsonb` | Metadados sincronizados (`{ role: 'admin', barbershop_id, tenant_id, name, owner_name, owner_email, barbershop_name, slug, phone, plan, status, trial_days_left, trial_ends_at }`). |
| `role` | `text` | Papel RBAC compatível com a constraint `profiles_role_check` (`'admin'`, `'employee'`, `'client'`) e `'superadmin'` no JWT. Papéis legados (`'owner'`, `'tenant'`) são normalizados automaticamente para `'admin'`. |

---

## 5. Tabela: `services` (Catálogo de Serviços)

| Nome da Coluna | Tipo de Dado | Descrição |
|---|---|---|
| `id` | `text` / `uuid` | ID do serviço. |
| `barbershop_id` | `uuid` | Barbearia proprietária. |
| `name` | `text` | Nome do serviço. |
| `category` | `text` | Categoria (`Cabelo`, `Barba`, `Combo`). |
| `price` | `numeric` | Preço de venda. |
| `duration_minutes` | `integer` | Tempo de cadeira estimado. |
| `active` | `boolean` | Disponível para agendamento. |

---

## 4. Tabela: `products` (Estoque e Bar)

| Nome da Coluna | Tipo de Dado | Descrição |
|---|---|---|
| `id` | `text` / `uuid` | ID do produto. |
| `barbershop_id` | `uuid` | Barbearia proprietária. |
| `name` | `text` | Nome do produto. |
| `category` | `text` | `'Vitrine'` (pomadas, óleos) ou `'Bar'` (cervejas, refrigerantes). |
| `cost_price` | `numeric` | Preço de custo. |
| `price` | `numeric` | Preço de venda. |
| `stock` | `integer` | Quantidade em estoque. |
| `commission_percent` | `numeric` | Comissão do barbeiro pela venda. |
| `active` | `boolean` | Ativo para venda no POS. |

---

## 5. Tabela: `clients` (Cadastro de Clientes)

| Nome da Coluna | Tipo de Dado | Descrição |
|---|---|---|
| `id` | `text` / `uuid` | ID do cliente. |
| `barbershop_id` | `uuid` | Barbearia proprietária (Multi-tenant). |
| `name` | `text` | Nome completo do cliente. |
| `phone` | `text` | WhatsApp com DDD `(XX) XXXXX-XXXX`. |
| `email` | `text` | E-mail opcional. |
| `notes` | `text` | Histórico e preferências do cliente. |
| `is_vip` | `boolean` | Indicador de cliente fidelizado. |
| `created_at` | `timestamp with time zone` | Data de inclusão. |

---

## 6. Tabela: `comandas` (Frente de Caixa e Contas)

| Nome da Coluna | Tipo de Dado | Descrição |
|---|---|---|
| `id` | `text` / `uuid` | ID da comanda. |
| `barbershop_id` | `uuid` | Barbearia proprietária. |
| `client_name` | `text` | Nome do cliente. |
| `barber_id` | `text` | Barbeiro responsável. |
| `status` | `text` | `'open'`, `'paid'`, `'cancelled'`. |
| `subtotal` | `numeric` | Valor total dos serviços e itens antes de desconto. |
| `discount` | `numeric` | Desconto aplicado. |
| `total` | `numeric` | Total quitado. |
| `payment_method` | `text` | Forma de quitação (`'pix'`, `'credit'`, `'debit'`, `'cash'`). |
| `items` | `jsonb` | Array com lista de itens e comissões. |
| `created_at` | `timestamp with time zone` | Abertura da comanda. |

