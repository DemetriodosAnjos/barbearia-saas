# Release Notes - Barbearia SaaS v1.5.4.9

**Data de Lançamento:** Outubro de 2026  
**Status:** Homologado & Ativo  
**Módulos:** Segurança Multi-Tenant (`App.jsx`), Agenda (`ScheduleView.jsx`), Diretório de Clientes & Prontuário (`ClientsDirectoryView.jsx`), Migrações Supabase (`run_in_supabase_sql_editor.sql`, `supabase-clients-migration.sql`)

---

## 🎯 Principais Atualizações da Versão 1.5.4.9

### 1. Blindagem de Vazamento de Dados Cross-Tenant no Menu Clientes & Prontuário
* **Identificação e Mitigação de Causa Raiz:**
  * Correção do vazamento cruzado em que dois administradores (`ddoanjos@gmail.com` e `fullstackanjo01@gmail.com` / `fullstackanjos01@gmail.com`) visualizavam os mesmos clientes no Menu Clientes & Prontuário.
  * Realocação definitiva no banco de dados do cliente `Alex Teza` (`(47) 99999-9999`) e do agendamento correspondente para o tenant legítimo de Vilas Boas Barber (`a9e5dc8e-5648-4ed0-9a8f-c5d660899ae9`).
  * Clientes `Jucelino Calixto`, `Jean Saja Calixto` e `Hugo Xaves` mantidos com isolamento estrito no tenant de Barbearia Dos Anjos (`788299e3-a26c-4a0b-bc71-c7ae81ed40d3`).

---

### 2. Políticas RLS Estritas no Supabase (Eliminação da Política Permissiva)
* **Revogação da Política Permissiva Antiga:**
  * Eliminada a política `clients_all_access_policy` que continha cláusula aberta `USING (true) WITH CHECK (true)`.
  * Habilitação forçada de segurança em nível de linha (`ALTER TABLE public.clients FORCE ROW LEVEL SECURITY`).
* **Implementação de Políticas RLS Nativas por Tenant:**
  * Criadas as 4 políticas estritas (`clients_tenant_isolation_select`, `clients_tenant_isolation_insert`, `clients_tenant_isolation_update`, `clients_tenant_isolation_delete`).
  * Utilização de comparações nativas `UUID = UUID` entre `tenant_id`, `barbershop_id`, `t.id` e `auth.uid()`, eliminando erros de compatibilidade de tipos (`operator does not exist: uuid ~* unknown` e `operator does not exist: text = uuid`).
  * Suporte unificado às variantes de e-mail `fullstackanjo01@gmail.com` e `fullstackanjos01@gmail.com` para a gestão do tenant Vilas Boas Barber.

---

### 3. Blindagem de Estados e Caches no Frontend
* **Remoção de Fallback Hardcoded de Tenant:**
  * O estado `tenant` em `src/App.jsx` não adota mais o tenant de Demétrio por padrão quando não há usuário autenticado; inicializa como `null`.
* **Higienização Completa no Logout (`onLogout`):**
  * Limpeza atômica em memória dos estados `tenant`, `clients`, `appointments` e `comandas`.
  * Remoção completa das chaves globais e legadas (`saas_clients_cache`, `barbearia_saas_clients_v2`, `saas_auth_user`, `saas_active_screen`) para impedir contaminação entre sessões na mesma máquina.
* **Cache Estritamente Segmentado por Tenant:**
  * Leituras e gravações de clientes passam a ocorrer exclusivamente sob a chave `saas_clients_cache_${activeTenantId}`.
* **Injeção Obrigatória de `tenant_id` no Cadastro da Agenda (`ScheduleView.jsx`):**
  * O payload de novos clientes criados a partir do modal da agenda agora inclui obrigatoriamente `tenant_id: activeTenantId` e `barbershop_id: activeTenantId`, evitando a geração de registros órfãos sem tenant.

---

### 4. Scripts e Migrações de Banco de Dados Unificados
* Arquivo `supabase/run_in_supabase_sql_editor.sql` atualizado e testado para execução direta no SQL Editor do Supabase Dashboard com 100% de conformidade de tipos PostgreSQL.
* Arquivo `docs/supabase-clients-migration.sql` sincronizado com as políticas estritas multi-tenant.
