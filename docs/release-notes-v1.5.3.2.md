# Release Notes - Barbearia SaaS v1.5.3.2

**Data de Lançamento**: Outubro de 2026  
**Status**: Homologado & Ativo  
**Módulos**: Segurança & Acesso, Migração de Esquema Supabase (Sessões Ativas) & Normalização de Ambiente

---

## 🎯 Principais Atualizações da Versão 1.5.3.2

### 1. Resolução Definitiva do Erro PostgreSQL 0A000 no Supabase
- **Problema Corrigido**: Falha ao executar `ALTER COLUMN user_id TYPE TEXT` em bancos que possuíam políticas de segurança ativas (como `"Usuários gerenciam suas próprias sessões"`).
- **Correção Implementada**: Adição de rotina em bloco dinâmico PL/pgSQL (`DO $$ ... $$`) que consulta o catálogo `pg_policies` e remove dinamicamente todas as políticas RLS associadas à tabela `public.sessions` antes da modificação do tipo de coluna.
- **Flexibilidade de Identidade**: Suporte unificado na coluna `user_id` tanto para UUIDs nativos do Supabase Auth quanto para identificadores alfanuméricos (`TEXT`) de gestores e administradores locais.

### 2. Sincronização em Tempo Real (Supabase Realtime)
- Inclusão da tabela `public.sessions` na publicação `supabase_realtime`, permitindo que múltiplos aparelhos (Desktop, Celular, Tablet) reflitam revogações de acesso instantaneamente sem necessidade de recarregar a página.

### 3. Sincronização e Normalização de Metadados
- Atualização e alinhamento de versão para **v1.5.3.2** entre `metadata.json` e as tags `<title>` e `<meta property="og:title">` do `index.html`.
- Atualização do modelo de variáveis de ambiente (`.env.example`) incluindo `GEMINI_API_KEY` e `VITE_HCAPTCHA_SECRET_KEY`.

### 4. Scripts e Documentação Técnica
- Atualização do arquivo de migração `supabase/migrations/20261013000005_create_sessions_and_security_audit_events.sql`.
- Atualização da especificação técnica em `docs/seguranca-acesso-sessoes-ativas-schema.md`.
