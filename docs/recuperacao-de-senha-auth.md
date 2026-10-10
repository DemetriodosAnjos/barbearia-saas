# Módulo de Recuperação de Senha & Supabase Auth

> **Status:** Homologado & Implementado  
> **Componente Principal:** `src/pages/Auth/Login.jsx`  
> **Serviço de E-mail:** `src/services/emailService.ts` / `/api/email/send`  
> **Banco de Dados:** Supabase SQL (`public.tenants` & `public.barbers`)

---

## 🎯 Visão Geral

O fluxo de **Esqueci a Senha / Recuperação de Senha** foi arquitetado para garantir máxima segurança contra enumeração de contas, validação em tempo real no banco de dados Supabase e uma experiência de usuário (UX) fluida, com verificação de dois fatores baseada em código numérico de 6 dígitos e expiração cronometrada.

---

## 🔍 1. Fluxo de Validação no Supabase SQL

Quando o usuário clica em **"Esqueceu a senha?"** na tela de login, uma janela modal interativa é aberta solicitando o e-mail cadastrado.

Ao clicar em **"Enviar Código de Verificação"**, o sistema realiza a checagem assíncrona nas seguintes tabelas do Supabase:

1. **Tabela `public.tenants` (Proprietários de Barbearia):**
   - Consulta insensível a maiúsculas/minúsculas: `.ilike("owner_email", targetEmail)`.
2. **Tabela `public.barbers` (Barbeiros e Profissionais da Equipe):**
   - Consulta insensível a maiúsculas/minúsculas: `.ilike("email", targetEmail)`.

---

## 🚫 2. Cenário A: E-mail NÃO Existe no Banco de Dados

Caso o e-mail informado não seja localizado nem na tabela `tenants` nem na tabela `barbers`, o sistema aciona imediatamente a interface de alerta de erro:

### Componente Modal (Sem Redundâncias de UX/UI):
- **Tema & Cores:** Alerta de Erro Vermelho com visual limpo e direto (`bg-rose-500/15`, `border-rose-500/40`, `text-rose-500`).
- **Posicionamento do Ícone Fechar (X):** Posicionado à direita superior do modal, sem linha divisória separando o ícone das demais informações (cabeçalho sem `border-b`).
- **Ícone Central:** Ícone da biblioteca Lucide `AlertOctagon` estilizado em container de destaque com halo vermelho.
- **Título Único em Branco:** `OPS! E-mail não cadastrado` (exibido apenas 1 vez, sem repetições no cabeçalho ou tags extras).
- **Subtítulo:** `Desculpe! Esse e-mail não foi encontrado em nosso banco de dados`.
- **Botão de Ação:** Botão vermelho destacado `OK, Entendi!`.
- **Ação:** O fechamento (seja pelo botão "OK, Entendi!" ou pelo "X" à direita) reseta completamente o estado do fluxo e retorna o usuário à tela de login limpa.

---

## ✉️ 3. Cenário B: E-mail EXISTE no Banco de Dados

Caso o e-mail seja localizado com sucesso no Supabase:

### 1. Disparo Transacional de E-mail:
- Gera um código criptográfico de 6 dígitos (`100000` a `999999`).
- Envia o e-mail transacional via endpoint oficial `/api/email/send` utilizando SMTP configurado (`atendmentor@gmail.com`).
- Template HTML com identidade visual escura/dourada da Barbearia SaaS, código em destaque monospace e orientações de segurança.

### 2. Segurança no Modal (Código Oculto no UI):
- O código de recuperação **NÃO é exposto na tela** da modal, reforçando a proteção contra visualizações indevidas no dispositivo.
- É apresentado um informativo claro indicando que o código de 6 dígitos foi despachado para o endereço de e-mail do usuário.
- O usuário deve consultar sua caixa de entrada e digitar o código recebido no campo de verificação.

### 3. Timer Regressivo de 3 Minutos (180 Segundos):
- Exibição de cronômetro regressivo contínuo no formato `MM:SS` (ex: `03:00`, `02:59`, ... `00:00`).
- Indicador pulsante com ícone `Clock` da biblioteca Lucide.
- **Expiração:** Ao atingir `00:00`, o sistema notifica o usuário sobre a expiração do código e oferece a opção **"Reenviar Código"**, que reinicia o temporizador de 3 minutos e dispara um novo código de segurança por e-mail.

### 4. Redefinição Segura da Senha:
- Campos para digitação do código de 6 dígitos recebido por e-mail, **Nova Senha** (mínimo 6 caracteres) e **Confirmar Nova Senha**.
- Botão **"Redefinir Senha"** que sincroniza a atualização com o Supabase Auth.
- Mensagem de sucesso com botão direto para **"Fazer Login Agora"**.
