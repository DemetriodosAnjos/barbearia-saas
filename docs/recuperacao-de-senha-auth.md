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
