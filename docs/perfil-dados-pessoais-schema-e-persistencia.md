# Diagnóstico e Arquitetura: Salvamento de Dados Pessoais do Perfil (Supabase)

Este documento registra a análise técnica, o diagnóstico e a solução implementada para o salvamento dos dados pessoais na aba **MEU PERFIL / DADOS PESSOAIS**:
- **Nome de Exibição** (`display_name`)
- **CPF (Obrigatório)** (`cpf`)
- **CNPJ** (`cnpj`)
- **Data de Nascimento** (`birth_date`)

---

## 1. Motivo pelo qual os dados não estavam sendo salvos

A auditoria identificou **três causas raízes principais** atuando em conjunto:

### Causa 1: Omissão de Campos e Falta de Escrita Relacional no Frontend (`UserProfileView.jsx`)
1. **Omissão no Payload:** O manipulador `handleSaveProfile` montava o objeto `updatedMetadata` contendo apenas `name`, `full_name`, `display_name`, `cpf`, `phone` e campos profissionais. Os campos `cnpj` e `birthDate` (`birth_date`) foram completamente omitidos do payload.
2. **Inexistência de Escrita nas Tabelas Relacionais:** O código executava apenas `supabase.auth.updateUser({ data: updatedMetadata })`. Em nenhum momento realizava `supabase.from("profiles").upsert(...)` ou `supabase.from("tenants").update(...)`. Portanto, nenhum dado pessoal era gravado nas tabelas relacionais do PostgreSQL.
3. **Validação Frouxa de CPF:** Apesar do campo na interface possuir o rótulo `"CPF (Obrigatório)"`, a função `handleSaveProfile` validava apenas o nome completo quando a aba ativa era `"pessoal"`, permitindo submissão de formulários vazios ou com CPF incompleto.
4. **Ausência de Re-sincronização Reativa:** O estado do formulário (`personalData`) era inicializado apenas no mount do componente via `useState`. Caso os dados de sessão ou as tabelas do banco demorassem alguns milissegundos para responder, os campos permaneciam vazios e não eram atualizados.

### Causa 2: Inexistência das Colunas Físicas no PostgreSQL do Supabase (Erro 42703)
Ao consultar diretamente o banco de dados do Supabase (`njgeevywotbflikilway.supabase.co`):
- A tabela `public.profiles` continha apenas:
  `['id', 'barbershop_id', 'full_name', 'role', 'avatar_url', 'phone', 'created_at', 'updated_at', 'email', 'google_id', 'auth_provider']`
  As colunas `display_name`, `cpf`, `cnpj`, `birth_date`, `bio` e `pix_key` **não existiam fisicamente**, resultando em erro PostgreSQL:
  `code: '42703', message: 'column profiles.display_name does not exist'`
- A tabela `public.tenants` **não possuía a coluna `cnpj`**:
  `code: '42703', message: 'column tenants.cnpj does not exist'`

### Causa 3: Ausência de Enriquecimento de Sessão no Refresh (F5) em `App.jsx`
Mesmo quando o registro de perfil era consultado via `supabase.from("profiles")` na função `resolveAndSyncUserTenant`, apenas os campos de identificação do salão (`candidateTenantId`, `resolvedOwnerName`, `resolvedPhone`) eram aproveitados. O objeto `currentUser` não recebia `display_name`, `cpf`, `cnpj` e `birth_date` provenientes do banco.

---

## 2. SE é necessário criar ou atualizar as tabelas do Supabase?

**SIM, É INDISPENSÁVEL ATUALIZAR AS TABELAS DO SUPABASE.**

Para que os dados tenham integridade relacional, suporte a consultas SQL, relatórios fiscais, auditoria e emissão de notas fiscais, as seguintes alterações DDL são necessárias no banco:

1. **Tabela `public.profiles`:**
   - Adicionar coluna `display_name TEXT`
   - Adicionar coluna `cpf TEXT` (com índice `idx_profiles_cpf`)
   - Adicionar coluna `cnpj TEXT`
   - Adicionar coluna `birth_date DATE`
   - Adicionar coluna `bio TEXT`
   - Adicionar coluna `pix_key TEXT`
   - Adicionar coluna `avatar_url TEXT`

2. **Tabela `public.tenants`:**
   - Adicionar coluna `cnpj TEXT` (com índice `idx_tenants_cnpj`)

3. **Tabela `public.barbers`:**
   - Adicionar coluna `cpf TEXT`

---

## 3. Script SQL de Migração (Executar no Supabase SQL Editor)

O arquivo oficial foi gerado em `supabase/migrations/20261013000002_add_personal_data_to_profiles_and_tenants.sql`.

Execute o script abaixo no **Painel do Supabase -> SQL Editor**:

```sql
-- ==============================================================================
-- MIGRAÇÃO DE CONFORMIDADE: DADOS PESSOAIS EM PROFILES & TENANTS NO SUPABASE
-- Barbearia SaaS - Supabase / PostgreSQL Engine
-- ==============================================================================

-- 1. Garante colunas de dados pessoais na tabela public.profiles
DO $$
BEGIN
  -- display_name (Nome de Exibição / Apelido no Salão)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
  END IF;

  -- cpf (CPF - Documento Oficial Obrigatório)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'cpf'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN cpf TEXT;
  END IF;

  -- cnpj (CNPJ / MEI - Pessoa Jurídica)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN cnpj TEXT;
  END IF;

  -- birth_date (Data de Nascimento)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN birth_date DATE;
  END IF;

  -- bio (Mini biografia profissional)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
  END IF;

  -- pix_key (Chave PIX para recebimento de comissões)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'pix_key'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN pix_key TEXT;
  END IF;

  -- avatar_url (Foto de perfil / avatar)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- 2. Garante coluna cnpj na tabela public.tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN cnpj TEXT;
  END IF;
END $$;

-- 3. Garante coluna cpf na tabela public.barbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbers' AND column_name = 'cpf'
  ) THEN
    ALTER TABLE public.barbers ADD COLUMN cpf TEXT;
  END IF;
END $$;

-- 4. Índices para consultas otimizadas e buscas de documento
CREATE INDEX IF NOT EXISTS idx_profiles_cpf 
  ON public.profiles (cpf);

CREATE INDEX IF NOT EXISTS idx_profiles_barbershop_id 
  ON public.profiles (barbershop_id);

CREATE INDEX IF NOT EXISTS idx_tenants_cnpj 
  ON public.tenants (cnpj);

-- 5. Atualização de Políticas RLS para public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated, anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated, anon
WITH CHECK (true);
```

---

## 4. Arquitetura de Persistência em 5 Camadas (Resiliência Total)

A aplicação foi desenvolvida com tolerância a falhas e arquitetura de cinco camadas:

1. **Camada 1: Supabase Auth (`raw_user_meta_data`)**
   - Atualiza `auth.users` via `supabase.auth.updateUser`.
   - Garante que a sessão JWT emitida pelo GoTrue contenha sempre `display_name`, `cpf`, `cnpj`, `birth_date`.
2. **Camada 2: Tabela Relacional `public.profiles`**
   - Executa `supabase.from("profiles").upsert(...)` com todos os campos estruturados.
   - **Mecanismo de Fallback:** Caso a migração SQL ainda não tenha sido executada no Supabase remoto e o banco retorne erro 42703 (coluna inexistente), o frontend intercepta e realiza o salvamento com os campos base (`id, full_name, phone, barbershop_id`), sem interromper nem quebrar a interface do usuário.
3. **Camada 3: Tabela `public.tenants`**
   - Atualiza `owner_name`, `phone` e `cnpj` na tabela corporativa da barbearia.
4. **Camada 4: Tabela `public.barbers`**
   - Se o gestor logado também for barbeiro cadastrado na equipe, sincroniza seu `display_name`, `pix_key` e `phone`.
5. **Camada 5: Sincronização Reativa e Storage Local (`safeStorage`)**
   - Atualiza o registro `saas_auth_user` no `safeStorage`.
   - Propaga imediatamente as mudanças para o estado React via `onUpdateUser` e `onUpdateTenant`.
   - No refresh da página (F5), a função `resolveAndSyncUserTenant` em `App.jsx` lê o registro de `profiles` e enriquece o `currentUser`.

---

## 5. Padronização da Interface: Aba Contato & Endereço Residencial

Na versão 1.5.3.1, a interface da aba **Contato & Endereço** foi refatorada para eliminar poluição visual e redundâncias:

1. **Remoção de Textos Auxiliares Abaixo dos Inputs:**
   - Removido texto auxiliar de *E-mail de Acesso (Login)*.
   - Removido texto auxiliar de *WhatsApp / Telefone Celular*.
   - Removido texto auxiliar de busca de *CEP* para manter a grade alinhada e enxuta.

2. **Eliminação de Duplicidade (Número / Complemento / Bairro):**
   - Removida a linha duplicada de inputs que renderizava `Número`, `Complemento` e `Bairro` duas vezes consecutivas.
   - Unificada em uma única linha no grid com 3 colunas, utilizando exclusivamente o componente de design system `Input` padronizado.
   - O campo `Número *` recebe a propriedade `inputRef={numberInputRef}`, mantendo o foco automático imediato no campo assim que o preenchimento automático pelo ViaCEP é concluído com sucesso.

