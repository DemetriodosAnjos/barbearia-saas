-- ==============================================================================
-- CORREÇÃO DEFINITIVA DO ERRO 23503 (FOREIGN KEY VIOLATION) NO SUPABASE
-- ==============================================================================
-- Causa: O ID '788299e3-a26c-4a0b-bc71-c7ae81ed40d3' é o ID da barbearia (tenants/barbershops),
-- e NÃO um usuário na tabela interna auth.users.
-- Solução: Remove a restrição rígida de chave estrangeira para auth.users em tenant_id,
-- permitindo armazenar tanto auth.uid() quanto o barbershop_id, garantindo isolamento total via RLS.
-- ==============================================================================

BEGIN;

-- 1. REMOVER RESTRIÇÕES DE CHAVE ESTRANGEIRA QUE APONTAVAM PARA auth.users
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_tenant_id_fkey;
ALTER TABLE public.barber_settlements DROP CONSTRAINT IF EXISTS barber_settlements_tenant_id_fkey;
ALTER TABLE public.barbers DROP CONSTRAINT IF EXISTS barbers_tenant_id_fkey;
ALTER TABLE public.barbershops DROP CONSTRAINT IF EXISTS barbershops_tenant_id_fkey;
ALTER TABLE public.client_edit_history DROP CONSTRAINT IF EXISTS client_edit_history_tenant_id_fkey;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_tenant_id_fkey;
ALTER TABLE public.comandas DROP CONSTRAINT IF EXISTS comandas_tenant_id_fkey;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_tenant_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tenant_id_fkey;
ALTER TABLE public.queue_tickets DROP CONSTRAINT IF EXISTS queue_tickets_tenant_id_fkey;
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_tenant_id_fkey;
ALTER TABLE public.security_audit_events DROP CONSTRAINT IF EXISTS security_audit_events_tenant_id_fkey;
ALTER TABLE public.security_audit_logs DROP CONSTRAINT IF EXISTS security_audit_logs_tenant_id_fkey;
ALTER TABLE public.webhook_idempotency_log DROP CONSTRAINT IF EXISTS webhook_idempotency_log_tenant_id_fkey;

-- 2. GARANTIR A COLUNA tenant_id UUID COM DEFAULT auth.uid() (SEM RESTRIÇÃO DE FK A auth.users)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.barber_settlements ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.client_edit_history ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.security_audit_events ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE public.webhook_idempotency_log ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();

-- 3. SINCRONIZAÇÃO HISTÓRICA ENTRE barbershop_id E tenant_id (AGORA SEM CONFLITO DE FK)
UPDATE public.appointments 
SET tenant_id = barbershop_id 
WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;

UPDATE public.appointments 
SET barbershop_id = tenant_id 
WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;

UPDATE public.barbers 
SET tenant_id = barbershop_id 
WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;

UPDATE public.barbers 
SET barbershop_id = tenant_id 
WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;

UPDATE public.clients 
SET tenant_id = barbershop_id 
WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;

UPDATE public.clients 
SET barbershop_id = tenant_id 
WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;

UPDATE public.comandas 
SET tenant_id = barbershop_id 
WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;

UPDATE public.comandas 
SET barbershop_id = tenant_id 
WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;

UPDATE public.products 
SET tenant_id = barbershop_id 
WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;

UPDATE public.products 
SET barbershop_id = tenant_id 
WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;

UPDATE public.services 
SET tenant_id = barbershop_id 
WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;

UPDATE public.services 
SET barbershop_id = tenant_id 
WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;

UPDATE public.queue_tickets 
SET tenant_id = barbershop_id 
WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;

UPDATE public.queue_tickets 
SET barbershop_id = tenant_id 
WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;

UPDATE public.profiles 
SET tenant_id = COALESCE(tenant_id, barbershop_id, id);

-- 4. ÍNDICES DE PERFORMANCE MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON public.appointments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_barber_settlements_tenant_id ON public.barber_settlements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_barbers_tenant_id ON public.barbers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_tenant_id ON public.barbershops (tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_edit_history_tenant_id ON public.client_edit_history (tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients (tenant_id);
CREATE INDEX IF NOT EXISTS idx_comandas_tenant_id ON public.comandas (tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products (tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_tenant_id ON public.queue_tickets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON public.services (tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_tenant_id ON public.subscription_payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_tenant_id ON public.tenants (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_email ON public.tenants (owner_email);

-- 5. HABILITAÇÃO E ENFORCEMENT DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.barber_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_settlements FORCE ROW LEVEL SECURITY;

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops FORCE ROW LEVEL SECURITY;

ALTER TABLE public.client_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_edit_history FORCE ROW LEVEL SECURITY;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas FORCE ROW LEVEL SECURITY;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans FORCE ROW LEVEL SECURITY;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.saas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_config FORCE ROW LEVEL SECURITY;

ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_events FORCE ROW LEVEL SECURITY;

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;

ALTER TABLE public.webhook_idempotency_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_idempotency_log FORCE ROW LEVEL SECURITY;

-- 6. POLÍTICAS RLS ROBUSTAS (SUPORTA auth.uid() DIRETO E/OU barbershop_id/tenants)

-- 6.1 appointments
DROP POLICY IF EXISTS "appointments_tenant_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_tenant_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_tenant_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_tenant_delete" ON public.appointments;
DROP POLICY IF EXISTS "appointments_public_insert" ON public.appointments;

CREATE POLICY "appointments_tenant_select" ON public.appointments FOR SELECT TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.appointments.tenant_id OR t.id = public.appointments.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

CREATE POLICY "appointments_tenant_insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.appointments.tenant_id OR t.id = public.appointments.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

CREATE POLICY "appointments_public_insert" ON public.appointments FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "appointments_tenant_update" ON public.appointments FOR UPDATE TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.appointments.tenant_id OR t.id = public.appointments.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.appointments.tenant_id OR t.id = public.appointments.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

CREATE POLICY "appointments_tenant_delete" ON public.appointments FOR DELETE TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.appointments.tenant_id OR t.id = public.appointments.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

-- 6.2 clients
DROP POLICY IF EXISTS "clients_tenant_isolation_select" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_update" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_delete" ON public.clients;
DROP POLICY IF EXISTS "Clientes visíveis apenas pelo proprietário" ON public.clients;
DROP POLICY IF EXISTS "Inserir clientes apenas no próprio tenant" ON public.clients;

CREATE POLICY "clients_tenant_isolation_select" ON public.clients FOR SELECT TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

CREATE POLICY "clients_tenant_isolation_insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

CREATE POLICY "clients_tenant_isolation_update" ON public.clients FOR UPDATE TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

CREATE POLICY "clients_tenant_isolation_delete" ON public.clients FOR DELETE TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

-- 6.3 barbers
DROP POLICY IF EXISTS "barbers_tenant_isolation_select" ON public.barbers;
DROP POLICY IF EXISTS "barbers_tenant_isolation_insert" ON public.barbers;
DROP POLICY IF EXISTS "barbers_tenant_isolation_update" ON public.barbers;
DROP POLICY IF EXISTS "barbers_tenant_isolation_delete" ON public.barbers;
DROP POLICY IF EXISTS "barbers_public_select" ON public.barbers;

CREATE POLICY "barbers_tenant_isolation_select" ON public.barbers FOR SELECT TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.barbers.tenant_id OR t.id = public.barbers.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

CREATE POLICY "barbers_public_select" ON public.barbers FOR SELECT TO anon USING (status = 'active');

CREATE POLICY "barbers_tenant_isolation_insert" ON public.barbers FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.barbers.tenant_id OR t.id = public.barbers.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

CREATE POLICY "barbers_tenant_isolation_update" ON public.barbers FOR UPDATE TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.barbers.tenant_id OR t.id = public.barbers.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.barbers.tenant_id OR t.id = public.barbers.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

CREATE POLICY "barbers_tenant_isolation_delete" ON public.barbers FOR DELETE TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.barbers.tenant_id OR t.id = public.barbers.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

-- 6.4 comandas, products, services, queue_tickets, barber_settlements, client_edit_history
DROP POLICY IF EXISTS "comandas_tenant_all" ON public.comandas;
CREATE POLICY "comandas_tenant_all" ON public.comandas FOR ALL TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.comandas.tenant_id OR t.id = public.comandas.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.comandas.tenant_id OR t.id = public.comandas.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS "products_tenant_all" ON public.products;
CREATE POLICY "products_tenant_all" ON public.products FOR ALL TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.products.tenant_id OR t.id = public.products.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.products.tenant_id OR t.id = public.products.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS "services_tenant_all" ON public.services;
DROP POLICY IF EXISTS "services_public_select" ON public.services;
CREATE POLICY "services_tenant_all" ON public.services FOR ALL TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.services.tenant_id OR t.id = public.services.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.services.tenant_id OR t.id = public.services.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );
CREATE POLICY "services_public_select" ON public.services FOR SELECT TO anon USING (active = true);

DROP POLICY IF EXISTS "queue_tickets_tenant_all" ON public.queue_tickets;
DROP POLICY IF EXISTS "queue_tickets_public_select" ON public.queue_tickets;
DROP POLICY IF EXISTS "queue_tickets_public_insert" ON public.queue_tickets;
CREATE POLICY "queue_tickets_tenant_all" ON public.queue_tickets FOR ALL TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.queue_tickets.tenant_id OR t.id = public.queue_tickets.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR barbershop_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.queue_tickets.tenant_id OR t.id = public.queue_tickets.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );
CREATE POLICY "queue_tickets_public_select" ON public.queue_tickets FOR SELECT TO anon USING (true);
CREATE POLICY "queue_tickets_public_insert" ON public.queue_tickets FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "barber_settlements_tenant_all" ON public.barber_settlements;
CREATE POLICY "barber_settlements_tenant_all" ON public.barber_settlements FOR ALL TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR (barbershop_id IS NOT NULL AND barbershop_id = auth.uid()::text) 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.barber_settlements.tenant_id OR t.id::text = public.barber_settlements.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR (barbershop_id IS NOT NULL AND barbershop_id = auth.uid()::text) 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE (t.id = public.barber_settlements.tenant_id OR t.id::text = public.barber_settlements.barbershop_id)
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS "client_edit_history_tenant_all" ON public.client_edit_history;
CREATE POLICY "client_edit_history_tenant_all" ON public.client_edit_history FOR ALL TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE t.id = public.client_edit_history.tenant_id
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE t.id = public.client_edit_history.tenant_id
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

-- 6.5 barbershops, tenants, profiles, subscription_payments, sessions
DROP POLICY IF EXISTS "barbershops_tenant_all" ON public.barbershops;
DROP POLICY IF EXISTS "barbershops_public_select" ON public.barbershops;
CREATE POLICY "barbershops_tenant_all" ON public.barbershops FOR ALL TO authenticated
  USING (
    id = auth.uid() 
    OR tenant_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE t.id = public.barbershops.id
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    id = auth.uid() 
    OR tenant_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE t.id = public.barbershops.id
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );
CREATE POLICY "barbershops_public_select" ON public.barbershops FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "tenants_owner_isolation" ON public.tenants;
DROP POLICY IF EXISTS "tenants_public_select" ON public.tenants;
CREATE POLICY "tenants_owner_isolation" ON public.tenants FOR ALL TO authenticated
  USING (id = auth.uid() OR tenant_id = auth.uid() OR LOWER(owner_email) = LOWER(auth.jwt() ->> 'email'))
  WITH CHECK (id = auth.uid() OR tenant_id = auth.uid() OR LOWER(owner_email) = LOWER(auth.jwt() ->> 'email'));
CREATE POLICY "tenants_public_select" ON public.tenants FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "profiles_user_all" ON public.profiles;
CREATE POLICY "profiles_user_all" ON public.profiles FOR ALL TO authenticated
  USING (id = auth.uid() OR tenant_id = auth.uid() OR LOWER(email) = LOWER(auth.jwt() ->> 'email'))
  WITH CHECK (id = auth.uid() OR tenant_id = auth.uid() OR LOWER(email) = LOWER(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "subscription_payments_tenant_all" ON public.subscription_payments;
CREATE POLICY "subscription_payments_tenant_all" ON public.subscription_payments FOR ALL TO authenticated
  USING (
    tenant_id = auth.uid() 
    OR LOWER(payer_email) = LOWER(auth.jwt() ->> 'email') 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE t.id = public.subscription_payments.tenant_id
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR LOWER(payer_email) = LOWER(auth.jwt() ->> 'email') 
    OR EXISTS (
      SELECT 1 FROM public.tenants t 
      WHERE t.id = public.subscription_payments.tenant_id
        AND (t.id = auth.uid() OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS "sessions_user_isolation" ON public.sessions;
CREATE POLICY "sessions_user_isolation" ON public.sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()::text OR tenant_id = auth.uid()::text OR LOWER(user_email) = LOWER(auth.jwt() ->> 'email'))
  WITH CHECK (user_id = auth.uid()::text OR tenant_id = auth.uid()::text OR LOWER(user_email) = LOWER(auth.jwt() ->> 'email'));

-- 6.6 plans, saas_config, auditoria
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
DROP POLICY IF EXISTS "plans_superadmin_write" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "plans_superadmin_write" ON public.plans FOR ALL TO authenticated
  USING (LOWER(auth.jwt() ->> 'email') IN ('atendmentor@gmail.com', 'ddoanjos@gmail.com'))
  WITH CHECK (LOWER(auth.jwt() ->> 'email') IN ('atendmentor@gmail.com', 'ddoanjos@gmail.com'));

DROP POLICY IF EXISTS "saas_config_public_read" ON public.saas_config;
DROP POLICY IF EXISTS "saas_config_superadmin_write" ON public.saas_config;
CREATE POLICY "saas_config_public_read" ON public.saas_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "saas_config_superadmin_write" ON public.saas_config FOR ALL TO authenticated
  USING (LOWER(auth.jwt() ->> 'email') IN ('atendmentor@gmail.com', 'ddoanjos@gmail.com'))
  WITH CHECK (LOWER(auth.jwt() ->> 'email') IN ('atendmentor@gmail.com', 'ddoanjos@gmail.com'));

DROP POLICY IF EXISTS "security_audit_events_tenant_policy" ON public.security_audit_events;
CREATE POLICY "security_audit_events_tenant_policy" ON public.security_audit_events FOR ALL TO authenticated
  USING (user_id = auth.uid() OR tenant_id = auth.uid() OR LOWER(auth.jwt() ->> 'email') IN ('atendmentor@gmail.com', 'ddoanjos@gmail.com'))
  WITH CHECK (user_id = auth.uid() OR tenant_id = auth.uid() OR LOWER(auth.jwt() ->> 'email') IN ('atendmentor@gmail.com', 'ddoanjos@gmail.com'));

DROP POLICY IF EXISTS "security_audit_logs_superadmin_policy" ON public.security_audit_logs;
CREATE POLICY "security_audit_logs_superadmin_policy" ON public.security_audit_logs FOR ALL TO authenticated
  USING (tenant_id = auth.uid() OR LOWER(auth.jwt() ->> 'email') IN ('atendmentor@gmail.com', 'ddoanjos@gmail.com'))
  WITH CHECK (tenant_id = auth.uid() OR LOWER(auth.jwt() ->> 'email') IN ('atendmentor@gmail.com', 'ddoanjos@gmail.com'));

DROP POLICY IF EXISTS "webhook_idempotency_log_policy" ON public.webhook_idempotency_log;
CREATE POLICY "webhook_idempotency_log_policy" ON public.webhook_idempotency_log FOR ALL TO authenticated
  USING (tenant_id = auth.uid() OR LOWER(auth.jwt() ->> 'email') IN ('atendmentor@gmail.com', 'ddoanjos@gmail.com'))
  WITH CHECK (tenant_id = auth.uid() OR LOWER(auth.jwt() ->> 'email') IN ('atendmentor@gmail.com', 'ddoanjos@gmail.com'));

COMMIT;
