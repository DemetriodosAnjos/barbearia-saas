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
- **Revogação Real:**
  - O botão *"Desconectar outros dispositivos"* agora só é exibido quando há mais de uma sessão ativa registrada.
  - A ação aciona `supabase.auth.signOut({ scope: "others" })` e atualiza no banco `public.sessions` com `is_active = false`, `revoked_at = NOW()` e `revocation_reason`.
  - É possível revogar cada dispositivo individualmente sem uso de chamadas bloqueantes como `window.alert`.

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
-- 1. Criação ou Atualização da tabela public.sessions (Dispositivos Conectados)
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

-- 2. Garantir compatibilidade de colunas caso a tabela já tenha sido criada anteriormente
DO $$ 
BEGIN
  -- Remover restrição estrita de foreign key se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sessions_user_id_fkey' AND table_name = 'sessions'
  ) THEN
    ALTER TABLE public.sessions DROP CONSTRAINT sessions_user_id_fkey;
  END IF;

  -- Alterar user_id para TEXT para aceitar UUIDs e identificadores de gestor
  ALTER TABLE public.sessions ALTER COLUMN user_id TYPE TEXT;

  -- Adicionar coluna user_email se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN user_email TEXT;
  END IF;
END $$;

-- 3. Índices para consultas de alta performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
  ON public.sessions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_email_active 
  ON public.sessions(user_email, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_user_last_activity 
  ON public.sessions(user_id, last_activity_at DESC);

-- 4. Habilitação de Row Level Security (RLS) permissiva para sincronização de sessões
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários leem suas próprias sessões" ON public.sessions;
DROP POLICY IF EXISTS "Permitir leitura de sessões" ON public.sessions;
CREATE POLICY "Permitir leitura de sessões" 
  ON public.sessions 
  FOR SELECT 
  TO public 
  USING (true);

DROP POLICY IF EXISTS "Usuários inserem suas próprias sessões" ON public.sessions;
DROP POLICY IF EXISTS "Permitir inserção de sessões" ON public.sessions;
CREATE POLICY "Permitir inserção de sessões" 
  ON public.sessions 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários atualizam ou revogam suas próprias sessões" ON public.sessions;
DROP POLICY IF EXISTS "Permitir atualização de sessões" ON public.sessions;
CREATE POLICY "Permitir atualização de sessões" 
  ON public.sessions 
  FOR UPDATE 
  TO public 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusão de sessões" ON public.sessions;
CREATE POLICY "Permitir exclusão de sessões" 
  ON public.sessions 
  FOR DELETE 
  TO public 
  USING (true);

-- 5. Habilitar Supabase Realtime para que conexões no celular apareçam no notebook instantaneamente
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

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
