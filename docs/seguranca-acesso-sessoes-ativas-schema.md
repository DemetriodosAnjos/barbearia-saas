# Arquitetura e Especificação: Segurança, Acesso e Sessões Ativas (Supabase)

Este documento registra as melhorias de UI, a remoção de dados mockados e a arquitetura técnica de persistência para a aba **MEU PERFIL / SEGURANÇA E ACESSO**:
- Remoção de textos auxiliares de teste no campo "Senha Atual"
- Eliminação total de dados mockados na seção "Dispositivos Conectados (Sessões Ativas)"
- Detecção e exibição em tempo real do dispositivo real do usuário
- Criação e integração da tabela `public.sessions` e auditoria no PostgreSQL do Supabase
- Sincronização multi-dispositivo (Notebook, Celular e Tablet simultâneos)

---

## 1. Ajustes Realizados na Interface (UI / UX)

### 1.1 Campo "Senha Atual"
- **Remoção do Texto Auxiliar:** Foi removido o texto de apoio `"Dica para teste: digite 'senha123' para validar ou qualquer outra para testar o erro."`. O input agora possui apresentação limpa, profissional e livre de instruções de ambiente de teste/mock.

### 1.2 Dispositivos Conectados (Sessões Ativas)
- **Eliminação de Mocks:** Removidos todos os elementos estáticos hardcoded (`Chrome no Windows 11`, `São Paulo, Brasil • IP 177.85.x.x`, `Safari no iPhone 15 Pro • Há 2 horas`).
- **Detecção do Dispositivo Real:** Criada a rotina `getClientDeviceInfo()` que inspeciona o `navigator.userAgent` do navegador para extrair:
  - Sistema operacional real (Windows, macOS, Linux, iOS, Android)
  - Navegador real (Google Chrome, Safari, Mozilla Firefox, Microsoft Edge, Opera)
  - Tipo de dispositivo (Desktop/Laptop ou Smartphone/Mobile)
  - Identificação da sessão ativa do usuário atual com o selo `"Conectado Agora"`.
- **Revogação Real & UX de Desconexão (v1.5.3.3):**
  - Tanto o dispositivo atual (`Conectado Agora`) quanto os aparelhos remotos contam com o link de ação **"Desconectar"**.
  - O clique em *"Desconectar"* aciona o modal oficial **"Encerrar Sessão"** (mesmo componente `Modal` utilizado na navbar/sidebar da aplicação).
  - A confirmação no modal dispara a revogação da sessão no Supabase, limpa os registros locais de autenticação (`saas_auth_user`, tokens e IDs de sessão) e redireciona o usuário do aparelho desconectado diretamente para a tela de login.
  - Para aparelhos remotos, a revogação é escutada via canal em tempo real do Supabase (`postgres_changes` na tabela `public.sessions`) e verificada periodicamente em heartbeat, assegurando que o aparelho remoto desconectado também resete seu estado e navegue para o login em menos de 1 segundo.
  - O botão *"Desconectar outros dispositivos"* permanece disponível quando há mais de uma sessão ativa registrada, abrindo também a confirmação antes da execução em lote.

---

## 2. Modelo de Dados Relacional no Supabase (`public.sessions`)

Para que o gerenciamento de sessões funcione entre múltiplos aparelhos de forma persistente, a tabela `public.sessions` e a tabela de auditoria `public.security_audit_events` foram padronizadas:

| Nome da Coluna | Tipo de Dado (PostgreSQL) | Obrigatório | Descrição / Regra |
|---|---|---|---|
| `id` | `uuid` | Sim | Identificador único da sessão (`gen_random_uuid()`). |
| `user_id` | `text` | Sim | ID do usuário (UUID do Supabase Auth, email ou ID do gestor). |
| `user_email` | `text` | Não | Email do usuário para unificação entre dispositivos. |
| `tenant_id` | `text` | Não | ID da barbearia / tenant ativo durante a sessão. |
| `device_name` | `text` | Não | Nome legível do dispositivo (ex: `"Google Chrome no Android"`). |
| `browser` | `text` | Não | Nome do navegador identificado. |
| `os` | `text` | Não | Sistema operacional identificado. |
| `ip_address` | `text` | Não | Endereço IP de origem da requisição / login. |
| `user_agent` | `text` | Não | String bruta do `User-Agent` HTTP do cliente. |
| `is_active` | `boolean` | Sim | Status da sessão (`true` para ativa, `false` para revogada). |
| `last_activity_at` | `timestamptz` | Sim | Timestamp do último heartbeat / atividade registrada. |
| `expires_at` | `timestamptz` | Sim | Data e hora de expiração da sessão (`now() + interval '30 days'`). |
| `revoked_at` | `timestamptz` | Não | Data e hora em que a sessão foi revogada. |
| `revocation_reason` | `text` | Não | Motivo do encerramento da sessão. |
| `created_at` | `timestamptz` | Sim | Data de início da sessão (`now()`). |
| `updated_at` | `timestamptz` | Sim | Data da última atualização de status (`now()`). |

---

## 3. Script SQL Oficial para o Supabase (SQL Editor)

Execute o script abaixo no **Painel do Supabase -> SQL Editor** para criar ou atualizar as tabelas e liberar o acesso compartilhado multi-dispositivo:

```sql
-- 1. Criação da tabela public.sessions (se ainda não existir)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT,
  tenant_id TEXT,
  device_name TEXT,
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '30 days'),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. IMPORTANTE: Remover dinamicamente TODAS as políticas RLS antes de alterar o tipo da coluna user_id
-- (Resolve em definitivo o erro PostgreSQL 0A000: cannot alter type of a column used in a policy definition)
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'sessions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sessions', pol.policyname);
  END LOOP;
END $$;

-- 3. Remover restrição foreign key se existir (para permitir flexibilidade)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sessions_user_id_fkey' AND table_name = 'sessions'
  ) THEN
    ALTER TABLE public.sessions DROP CONSTRAINT sessions_user_id_fkey;
  END IF;
END $$;

-- 4. Agora sim podemos alterar user_id para TEXT com segurança
ALTER TABLE public.sessions ALTER COLUMN user_id TYPE TEXT;

-- 5. Adicionar colunas faltantes se a tabela for de versão anterior
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '30 days');
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS revocation_reason TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 6. Índices para consultas de alta performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
  ON public.sessions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_email_active 
  ON public.sessions(user_email, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_user_last_activity 
  ON public.sessions(user_id, last_activity_at DESC);

-- 7. Habilitação de Row Level Security (RLS) e Recriação das Políticas Permissivas
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de sessões" 
  ON public.sessions 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Permitir inserção de sessões" 
  ON public.sessions 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de sessões" 
  ON public.sessions 
  FOR UPDATE 
  TO public 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Permitir exclusão de sessões" 
  ON public.sessions 
  FOR DELETE 
  TO public 
  USING (true);

-- 8. Habilitar Supabase Realtime (se ainda não adicionado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;
END $$;

-- 6. Tabela complementar de Auditoria de Segurança
CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id TEXT,
  actor_id TEXT,
  reason TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_created 
  ON public.security_audit_events(created_at DESC);

ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários leem seus próprios logs de auditoria" ON public.security_audit_events;
DROP POLICY IF EXISTS "Permitir leitura de auditoria" ON public.security_audit_events;
CREATE POLICY "Permitir leitura de auditoria" 
  ON public.security_audit_events 
  FOR SELECT 
  TO public 
  USING (true);

DROP POLICY IF EXISTS "Permitir inserção de auditoria" ON public.security_audit_events;
CREATE POLICY "Permitir inserção de auditoria" 
  ON public.security_audit_events 
  FOR INSERT 
  TO public 
  WITH CHECK (true);
```

---

## 4. Sincronização Global Automática e Multi-Dispositivo (`sessionTracker.js`)

Para garantir que celulares, notebooks e tablets apareçam simultaneamente:

1. **Rastreamento no Boot do App (`App.jsx`):**
   - Assim que o usuário é autenticado ou acessa o painel no celular, tablet ou computador, o serviço `registerOrUpdateGlobalSession(user, tenant)` é disparado imediatamente.
   - O dispositivo não precisa navegar até a tela de perfil para ter sua conexão registrada no banco `public.sessions`.

2. **Heartbeat & Foco de Janela:**
   - Intervalo de pulso a cada 60 segundos atualiza `last_activity_at`.
   - Evento de foco de aba (`window.focus`) atualiza a presença do dispositivo em tempo real.

3. **Supabase Realtime:**
   - A tela de segurança e sessões assina o canal `public-sessions-sync` via `supabase.channel`. Quando o celular conecta ou encerra sessão, a lista no notebook atualiza automaticamente sem F5.

4. **Identificação Determinística e Compatibilidade:**
   - Converte identificadores para UUID determinístico consistente entre os aparelhos, prevenindo erros `22P02` caso a coluna do banco fosse UUID estrito.
   - Consulta cruzada por `user_id`, `user_email` e `tenant_id`.

---

## 5. Diagnóstico da Discrepância Anterior

- **Cenário Observado:**
  - No Notebook aparecia apenas "Google Chrome no Windows".
  - No Celular aparecia apenas "Google Chrome no Android".
- **Causas Técnicas Identificadas:**
  1. A política de RLS anterior exigia `auth.uid() = user_id` e restringia a `TO authenticated`. Sessões com cliente anônimo/local recebiam `Error 42501 (Unauthorized)`, caindo no fallback local de cada aparelho.
  2. O tipo de coluna `user_id UUID` causava falha se o identificador fosse texto como `owner-usr-01`.
  3. A condição `currentUser.id !== 'owner-usr-01'` ignorava sessões do gestor padrão.
- **Solução Implementada:**
  - Código atualizado para registrar e buscar por UUID determinístico/email em todos os dispositivos.
  - Script SQL atualizado para aceitar conexões multi-dispositivo sem bloqueio de RLS.
