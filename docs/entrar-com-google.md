# Documentação de Regras de Negócio: Login com Google (SSO)

## 1. Visão Geral
- **Funcionalidade**: Autenticação via Google Single Sign-On (SSO).
- **Localização**: Tela de Login (`/src/pages/Auth/Login.jsx`) e Onboarding.
- **Objetivo**: Permitir que usuários entrem ou criem uma conta na plataforma utilizando suas credenciais da conta Google, reduzindo o atrito no processo de cadastro e acesso.
- **Tecnologia**: Integração direta com Google Identity Services (GIS) / Google OAuth 2.0 API no front-end, eliminando dependência de proxies estáticos que causavam falhas HTTP 404/405.

---

## 2. Elementos de Interface (UI)
- **Texto da Ação**: `Entrar com Google` / `Continuar com Google`.
- **Comportamento do Botão**:
  - Segue estritamente as diretrizes de marca (*Branding Guidelines*) da Google (ícone oficial com quatro cores, tipografia sans-serif legível e proporção equilibrada).
  - **Estado Padrão**: Habilitado para clique com foco acessível (`:focus-visible`).
  - **Estado Loading**: Exibir indicador visual (*spinner* animado) e desabilitar cliques repetidos durante a comunicação com a API do Google (`isGoogleLoading = true`).
  - **Zero Poluição Técnica**: Sem badges anti-CSRF, sem botões de simulação/demonstração e sem seletores fictícios de contas.

---

## 3. Fluxo Principal (Caminho Feliz)

```
[Usuário clica em "Entrar com Google"]
             │
             ▼
[API do Google (GIS) abre o Modal / Pop-up nativo de Seleção de Contas]
             │
             ▼
[Usuário seleciona sua conta Google real e autoriza compartilhamento]
             │
             ▼
[Google API retorna perfil real (sub, email, email_verified, name, picture)]
             │
             ▼
[Aplicação executa validações das Regras de Negócio (RN-01 a RN-05)]:
 ├─ RN-02: email_verified === true
 ├─ RN-01: Associação automática se já cadastrado no banco Supabase
 ├─ RN-03: Perfil oficial do Google para novo usuário
 └─ RN-04: Verificação de status (ativo/inativo/suspenso)
             │
             ▼
[RN-05: Emissão e Gravação da Sessão (safeStorage)]
             │
             ▼
[Redirecionamento imediato para o Painel/Dashboard do SaaS autenticado]
```

1. **Clique do Usuário**: O usuário clica no botão "Entrar com Google".
2. **Modal Nativo da Google API**: A aplicação inicializa o Google Identity Services (`window.google.accounts.oauth2.initTokenClient` / GIS) e abre a janela oficial de seleção de contas do Google.
3. **Autenticação Real**: O usuário seleciona sua conta Google real logada no navegador ou insere suas credenciais Google.
4. **Obtenção de Perfil**: A aplicação consulta o endpoint oficial da Google `https://www.googleapis.com/oauth2/v3/userinfo` com o token de acesso autorizado.
5. **Associação e Criação de Sessão**:
   - **Caso A (Usuário já existe no banco Supabase)**: Se o e-mail existir na tabela `tenants` (campo `owner_email`) ou `barbers` (campo `email`), a conta é associada (`authProvider: 'linked'`) e a sessão é iniciada diretamente com o papel correspondente (`owner`/`barber`), enviando o usuário direto para o painel.
   - **Caso B (Super Admin: atendmentor@gmail.com)**: Concede privilégios administrativos globais e ativa o link de acesso ao Painel Super Admin no rodapé da Sidebar.
   - **Caso C (Novo Usuário)**: Se for o primeiro acesso, o usuário é direcionado para a tela do **Quiz de Onboarding** (`docs/onboarding-quiz-e-perfis.md`) para selecionar entre "Dono com equipe" ou "Profissional autônomo solo". A resposta é memorizada para que logins futuros entrem direto na aplicação.
6. **Redirecionamento**: O usuário acessa a plataforma em estado autenticado com sua persona estabelecida.

---

## 4. Regras de Negócio Específicas (RNs)

### RN-01: Associação de Contas por E-mail
Se o e-mail retornado pelo Google já estiver cadastrado no banco de dados (tabelas `tenants` ou `barbers`):
- A aplicação automaticamente vincula o método de login Google a essa conta existente.
- A conta passa a ter suporte duplo (login local ou via Google SSO).

### RN-02: Verificação do E-mail
- Apenas contas do Google com e-mail marcado como verificado (`email_verified == true`) poderão concluir o login/cadastro.
- Contas não verificadas são rejeitadas imediatamente com código de erro `EX-04`.

### RN-03: Perfil e Dados do Usuário
No momento do primeiro acesso (novo usuário):
- **Nome completo**: Preenchido a partir do nome retornado pela API do Google.
- **E-mail**: Preenchido a partir do e-mail retornado pela API do Google.
- **URL da Foto de Perfil**: Preenchida a partir da foto oficial do perfil Google.
- **Identificador Único (`googleId`)**: Preenchido a partir do campo `sub` da Google API.

### RN-04: Status da Conta
Se o usuário estiver com o status `inactive` (Inativo) ou `suspended` / `blocked` (Suspenso / Bloqueado) no banco de dados:
- O acesso via Google é bloqueado com mensagem explicativa:
  - Para conta inativa: `"Sua conta está desativada. Entre em contato com o suporte."`
  - Para conta suspensa: `"Acesso negado. Sua conta está suspensa."`

### RN-05: Sessão e Persistência
- A sessão iniciada via Google grava os dados no `safeStorage` (`saas_auth_user` e `saas_jwt_access_token`) garantindo persistência segura durante a navegação na plataforma.

---

## 5. Fluxos de Exceção e Tratamento de Erros

| Código / Cenário | Causa | Ação do Sistema / Mensagem para o Usuário |
| :--- | :--- | :--- |
| **EX-01: Cancelamento** | Usuário fecha o modal do Google sem selecionar uma conta. | Fecha a janela e mantém o usuário na tela de login sem mensagens de erro. |
| **EX-02: Falha de Conexão** | Sem comunicação com os servidores do Google / Falha de rede. | Exibir alerta: *"Não foi possível conectar com o Google. Tente novamente mais tarde."* |
| **EX-03: Sessão Inválida** | Resposta da Google API corrompida ou e-mail inválido. | Exibir erro: *"Sessão de autenticação inválida. Tente novamente."* |
| **EX-04: E-mail Não Verificado** | Conta do Google possui e-mail não confirmado (`email_verified: false`). | Exibir erro: *"Sua conta do Google precisa ter um e-mail verificado para continuar."* |
| **EX-05: Conta Suspensa** | Usuário com status `suspended` ou `blocked` no sistema. | Exibir erro: *"Acesso negado. Sua conta está suspensa."* |

---

## 6. Configuração e Variáveis de Ambiente

### 6.1 Credenciais Oficiais do Google Cloud Console
- **Projeto Google Cloud**: `barber-saas-511219`
- **Client ID OAuth 2.0 Web**: `737774141986-jqmalq9e63isp91q27jd9ghvebc0i22i.apps.googleusercontent.com`
- **Variável de Ambiente Front-End**: `VITE_GOOGLE_CLIENT_ID`
- **Variáveis de Ambiente Back-End (Opcional)**: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` (para troca server-side de tokens OpenID Connect se ativado)

### 6.2 Origens JavaScript Autorizadas (Authorized JavaScript Origins)
Configuradas no console do Google Cloud para este Client ID:
1. `http://localhost:3000` (Ambiente local de desenvolvimento)
2. `https://demetriodosanjos.github.io` (Ambiente de produção / GitHub Pages)
3. *Ambientes AI Studio Preview / Cloud Run* (Adicionar no console conforme necessário):
   - `https://ais-dev-ycppka6c2abbopa2jhhqpo-872847100246.us-east1.run.app`
   - `https://ais-pre-ycppka6c2abbopa2jhhqpo-872847100246.us-east1.run.app`

### 6.3 Políticas de Segurança do Navegador (CSP e Headers)
- **Content-Security-Policy (CSP)**:
  - `script-src`: inclui `https://accounts.google.com https://apis.google.com`
  - `connect-src`: inclui `https://accounts.google.com https://oauth2.googleapis.com https://*.googleapis.com`
  - `frame-src`: inclui `https://accounts.google.com`
- **Cross-Origin-Opener-Policy**: configurado para `same-origin-allow-popups` para permitir comunicação bidirecional com o modal/popup do Google Identity Services.

---

## 7. Diagnóstico e Resolução de Problemas (Troubleshooting)

| Erro | Causa Mais Frequente | Como Solucionar |
| :--- | :--- | :--- |
| `origin_mismatch` / `redirect_uri_mismatch` | A URL acessada no navegador não está na lista de "Origens JavaScript autorizadas" do Google Cloud Console. | Acesse o [Google Cloud Console](https://console.cloud.google.com/apis/credentials), edite o Client ID `737774141986-...` e adicione a URL exata (com `https://` e sem barra no final). |
| `popup_closed_by_user` | O usuário fechou o popup do Google antes de concluir a autenticação. | Comportamento normal (código `EX-01`). O sistema encerra o loading silenciosamente sem travar a tela. |
| `access_denied` | O usuário recusou permissão de leitura de perfil/e-mail no consentimento. | O sistema notifica o usuário solicitando autorização do e-mail para prosseguir com o login. |