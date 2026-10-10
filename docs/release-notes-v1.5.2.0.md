# Release Notes - Barbearia SaaS v1.5.2.0

**Data de Lançamento**: Outubro de 2026  
**Status**: Homologado & Ativo  
**Módulo**: Autenticação & Identidade (Google SSO / OpenID Connect)

---

## 🎯 Principais Atualizações

### 1. Autenticação Unificada com Google Single Sign-On (SSO)
- Implementação completa do fluxo OAuth 2.0 e OpenID Connect 1.0 para entrada e cadastro com um clique via Google.
- Botão "Entrar com Google" projetado conforme as *Branding Guidelines* da Google, com estados de carregamento (spinner), prevenção de múltiplos cliques e estados desabilitados.
- Modal de Seleção de Contas e Consentimento Google (OpenID Connect) permitindo testes de fluxos felizes e simulação de regras de negócio em ambientes de desenvolvimento e produção.

### 2. Validação Rigorosa de Regras de Negócio (RN-01 a RN-05)
- **RN-01 (Associação de Contas)**: Vinculação automática a contas locais pré-existentes quando o e-mail retornado pelo Google for idêntico e verificado (`email_verified: true`).
- **RN-02 (Validação de E-mail)**: Bloqueio estrito de contas do Google cujo e-mail não esteja confirmado (`email_verified: false`), retornando erro `EX-04`.
- **RN-03 (Perfil Automatizado)**: Criação imediata do perfil com Nome completo, E-mail e Avatar com foto oficial do Google, mantendo a senha local desabilitada/nula.
- **RN-04 (Status da Conta)**: Bloqueio imediato de contas com status `inactive`, `suspended` ou `blocked`, exibindo mensagens padronizadas.
- **RN-05 (TTL de Sessão Padronizado)**: Emissão de Access Token (15 minutos) e Refresh Token HttpOnly seguro (7 dias) com os mesmos parâmetros da plataforma.

### 3. Tratamento de Exceções Padronizado (EX-01 a EX-05)
- **EX-01 (Cancelamento)**: Fechamento silencioso do pop-up de login sem exibir erros indevidos na tela.
- **EX-02 (Falha de Conexão)**: Tratamento de indisponibilidade com alerta claro *"Não foi possível conectar com o Google. Tente novamente mais tarde."*.
- **EX-03 (Token Inválido)**: Rejeição de tokens expirados ou com assinatura JWS adulterada com a mensagem *"Sessão de autenticação inválida. Tente novamente."*.
- **EX-04 (E-mail Não Verificado)**: Mensagem explicativa *"Sua conta do Google precisa ter um e-mail verificado para continuar."*.
- **EX-05 (Conta Suspensa)**: Bloqueio com aviso *"Acesso negado. Sua conta está suspensa."*.

### 4. Segurança e Arquitetura DevSecOps (RNFs)
- **Proteção Anti-CSRF (RNF-03)**: Parâmetro `state` gerado no backend com assinatura criptográfica HMAC-SHA256 e expiração de 10 minutos.
- **Validação Server-Side Obrigatória (RNF-02)**: Validação do `id_token` exclusivamente no backend, com suporte à checagem de chave pública e endpoints oficiais da Google.
- **Identificador Único `google_id` (RNF-04)**: Armazenamento da claim `sub` do OIDC como chave estrangeira de autenticação federada.
