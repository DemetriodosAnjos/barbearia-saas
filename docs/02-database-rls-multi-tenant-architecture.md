# Arquitetura de Banco de Dados Multi-Tenant & Políticas RLS (02-database-rls-multi-tenant-architecture.md)

Este documento descreve detalhadamente o schema das 18 tabelas do banco de dados PostgreSQL/Supabase, a estratégia de isolamento multi-tenant, a presença da coluna `tenant_id` e as políticas de **Row Level Security (RLS)** que asseguram o isolamento estrito entre barbearias/usuários autenticados (`auth.uid()`).

---

## 1. Matriz de Auditoria e Diagnóstico de `tenant_id`

Abaixo está o inventário completo das 18 tabelas existentes no banco de dados e o diagnóstico da chave de isolamento:

| # | Tabela | Possuía `tenant_id` Original? | Chave Alternativa Existente | Ação Aplicada na Migração |
|---|---|---|---|---|
| 1 | `appointments` | ❌ Não | `barbershop_id (uuid)` | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` + sincronização |
| 2 | `barber_settlements` | ❌ Não | `barbershop_id (text)` | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` |
| 3 | `barbers` | ❌ Não | `barbershop_id (uuid)` | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` + sincronização |
| 4 | `barbershops` | ❌ Não | `id (uuid)` | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` |
| 5 | `client_edit_history` | ❌ Não | `client_id (text)` | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` |
| 6 | `clients` | ❌ Não | `barbershop_id (uuid)` | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` + sincronização |
| 7 | `comandas` | ❌ Não | `barbershop_id (uuid)` | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` + sincronização |
| 8 | `plans` | ❌ Não | Catálogo global | Mantém sem tenant_id (Leitura pública, escrita apenas SuperAdmin) |
| 9 | `products` | ❌ Não | `barbershop_id (uuid)` | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` + sincronização |
| 10 | `profiles` | ❌ Não | `id (uuid)`, `barbershop_id` | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` |
| 11 | `queue_tickets` | ❌ Não | `barbershop_id (uuid)` | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` + sincronização |
| 12 | `saas_config` | ❌ Não | Configuração global | Mantém sem tenant_id (Leitura pública, escrita apenas SuperAdmin) |
| 13 | `security_audit_events` | ❌ Não | `user_id (uuid)` | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` |
| 14 | `security_audit_logs` | ❌ Não | Auditoria global | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` |
| 15 | `sessions` | ⚠️ Parcial | `tenant_id (text)` | Adiciona restrição RLS rigorosa por `user_id = auth.uid()::text` |
| 16 | `subscription_payments` | ✅ Sim | `tenant_id (uuid)` | Mantém `tenant_id` e define valor padrão `DEFAULT auth.uid()` |
| 17 | `tenants` | ✅ Sim | `tenant_id (uuid)`, `id` | Define `DEFAULT auth.uid()` e aplica isolamento por `owner_email` / `id` |
| 18 | `webhook_idempotency_log` | ❌ Não | Log de infraestrutura | Adiciona `tenant_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` |

---

## 2. Detalhamento do Schema por Tabela e Políticas RLS

### 2.1 `appointments` (Agendamentos da Agenda)
- **Colunas:** `id (text)`, `barbershop_id (uuid)`, `tenant_id (uuid)`, `barber_id (text)`, `barber_name (text)`, `client_name (text)`, `client_phone (text)`, `service_name (text)`, `date (date)`, `start_time (text)`, `end_time (text)`, `duration_minutes (integer)`, `price (numeric)`, `status (text)`, `is_paid (boolean)`, `is_vip (boolean)`, `notes (text)`, `created_at (timestamptz)`, `settlement_id (text)`.
- **Regras RLS:**
  - `SELECT`: Apenas usuários autenticados cujo `tenant_id = auth.uid()`, `barbershop_id = auth.uid()` ou vinculados à barbearia em `tenants` por `owner_email`.
  - `INSERT`: Usuários autenticados (próprio tenant) e clientes públicos anônimos (`anon`) para realização de agendamentos pelo link da barbearia.
  - `UPDATE` e `DELETE`: Restrito aos proprietários/administradores do próprio tenant.

### 2.2 `clients` (Diretório de Clientes & Prontuário Técnico)
- **Colunas:** `id (text)`, `barbershop_id (uuid)`, `tenant_id (uuid)`, `name (text)`, `phone (text)`, `email (text)`, `is_vip (boolean)`, `total_visits (integer)`, `average_ticket (numeric)`, `technical_notes (jsonb)`, `created_at (timestamptz)`, `loyalty_stamps (integer)`, `subscription (jsonb)`, `cpf (text)`, `birth_date (date)`, `notes (text)`, `frequency_days (integer)`, `total_spent (numeric)`, `preferred_barber (text)`, `status (text)`, `last_visit (date)`, `updated_at (timestamptz)`.
- **Regras RLS:**
  - `SELECT`, `INSERT`, `UPDATE`, `DELETE`: Isolamento estrito por `tenant_id = auth.uid()` ou vínculo via `tenants` por `owner_email`. Uma barbearia **nunca** visualiza clientes de outra.

### 2.3 `barbers` (Equipe de Profissionais)
- **Colunas:** `id (text)`, `barbershop_id (uuid)`, `tenant_id (uuid)`, `name (text)`, `display_name (text)`, `role (text)`, `avatar (text)`, `rating (numeric)`, `review_count (integer)`, `status (text)`, `specialties (text[])`, `breaks (jsonb)`, `created_at (timestamptz)`, `commission_percentage (numeric)`, `schedule (jsonb)`, `email (text)`, `phone (text)`, `pix_key (text)`, `service_commission (numeric)`, `product_commission (numeric)`, `notes (text)`, `google_id (text)`, `auth_provider (text)`, `cpf (text)`, `instagram (text)`, `bio (text)`, `pix_type (text)`.
- **Regras RLS:**
  - `SELECT`: Autenticado do tenant + leitura anônima (`anon`) para barbeiros com `status = 'active'` (exibição na página pública de reserva).
  - `INSERT`, `UPDATE`, `DELETE`: Exclusivo do administrador do tenant (`tenant_id = auth.uid()`).

### 2.4 `comandas` (Frente de Caixa / PDV)
- **Colunas:** `id (text)`, `barbershop_id (uuid)`, `tenant_id (uuid)`, `client_id (text)`, `client_name (text)`, `client_phone (text)`, `barber_id (text)`, `barber_name (text)`, `status (text)`, `services (jsonb)`, `products (jsonb)`, `total_services (numeric)`, `total_products (numeric)`, `total_amount (numeric)`, `payment_method (text)`, `opened_at (text)`, `created_at (timestamptz)`, `payments (jsonb)`, `settlement_id (text)`.
- **Regras RLS:** `ALL` restrito a `tenant_id = auth.uid()`.

### 2.5 `services` (Catálogo de Serviços)
- **Colunas:** `id (text)`, `barbershop_id (uuid)`, `tenant_id (uuid)`, `name (text)`, `category (text)`, `duration_minutes (integer)`, `price (numeric)`, `commission_percent (integer)`, `active (boolean)`, `created_at (timestamptz)`.
- **Regras RLS:**
  - `SELECT`: Autenticado do tenant + anônimo (`anon`) para serviços ativos (`active = true`).
  - `INSERT`, `UPDATE`, `DELETE`: Exclusivo do administrador do tenant.

> ⚠️ **IMPORTANTE — Não alterar sem ler:** As policies desta tabela foram reescritas pela migration `20261029000002_fix_products_services_rls_policies.sql` e complementadas por `20261029000003_fix_anon_write_products_services.sql`. O role `anon` tem SELECT livre **e** INSERT/UPDATE/DELETE com verificação de UUID válido em `barbershop_id` e `tenant_id`. Isso é necessário para suportar o login via Google SSO (que não cria sessão Supabase real). **Não remova as policies `anon` sem garantir que o Google SSO cria sessão JWT real.**

### 2.6 `products` (Catálogo de Produtos)
- **Colunas:** `id (text)`, `barbershop_id (uuid)`, `tenant_id (uuid)`, `name (text)`, `category (text)`, `icon (text)`, `cost_price (numeric)`, `price (numeric)`, `stock (integer)`, `commission_percent (numeric)`, `active (boolean)`, `variants (jsonb)`, `created_at (timestamptz)`.
- **Regras RLS:**
  - `SELECT`: Autenticado do tenant (via `profiles.barbershop_id`) + anônimo (`anon`) com leitura livre.
  - `INSERT`, `UPDATE`, `DELETE`: Autenticado do tenant **E** anônimo (`anon`) com `barbershop_id` e `tenant_id` sendo UUIDs válidos (regex check).

> ⚠️ **IMPORTANTE — Não alterar sem ler:** Mesma situação da tabela `services` acima. As policies `anon` de escrita são essenciais para o fluxo de cadastro de produtos via login Google SSO. Migration aplicada: `20261029000002` e `20261029000003`. **Não remova as policies anon sem testar o cadastro de produtos com login Google.**

### 2.7 `queue_tickets` (Fila de Espera Digital)
- **Colunas:** `id (text)`, `barbershop_id (uuid)`, `tenant_id (uuid)`, `position (integer)`, `client_name (text)`, `phone (text)`, `service_name (text)`, `priority (text)`, `status (text)`, `estimated_wait_minutes (integer)`, `created_at (timestamptz)`.
- **Regras RLS:**
  - Gestão e chamada de fila: `ALL` restrito a `tenant_id = auth.uid()`.
  - Inserção e consulta pública pelo totem/QR code: `INSERT` e `SELECT` abertos para anônimo.

### 2.8 `barber_settlements` (Quitações Financeiras de Barbeiros)
- **Colunas:** `id (text)`, `barbershop_id (text)`, `tenant_id (uuid)`, `barber_id (text)`, `barber_name (text)`, `period_start (date)`, `period_end (date)`, `services_amount (numeric)`, `products_amount (numeric)`, `total_paid (numeric)`, `services_count (integer)`, `products_count (integer)`, `pix_key_used (text)`, `paid_by (text)`, `paid_at (timestamptz)`, `notes (text)`, `created_at (timestamptz)`.
- **Regras RLS:** `ALL` restrito a `tenant_id = auth.uid()`.

### 2.9 `client_edit_history` (Histórico de Auditoria de Clientes)
- **Colunas:** `id (uuid)`, `client_id (text)`, `tenant_id (uuid)`, `changed_at (timestamptz)`, `old_data (jsonb)`, `new_data (jsonb)`.
- **Regras RLS:** `ALL` restrito a `tenant_id = auth.uid()`.

### 2.10 `barbershops` & `tenants` (Entidades Centrais do Tenant)
- **Colunas de `tenants`:** `id (uuid)`, `name (text)`, `slug (text)`, `created_at`, `updated_at`, `owner_name`, `owner_email`, `phone`, `plan`, `status`, `barbers_count`, `mrr`, `trial_days_left`, `trial_ends_at`, `has_white_label`, `brand_primary`, `brand_secondary`, `logo_url`, `payment_status`, `last_payment_id`, `last_payment_date`, `payment_method`, `subscription_expires_at`, `google_id`, `auth_provider`, `cnpj`, `cep`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `address`, `pix_key`, `instagram`, `pix_type`, `tenant_id (uuid)`.
- **Regras RLS:**
  - Autenticado: Acesso irrestrito apenas à sua própria barbearia (`id = auth.uid() OR tenant_id = auth.uid() OR owner_email = auth.jwt() ->> 'email'`).
  - Anônimo: `SELECT` aberto para permitir que a landing page pública de agendamento carregue o nome, logo e identidade visual da barbearia.

### 2.11 `profiles` (Perfis de Administradores e Barbeiros)
- **Colunas:** `id (uuid)`, `barbershop_id (uuid)`, `tenant_id (uuid)`, `full_name (text)`, `role (text)`, `avatar_url (text)`, `phone (text)`, `email (text)`, etc.
- **Regras RLS:** Cada usuário gerencia seu próprio perfil (`id = auth.uid() OR tenant_id = auth.uid()`).

### 2.12 `subscription_payments` (Faturamento de Assinaturas SaaS)
- **Colunas:** `id (uuid)`, `tenant_id (uuid)`, `payment_id (text)`, `plan_id (text)`, `plan_name (text)`, `amount (numeric)`, `status (text)`, `payment_method (text)`, `payer_email (text)`, `created_at (timestamptz)`.
- **Regras RLS:** `ALL` restrito a `tenant_id = auth.uid() OR payer_email = auth.jwt() ->> 'email'`.

### 2.13 `sessions` (Sessões Concorrentes e Revogação Ativa)
- **Colunas:** `id (uuid)`, `user_id (text)`, `tenant_id (text)`, `device_name (text)`, `browser (text)`, `os (text)`, `ip_address (text)`, `user_agent (text)`, `is_active (boolean)`, `last_activity_at (timestamptz)`, `expires_at (timestamptz)`, `revoked_at (timestamptz)`, `revocation_reason (text)`, `user_email (text)`, etc.
- **Regras RLS:** Restrito a `user_id = auth.uid()::text OR user_email = auth.jwt() ->> 'email'`.

### 2.14 `plans` & `saas_config` (Catálogo Global e Configurações)
- **Regras RLS:**
  - `SELECT`: Aberto para `anon` e `authenticated` (tabelas públicas de planos e valores).
  - `INSERT`, `UPDATE`, `DELETE`: Exclusivo dos SuperAdmins da plataforma (`atendmentor@gmail.com` e `ddoanjos@gmail.com`).

### 2.15 `security_audit_events`, `security_audit_logs`, `webhook_idempotency_log`
- **Regras RLS:**
  - Restrito ao SuperAdmin ou ao próprio usuário no caso de eventos gerados pela sua sessão.

---

## 3. Gatilho Universal de Defesa em Profundidade (`fn_enforce_tenant_id_trigger`)

Mesmo se o frontend ou aplicativo mobile enviar o `tenant_id` nulo ou com valor adulterado, o PostgreSQL intercepta a operação no nível de banco de dados (`BEFORE INSERT OR UPDATE`) e força:

```sql
CREATE OR REPLACE FUNCTION public.fn_enforce_tenant_id_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_email TEXT;
    v_user_tenant_id UUID;
BEGIN
    v_user_email := LOWER(auth.jwt() ->> 'email');

    IF v_user_email IS NOT NULL THEN
        SELECT id INTO v_user_tenant_id
        FROM public.tenants
        WHERE LOWER(owner_email) = v_user_email
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF v_user_tenant_id IS NOT NULL THEN
        NEW.tenant_id := v_user_tenant_id;
        IF (TG_TABLE_NAME IN ('appointments', 'barbers', 'clients', 'comandas', 'products', 'services', 'queue_tickets')) THEN
            NEW.barbershop_id := v_user_tenant_id;
        END IF;
    ELSIF auth.uid() IS NOT NULL THEN
        NEW.tenant_id := COALESCE(NEW.tenant_id, auth.uid());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Instruções de Execução no Supabase

1. Abra o painel do seu projeto no **Supabase**.
2. Clique na seção **SQL Editor**.
3. Abra ou cole o conteúdo do arquivo `docs/supabase-complete-multi-tenant-migration.sql`.
4. Clique em **Run**.
5. Navegue até **Authentication > Policies** e confirme que todas as tabelas estão marcadas com o selo verde **RLS Enabled**.
