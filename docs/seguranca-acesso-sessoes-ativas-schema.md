# Arquitetura e Especificação: Segurança, Acesso e Sessões Ativas (Supabase)

Este documento registra as melhorias de UI, a remoção de dados mockados e a arquitetura técnica de persistência para a aba **MEU PERFIL / SEGURANÇA E ACESSO**:
- Remoção de textos auxiliares de teste no campo "Senha Atual"
- Eliminação total de dados mockados na seção "Dispositivos Conectados (Sessões Ativas)"
- Detecção e exibição em tempo real do dispositivo real do usuário
- Criação e integração da tabela `public.sessions` e auditoria no PostgreSQL do Supabase

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

Para que o gerenciamento de sessões funcione entre múltiplos aparelhos de forma persistente, foi estruturada a tabela `public.sessions` e a tabela de trilha de auditoria `public.security_audit_events`:

| Nome da Coluna | Tipo de Dado (PostgreSQL) | Obrigatório | Descrição / Regra |
|---|---|---|---|
| `id` | `uuid` | Sim | Identificador único da sessão (`gen_random_uuid()`). |
| `user_id` | `uuid` | Sim | Chave estrangeira referenciando `auth.users(id)` com `ON DELETE CASCADE`. |
| `tenant_id` | `text` | Não | ID da barbearia / tenant ativo durante a sessão. |
| `device_name` | `text` | Não | Nome legível do dispositivo (ex: `"Google Chrome no Windows"`). |
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

Execute o script abaixo no **Painel do Supabase -> SQL Editor**:

```sql
-- 1. Criação da tabela public.sessions (Dispositivos Conectados)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 2. Índices para consultas de alta performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
  ON public.sessions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_user_last_activity 
  ON public.sessions(user_id, last_activity_at DESC);

-- 3. Habilitação de Row Level Security (RLS)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS: usuário autenticado só visualiza e altera suas próprias sessões
DROP POLICY IF EXISTS "Usuários leem suas próprias sessões" ON public.sessions;
CREATE POLICY "Usuários leem suas próprias sessões" 
  ON public.sessions 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários inserem suas próprias sessões" ON public.sessions;
CREATE POLICY "Usuários inserem suas próprias sessões" 
  ON public.sessions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários atualizam ou revogam suas próprias sessões" ON public.sessions;
CREATE POLICY "Usuários atualizam ou revogam suas próprias sessões" 
  ON public.sessions 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Tabela complementar de Auditoria de Segurança
CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
CREATE POLICY "Usuários leem seus próprios logs de auditoria" 
  ON public.security_audit_events 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);
```

---

## 4. Sincronização Global Automática (`sessionTracker.js`)

Para solucionar a situação onde um dispositivo secundário (como o celular) estava conectado mas não aparecia no notebook, o rastreamento foi tornado **global**:

1. **Rastreamento no Boot do App (`App.jsx`):**
   - Assim que o usuário é autenticado no celular, tablet ou computador, o serviço `registerOrUpdateGlobalSession(user, tenant)` é disparado imediatamente.
   - O dispositivo não precisa navegar até a tela de perfil para ter sua conexão registrada no banco `public.sessions`.

2. **Heartbeat & Foco de Janela:**
   - Intervalo de pulso a cada 2 minutos atualiza `last_activity_at`.
   - Evento de foco de aba (`window.focus`) atualiza a presença do dispositivo em tempo real.

3. **Botão de Atualização Rápida no Perfil:**
   - Adicionado botão de atualização (`RefreshCw`) no cabeçalho da seção de sessões ativas do perfil, permitindo recarregar a lista instantaneamente com um clique.

