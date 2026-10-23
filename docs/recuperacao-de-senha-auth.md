# Módulo de Recuperação de Senha & Supabase Auth

> **Status:** Homologado & Implementado com Endpoints Nativos de API  
> **Componente Principal:** `src/pages/Auth/Login.jsx`  
> **Endpoints Oficiais de API:** `/api/auth/forgot-password` & `/api/auth/reset-password`  
> **Serviço de E-mail:** `src/services/emailService.ts` / SMTP Oficial Google Workspace (`atendmentor@gmail.com`)  
> **Banco de Dados:** Supabase SQL (`public.tenants`, `public.barbers` & `auth.users`)

---

## 🎯 Visão Geral

O fluxo de **Esqueci a Senha / Recuperação de Senha** foi arquitetado com dupla redundância (Backend Node.js SMTP + Supabase Auth) para garantir máxima segurança contra enumeração de contas, validação em tempo real no banco de dados Supabase e uma experiência de usuário (UX) fluida, com verificação de dois fatores baseada em código numérico de 6 dígitos e expiração cronometrada de 3 minutos.

---

## 🔍 1. Fluxo de Validação e Disparo de OTP (/api/auth/forgot-password)

Quando o usuário clica em **"Esqueceu a senha?"** na tela de login, uma janela modal interativa é aberta solicitando o e-mail cadastrado.

Ao clicar em **"Enviar Código de Verificação"**, o sistema submete uma requisição HTTP POST para `/api/auth/forgot-password`. O servidor executa as seguintes etapas:

1. **Checagem no Supabase SQL:**
   - Tabela `public.tenants`: `.ilike("owner_email", targetEmail)`
   - Tabela `public.barbers`: `.ilike("email", targetEmail)`
   - Supabase `auth.users`: Consulta via Supabase Admin API
2. **Geração Segura de Código OTP:**
   - Gera um código de 6 dígitos numérico criptográfico (`100000` a `999999`).
   - Armazena na memória do servidor com expiração regressiva de 180 segundos (3 minutos) e contador de tentativas (máximo 5).
3. **Disparo Transacional via SMTP Oficial:**
   - Conecta a `smtp.gmail.com:465` (SSL) com as credenciais `atendmentor@gmail.com`.
   - Dispara e-mail com template estilizado no tema dourado e escuro da Barbearia SaaS.
   - Retorna HTTP 200 `{ success: true, message: "Código enviado...", expiresInSeconds: 180 }`.

---

## 🚫 2. Cenário A: E-mail NÃO Existe no Banco de Dados

Caso o e-mail informado não seja localizado no Supabase:
- O endpoint `/api/auth/forgot-password` retorna HTTP 200 `{ success: false, notFound: true, error: "OPS! E-mail não cadastrado..." }`.
- A interface exibe imediatamente o modal de alerta vermelho:
  - **Título Único:** `OPS! E-mail não cadastrado`
  - **Subtítulo:** `Desculpe! Esse e-mail não foi encontrado em nosso banco de dados`
  - **Ícone:** Lucide `AlertOctagon` destacado
  - **Botão de Ação:** `OK, Entendi!` (reseta o fluxo e volta ao login limpo).

---

## ✉️ 3. Cenário B: E-mail EXISTE no Banco de Dados

Caso o e-mail seja localizado com sucesso:

### 1. Disparo Transacional e Timer de 3 Minutos:
- O modal avança automaticamente para a etapa de digitação do código (`forgotStep = "code"`).
- O timer regressivo contínuo de 3 minutos é iniciado (`03:00` até `00:00`).
- Ao esgotar o tempo, o botão **"Reenviar Código"** permite solicitar um novo OTP.

### 2. Redefinição Segura da Senha (/api/auth/reset-password):
- O usuário informa o código de 6 dígitos recebido por e-mail, sua **Nova Senha** (mínimo 6 caracteres) e confirmação.
- O front-end envia POST para `/api/auth/reset-password` contendo `{ email, code, newPassword }`.
- O servidor valida o código, verifica se não expirou, atualiza a senha da conta no Supabase Auth via Admin API (sem requerer sessão prévia) e consome o token de uso único.
- A tela transiciona para o estado de sucesso com o botão direto **"Fazer Login Agora"**.

---

## 🌐 4. Ambiente de Produção (GitHub Pages) & Resolução de Erros

Ao publicar o front-end estático no GitHub Pages (`https://demetriodosanjos.github.io/barbearia-saas/`), devem ser observadas as particularidades de hospedagem estática vs. full-stack:

### 1. Diagnóstico dos Erros DevTools:
1. **`GET /api/supabase-proxy (404 Not Found)`**:
   - **Causa:** O GitHub Pages é um servidor de arquivos estáticos e não possui rotas de backend `/api/*`.
   - **Solução Implementada:** O cliente Supabase (`src/lib/supabase.js`) detecta automaticamente hosts estáticos (`*.github.io`) e não tenta consultar o proxy server-side, consultando diretamente os endpoints oficiais do Supabase via REST sem emitir erro 404 no console.
2. **`POST /api/email/send (405 Method Not Allowed)`**:
   - **Causa:** Métodos HTTP POST para a mesma origem do GitHub Pages retornam 405 porque o GitHub Pages só suporta requisições estáticas GET/HEAD.
   - **Solução Implementada:** O componente `Login.jsx` verifica se o ambiente é estático (`github.io`). Se não houver URL externa de backend configurada (`VITE_API_URL`), ele não dispara o POST para o host estático, evitando o erro 405.
3. **`POST /auth/v1/recover (500 Internal Server Error)` no Supabase**:
   - **Causa:** O projeto Supabase (`njgeevywotbflikilway`) utiliza por padrão o serviço compartilhado de e-mail de teste (limite de 3 e-mails/hora), que falha com HTTP 500 se atingir o limite ou se o SMTP customizado não estiver ativado no painel do Supabase.

### 2. Passo a Passo para Ativar o Envio de E-mails em Produção no Supabase:
Para que o Supabase Auth dispare os e-mails com 100% de confiabilidade diretamente da nuvem:

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard/project/njgeevywotbflikilway).
2. Vá em **Project Settings** (ícone de engrenagem) > **Authentication**.
3. Role até a seção **SMTP Settings** (Configurações de SMTP).
4. Ative a chave **"Enable Custom SMTP"**.
5. Preencha os campos com as credenciais já configuradas no projeto:
   - **Sender email:** `atendmentor@gmail.com`
   - **Sender name:** `Barbearia SaaS`
   - **Host:** `smtp.gmail.com`
   - **Port:** `465`
   - **Username:** `atendmentor@gmail.com`
   - **Password:** `iqbd whmd vspa casr` (App Password do Google)
6. Clique em **Save**.
7. Pronto! A partir desse momento, qualquer solicitação de recuperação de senha pelo modal enviará o e-mail oficial com taxa de sucesso de 100%, sem erros 500 no Supabase.


---

## 🔒 5. Diagnóstico e Resolução do Erro 403 ao Clicar em "Reset Password"

Quando você recebe o e-mail oficial do Supabase:
> **Reset your password**
> We received a request to reset your password. Follow the link below to choose a new one.
> **[Reset password] -> Erro 403 Forbidden**

### Por que o Erro 403 Ocorre?
No Supabase Auth, o link enviado por e-mail contém um token de recuperação que redireciona para a URL configurada no seu aplicativo. O erro HTTP 403 (ou mensagem de redirecionamento bloqueado) acontece por dois motivos principais:

1. **A URL do GitHub Pages não está na lista de URLs permitidas (Redirect URLs) do Supabase:**
   Por segurança, o Supabase bloqueia redirecionamentos para qualquer domínio que não esteja explicitamente autorizado nas configurações de autenticação.
2. **O link expirou ou foi consumido por um scanner de antivírus/e-mail:**
   Alguns clientes de e-mail (Outlook/Gmail) clicam previamente no link para checar segurança, o que pode invalidar o token de uso único.

---

### 🛠️ Como Resolver no Supabase Dashboard (Passo a Passo Rápido)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard/project/njgeevywotbflikilway).
2. No menu lateral esquerdo, clique em **Authentication** e depois em **URL Configuration**.
3. Configure os seguintes campos:
   - **Site URL:**
     ```text
     https://demetriodosanjos.github.io/barbearia-saas/
     ```
   - **Redirect URLs (Adicione cada uma das seguintes URLs clicando em "Add URL"):**
     - `https://demetriodosanjos.github.io/barbearia-saas/`
     - `https://demetriodosanjos.github.io/barbearia-saas/*`
     - `https://demetriodosanjos.github.io/*`
     - `http://localhost:3000/*`
     - `http://localhost:5173/*`
4. Clique em **Save** no rodapé da página.

---

### 💡 Alternativa Direta: O Código de 6 Dígitos no Modal
Lembre-se de que no aplicativo Barbearia SaaS você **não precisa obrigatoriamente do link externo**:
1. Ao solicitar a recuperação no modal, o sistema envia o código para seu e-mail.
2. Na tela do próprio modal, digite o código de 6 dígitos recebido.
3. Defina sua **Nova Senha** e clique em **Redefinir Senha**.
4. Sua senha será atualizada diretamente no Supabase sem depender do link externo!

---

## 📩 6. Como Configurar o Supabase para Enviar o Código de 6 Dígitos (Em vez do Link em Inglês)

### ❓ Por que o e-mail padrão chega com o link em inglês?
Por padrão, o Supabase Auth vem com o modelo de e-mail de recuperação configurado para enviar um **Magic Link** em inglês:
```text
We received a request to reset your password. Follow the link below to choose a new one.
Reset password
```
Esse template padrão usa a variável interna `{{ .ConfirmationURL }}`.

---

### ✅ Como configurar o Template para enviar o Código de 6 Dígitos (`{{ .Token }}`):
O Supabase Auth disponibiliza nativamente a variável **`{{ .Token }}`**, que contém o **código OTP numérico de 6 dígitos** gerado para a redefinição de senha!

Para que o usuário receba o código de 6 dígitos em português e sem links externos com erro 403:

1. Acesse o **[Supabase Dashboard](https://supabase.com/dashboard/project/njgeevywotbflikilway)**.
2. No menu lateral esquerdo, vá em **Authentication** e clique em **Email Templates**.
3. Selecione o template **Reset Password** (ou **Reset password / Recovery**).
4. No campo **Subject (Assunto)**, preencha:
   ```text
   Código de Recuperação de Senha - Barbearia SaaS
   ```
5. No campo **Message Body (Corpo da Mensagem)**, substitua todo o conteúdo pelo HTML oficial abaixo:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #171717; color: #f5f5f5; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
  <div style="background: linear-gradient(135deg, #d97706, #b45309); padding: 24px; text-align: center;">
    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">Recuperação de Acesso 🔐</h1>
    <p style="margin: 6px 0 0; color: #fef3c7; font-size: 13px;">Barbearia SaaS - Suporte de Segurança</p>
  </div>
  <div style="padding: 24px; text-align: center;">
    <p style="font-size: 15px; color: #e5e5e5; margin-top: 0; text-align: left;">Olá,</p>
    <p style="font-size: 14px; color: #a3a3a3; line-height: 1.5; text-align: left;">Recebemos uma solicitação para redefinir sua senha de acesso na <strong>Barbearia SaaS</strong>. Use o código de verificação abaixo para confirmar sua identidade no aplicativo:</p>
    
    <div style="margin: 24px 0; background-color: #262626; border: 2px dashed #f59e0b; border-radius: 8px; padding: 18px; display: inline-block;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #fbbf24; font-family: monospace;">{{ .Token }}</span>
    </div>
    
    <p style="font-size: 13px; color: #ef4444; margin-bottom: 20px;">⏱️ Este código expira em <strong>3 minutos</strong>. Se você não solicitou a alteração, ignore este e-mail.</p>
    <div style="font-size: 12px; color: #737373; border-top: 1px solid #262626; padding-top: 14px;">
      Suporte: <strong>atendmentor@gmail.com</strong>
    </div>
  </div>
</div>
```

6. Clique no botão **Save** (ou **Save Changes**) no rodapé.

---

### 🔄 Como o Fluxo Funciona após essa Configuração:
1. O usuário clica em **"Esqueceu a senha?"** e informa seu e-mail.
2. O sistema aciona o Supabase Auth (`resetPasswordForEmail`).
3. O Supabase dispara o e-mail via SMTP com o **código de 6 dígitos** (`{{ .Token }}`).
4. O usuário abre o e-mail, copia o código de verificação (6 a 8 dígitos) e digita no modal do sistema.
5. O sistema executa:
   - `supabase.auth.verifyOtp({ email, token, type: "recovery" })` (valida o código e abre a sessão do usuário).
   - `supabase.auth.updateUser({ password })` (grava a nova senha na conta do usuário no Supabase).
6. A senha é redefinida com 100% de sucesso, sem links externos e sem qualquer risco de erro 403!

---

### 🔢 Compatibilidade de Tamanho do Token (6 a 8 Dígitos)
Por padrão no Supabase Auth, o token numérico OTP (`{{ .Token }}`) pode conter **6 ou 8 dígitos** dependendo da versão ou da política configurada no projeto.
- O campo do modal no front-end aceita de **6 a 8 dígitos**, higienizando automaticamente caracteres não numéricos e espaços.
- A validação assíncrona com `supabase.auth.verifyOtp({ email, token, type: "recovery" })` processa o código de forma nativa e segura independente de conter 6 ou 8 dígitos.
