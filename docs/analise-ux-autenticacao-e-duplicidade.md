# Análise de UX, Autenticação Unificada e Prevenção de Duplicidade (Opção 2 - Account Linking Inteligente)

Este documento registra a arquitetura oficial adotada no **Barbearia SaaS (v1.5.2.7)** para a unificação de contas, mitigação definitiva de duplicidade de registros (tenants/barbershops) e otimização da experiência do usuário (UX).

---

## 1. Diagnóstico do Problema Original

### 1.1 Causa Raiz da Duplicação
No fluxo legado:
1. Quando o usuário clicava em **"Entrar com Google"**, o serviço executava uma consulta estrita à tabela `tenants` buscando pelo e-mail retornado.
2. Caso a consulta não retornasse registros (por divergência de case, espaços ou ausência de sessão prévia), o sistema interpretava a situação como um novo usuário (`isNewUser = true`).
3. Imediatamente dentro da própria função `authenticateGoogleUser`, o sistema invocava `crypto.randomUUID()` e inseria automaticamente novos registros nas tabelas `tenants`, `barbershops` e `barbers`.
4. Posteriormente, se o usuário passasse pelo fluxo de cadastro manual ou logasse com credenciais diretas, um segundo registro de tenant era persistido, gerando duplicidade de barbearias, perda do histórico original e fragmentação de dados.

### 1.2 Problema de UX no Cadastro Manual
No fluxo manual anterior, a verificação de e-mail existente ocorria apenas no término da **Etapa 2 (Dados da Barbearia)**. O usuário investia tempo preenchendo o nome da barbearia, link personalizado, WhatsApp e resolvendo o CAPTCHA para só então descobrir que seu e-mail já possuía cadastro.

---

## 2. A Solução Implementada: Opção 2 (Account Linking Inteligente)

Seguindo o padrão de plataformas de classe mundial (Google, Spotify, Slack, Notion), **o endereço de e-mail verificado é a Chave Canônica Única de Identidade**.

### Matriz Oficial de Comportamento

| Cenário de Acesso | Ação do Sistema | Comportamento no Banco de Dados | Experiência do Usuário (UX) |
|---|---|---|---|
| **1. Cadastro Manual de e-mail já existente** | Validação imediata na **Etapa 1** (Dados do Dono). O formulário é interrompido antes de solicitar dados da barbearia. | **Zero mutação**. Nenhum registro novo ou duplicado é inserido. | Exibe alerta amigável: *"Este e-mail já possui cadastro. Faça login para acessar sua barbearia."* acompanhado do botão **"Ir para o Login"** com o e-mail pré-preenchido. |
| **2. Login com Google de e-mail já existente** | **Account Linking Inteligente**: O sistema localiza o tenant/profile correspondente e vincula as credenciais do Google à conta já cadastrada. | **Zero duplicidade**. Nenhum novo UUID é gerado. Apenas atualiza `google_id` e `auth_provider: 'linked'` no tenant existente. | Usuário entra **diretamente no painel da sua barbearia** com todos os agendamentos, equipe e faturamento preservados. |
| **3. Login com Google de e-mail novo** | Identifica usuário sem tenant. **NÃO** insere registros fictícios no banco. Conduz o usuário ao fluxo de Onboarding limpo. | **Zero poluição**. Nenhuma barbearia vazia com nome genérico é inserida antecipadamente. | Redireciona para o Onboarding com Nome e E-mail do Google já preenchidos para que o usuário informe o WhatsApp e nome da barbearia de forma intencional. |

---

## 3. Detalhamento Técnico dos Componentes

### 3.1 Consulta Centralizada (`findExistingAccountByEmail`)
Localizada em `src/services/googleAuthService.ts`:
- Normaliza o e-mail (`trim()`, `toLowerCase()`).
- Realiza consultas multi-origem em `public.tenants` (`owner_email`), `public.barbers` (`email`) e `public.profiles` (`email`).
- Utiliza tanto operador `ilike` quanto fallback de correspondência exata para imunidade a divergências de caixa e acentuação.
- Retorna o status de existência e as referências completas do tenant/profissional encontrado.

### 3.2 Cadastro Manual (`OnboardingWizard.jsx`)
- **Validação Antecipada na Etapa 1**:
  Ao clicar em *"Continuar para Barbearia"*, a função `handleStep1Next` aciona `findExistingAccountByEmail`. Se existir conta, bloqueia a transição para a Etapa 2.
- **Botão Inteligente de Condução**:
  O botão *"Ir para o Login"* dispara `onGoToLogin(formData.email)`, navegando até `Login.jsx` com o campo de e-mail imediatamente preenchido.
- **Botão Google no Onboarding**:
  Integrado com `requestGoogleAccountProfile` + `authenticateGoogleUser`:
  - Se a conta já existir: realiza login imediato na barbearia.
  - Se for nova: pré-carrega os dados do Google e avança diretamente para a Etapa 2.

### 3.3 Autenticação Google (`googleAuthService.ts` & `Login.jsx`)
- **Remoção das Inserções Especulativas**:
  Foram completamente removidas as chamadas de `crypto.randomUUID()` e `insert` em `tenants` e `barbershops` dentro de `authenticateGoogleUser` para novos usuários.
- **Vinculação de Metadados**:
  Para usuários existentes, atualiza de forma não-bloqueante as colunas `google_id` e `auth_provider: 'linked'`.
- **Roteamento Central (`App.jsx`)**:
  - `loggedUser.isNewUser === true` $\rightarrow$ Redireciona para `onboarding` com `googleNewUserCandidate` pré-carregado.
  - `loggedUser.isNewUser === false` $\rightarrow$ Direciona diretamente para `barbershop` (ou `superadmin`).

---

## 4. Esquema de Dados e Integridade Referencial

- **Tabela `tenants`**: Possui a coluna `owner_email` como chave relacional do dono da barbearia. Não possui `owner_id`.
- **Tabela `barbershops`**: Compartilha a mesma chave primária UUID (`id = tenants.id`).
- **Tabela `profiles`**: Chave primária `id = auth.users.id`, vinculada a `barbershop_id = tenants.id`.

Com a Opção 2, a integridade referencial 1:1 entre proprietário, barbearia e equipe permanece estritamente íntegra em 100% dos fluxos de acesso.
