# Documentação de Regras de Negócio: Login com Google (SSO)

## 1. Visão Geral
- **Funcionalidade**: Autenticação via Google Single Sign-On (SSO).
- **Localização**: Tela de Login (`/src/pages/Auth/Login.jsx`) e Onboarding.
- **Objetivo**: Permitir que usuários entrem ou criem uma conta na plataforma utilizando suas credenciais da conta Google, reduzindo o atrito no processo de cadastro e acesso.

---

## 2. Elementos de Interface (UI)
- **Texto da Ação**: `Entrar com Google` / `Continuar com Google`.
- **Comportamento do Botão**:
  - Deve seguir estritamente as diretrizes de marca (*Branding Guidelines*) da Google (ícone oficial com quatro cores, tipografia sans-serif legível e proporção equilibrada).
  - **Estado Padrão**: Habilitado para clique com foco acessível (`:focus-visible`).
  - **Estado Loading**: Exibir indicador visual (*spinner* animado) e desabilitar cliques repetidos durante a comunicação com a API do Google/Backend (`isGoogleLoading = true`).
  - **Estado Desabilitado**: Desabilitado temporariamente em falhas críticas de conexão ou durante submissões ativas.

---

## 3. Fluxo Principal (Caminho Feliz)

```
[Usuário clica em "Entrar com Google"]
             │
             ▼
[Backend gera parâmetro state (CSRF) via GET /api/auth/google/url]
             │
             ▼
[Exibe Modal de Seleção de Conta / Pop-up OAuth 2.0 OpenID Connect]
             │
             ▼
[Usuário seleciona conta Google e autoriza compartilhamento de perfil]
             │
             ▼
[Emissão e Validação do id_token no Backend via POST /api/auth/google]
             │
             ▼
[Checagem de Usuário: Caso A (Associação de Conta) ou Caso B (Novo Usuário)]
             │
             ▼
[Emissão de Sessão JWT (Access Token 15m + Refresh Token HttpOnly 7d)]
             │
             ▼
[Redirecionamento para o Dashboard do SaaS autenticado]
```

1. **Clique do Usuário**: O usuário clica no botão "Entrar com Google".
2. **Pop-up / Redirecionamento Google**: A aplicação solicita o parâmetro `state` criptográfico via `GET /api/auth/google/url` e abre o modal/pop-up de consentimento OAuth 2.0 / OpenID Connect.
3. **Autenticação no Google**: O usuário seleciona a conta Google desejada e autoriza o compartilhamento de dados básicos (E-mail, Nome, Foto de Perfil).
4. **Validação do Token (Backend)**:
   - O frontend envia o `id_token` do Google junto ao `state` para o endpoint `/api/auth/google`.
   - O backend valida a assinatura criptográfica (JWS/RS256), emissor (`accounts.google.com`), audiência e expiração (`exp`).
5. **Checagem de Usuário Existente**:
   - **Caso A (Usuário já existe)**: O backend identifica o e-mail ou o `google_id` vinculado. Autentica a sessão, vincula a conta se necessário (`authProvider: 'linked'`) e gera o token JWT da aplicação.
   - **Caso B (Novo Usuário)**: O backend cria automaticamente uma nova conta utilizando as informações retornadas pelo Google (Nome, E-mail, Avatar, `email_verified = true`, senha local nula).
6. **Finalização**: O usuário é redirecionado para a tela principal (Dashboard) em estado autenticado com permissões concedidas pelo RBAC.

---

## 4. Regras de Negócio Específicas (RNs)

### RN-01: Associação de Contas por E-mail
Se o e-mail retornado pelo Google já estiver cadastrado via formulário tradicional (e-mail/senha):
- A aplicação deve automaticamente vincular o método de login Google a essa conta existente (desde que o e-mail retornado pelo Google esteja marcado como `email_verified: true`).
- A conta passa a ter suporte duplo (login local ou via Google SSO).

### RN-02: Verificação do E-mail
- Apenas contas do Google com e-mail marcado como verificado (`email_verified == true`) poderão concluir o login/cadastro.
- Contas não verificadas são rejeitadas imediatamente no backend com código de erro `EX-04`.

### RN-03: Perfil e Dados do Usuário
No momento do primeiro acesso (novo usuário):
- **Nome completo**: Preenchido a partir da claim `name` do OIDC.
- **E-mail**: Preenchido a partir da claim `email` do OIDC.
- **URL da Foto de Perfil**: Preenchida a partir da claim `picture` do Google.
- **Senha da conta**: Permanece nula (`passwordHash: null`) ou aleatória sem acesso direto pelo usuário, impedindo login por senha até que uma senha seja expressamente configurada via redefinição.

### RN-04: Status da Conta
Se o usuário estiver com o status `inactive` (Inativo) ou `suspended` / `blocked` (Suspenso / Bloqueado) no banco de dados interno:
- O acesso via Google deve ser bloqueado com mensagem explicativa:
  - Para conta inativa: `"Sua conta está desativada. Entre em contato com o suporte."`
  - Para conta suspensa: `"Acesso negado. Sua conta está suspensa."`

### RN-05: Sessão e Persistência
- A sessão iniciada via Google segue rigorosamente o mesmo tempo de expiração (TTL) das sessões normais da plataforma:
  - **Access Token**: 15 minutos (900 segundos) em memória / cabeçalho `Authorization: Bearer <token>`.
  - **Refresh Token**: 7 dias (604.800 segundos) em Cookie seguro com flags `HttpOnly`, `SameSite=Lax` e `Secure`.

---

## 5. Fluxos de Exceção e Tratamento de Erros

| Código / Cenário | Causa | Ação do Sistema / Mensagem para o Usuário |
| :--- | :--- | :--- |
| **EX-01: Cancelamento** | Usuário fecha a janela do Google antes de autenticar. | Fecha a janela pop-up e mantém o usuário na tela de login sem mensagens de erro. |
| **EX-02: Falha de Conexão** | Sem comunicação com os servidores do Google / Backend indisponível. | Exibir alerta/toast: *"Não foi possível conectar com o Google. Tente novamente mais tarde."* |
| **EX-03: Token Inválido** | Token expirado, malformado ou alterado durante o trânsito (falha de assinatura JWS). | Exibir erro: *"Sessão de autenticação inválida. Tente novamente."* |
| **EX-04: E-mail Não Verificado** | Conta do Google possui e-mail não confirmado (`email_verified: false`). | Exibir erro: *"Sua conta do Google precisa ter um e-mail verificado para continuar."* |
| **EX-05: Conta Suspensa** | Usuário com status `suspended` ou `blocked` no sistema. | Exibir erro: *"Acesso negado. Sua conta está suspensa."* |

---

## 6. Requisitos Não Funcionais (RNFs) e Segurança

- **RNF-01: Padrão OpenID Connect 1.0 & OAuth 2.0**: Endpoint `/api/auth/google/url` gera URLs conformes com escopos `openid email profile` e `response_type=code id_token`.
- **RNF-02: Validação Estrita de Tokens no Backend**: O frontend **nunca** define a identidade do usuário. O `id_token` é enviado ao backend e validado criptograficamente com RS256/HS256 e checagem de expiração temporal.
- **RNF-03: Proteção Anti-CSRF via Parâmetro `state`**: O backend emite e assina o token `state` com validade de 10 minutos. O retorno valida a integridade do `state` antes de processar qualquer login.
- **RNF-04: Identificador Único `google_id` (`sub`)**: Gravação do claim `sub` do OIDC na coluna `google_id` da base de dados para garantir unicidade e rastreabilidade independente de eventuais alterações de e-mail no futuro.

---

## 7. Catálogo de Endpoints de Backend

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/auth/google/url` | Emite o `state` anti-CSRF e URL oficial de autorização Google. |
| `POST` | `/api/auth/google/token` | Emite `id_token` OIDC assinado para fluxos de consentimento e testes. |
| `POST` | `/api/auth/google` | Valida o `id_token`, verifica `state`, aplica RN-01 a RN-05 e emite JWT da sessão. |