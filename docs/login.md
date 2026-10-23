# Registro Oficial de Atualização de Autenticação & Login

> **Data de Conclusão:** 23 de outubro de 2026  
> **Status:** ✅ Feature de login completamente realizada, testada e validada em ambiente local e produção remota (GitHub Pages). Sincronização soberana do e-mail Google com E-mail/Senha, avatar instantâneo sem F5, acesso completo à tabela clients e Cloudflare Turnstile com ativação estritamente manual.  
> **Repositório:** `DemetriodosAnjos/barbearia-saas` (branch `main`)  
> **Commits de Referência:** `5b465be`, `725efe3`, `161c413`, `2c65325`, `620a08a`, `b004aff`, `8e6d663`

---

## 1. Objetivo da Atualização

Eliminar a duplicidade de cadastros, divergência de UUIDs e bloqueios de acesso a tabelas do Supabase. Anteriormente, ao entrar pelo botão **"Entrar com o Google"**, o sistema criava a barbearia original com o plano **TRIAL** e carregava os clientes. Porém, ao tentar entrar ou redefinir a senha via **E-mail e Senha**, o sistema gerava um segundo UUID e um segundo tenant em branco com 0 clientes.

A partir de 23 de outubro de 2026, **o e-mail do usuário é a chave única e soberana de identidade em todo o sistema**, garantindo que ambos os métodos de entrada acessem exatamente o mesmo tenant, o mesmo plano, o mesmo avatar e os mesmos dados.

---

## 2. O Que Foi Corrigido (Causas Raiz & Soluções)

### A. Gravação Obrigatória do E-mail na Tabela `profiles`
- **Problema anterior:** Ao autenticar ou registrar pelo Google, a tabela `profiles` salvava apenas `id`, `full_name`, `phone` e `barbershop_id`, deixando o campo `email` vazio (`null`). Isso fazia com que qualquer consulta por e-mail no login ou redefinição falhasse.
- **Correção aplicada:**
  - `src/services/soloOnboardingService.ts`: O `profilePayload` agora grava explicitamente `email: normalizedEmail`.
  - `src/services/googleAuthService.ts`: O método `authenticateGoogleUser` atualiza a linha do `profiles` com `email: normalizedEmail`.

### B. Fallback Blindado na Redefinição e Criação de Senha
- **Problema anterior:** Quando o usuário solicitava redefinição de senha ou tentava definir senha pelo perfil, o backend não encontrava o perfil por e-mail e criava um novo usuário (`createUser`) gerando outro UUID desvinculado da barbearia original.
- **Correção aplicada (`src/api/apiDispatcher.ts`):**
  - Rotas `/api/auth/reset-password` e `/api/auth/update-password`:
    1. Busca primeiro em `profiles` pelo e-mail.
    2. Se não encontrar, busca em `tenants` por `owner_email`.
    3. Encontrando a barbearia do Google, recupera o `barbershop_id` e o perfil vinculado.
    4. Ao cadastrar ou atualizar o usuário em `auth.users`, **força o mesmo `barbershop_id` e metadados**, impedindo a criação de tenants órfãos.

### C. Eliminação do Duplo Carregamento no Frontend (`App.jsx`)
- **Problema anterior:** O `onLoginSuccess` carregava os dados corretos da barbearia (com os clientes), mas em seguida o evento `SIGNED_IN` do `supabase.auth.onAuthStateChange` disparava novamente com o usuário cru da sessão, sobrescrevendo a tela com 0 clientes.
- **Correção aplicada:**
  - Criação da flag `loginInProgressRef` no topo do `App.jsx`.
  - Bloqueio temporário no ouvinte `onAuthStateChange` durante o processamento do login com e-mail/senha.

### D. Validação Antecipada no Onboarding (`OnboardingWizard.jsx`)
- **Problema anterior:** O usuário conseguia digitar um e-mail já cadastrado na etapa 1 e tentar criar nova conta.
- **Correção aplicada:**
  - Adicionado evento `onBlur` no campo de e-mail.
  - Ao sair do campo ou pressionar **Tab**, o sistema consulta o Supabase em tempo real. Se o e-mail já existir, bloqueia o avanço e exibe o botão para ir direto ao Login.

### E. Resolução de Rotas Locais (CORS Fix)
- **Problema anterior:** O frontend em `localhost:3000` estava tentando disparar endpoints `/api/*` contra uma URL remota do Cloud Run configurada em `VITE_APP_URL`, estourando erro de CORS e Bad Request (400).
- **Correção aplicada (`src/services/api.ts`, `src/security/authSecurityService.js`, `src/pages/Auth/Login.jsx`):**
  - Em ambiente `localhost`, todas as chamadas `/api/*` são direcionadas localmente para o middleware do Vite, garantindo funcionamento dos códigos de verificação de 6 dígitos.

### F. Blindagem de Produção Estática (GitHub Pages) & Carregamento de Clientes
- **Problema anterior:** Em produção no GitHub Pages (`demetriodosanjos.github.io`), a chamada de silent refresh disparava `POST /api/auth/refresh`, resultando em **HTTP 405 Method Not Allowed** e forçando logout ou interrupção do carregamento. Além disso, o filtro estrito de tenant descartava clientes que estivessem associados a identificadores alternativos da barbearia/usuário.
- **Correção aplicada (`src/services/api.ts`, `src/context/AuthContext.tsx`, `src/App.jsx`):**
  - No `api.ts` e no `AuthContext.tsx`, antes de tentar disparar `/api/auth/refresh`, valida-se `getResolvedApiUrl('/api/auth/refresh')`. Em ambiente estático puro (GitHub Pages), a tentativa não é disparada, eliminando o erro 405.
  - No `App.jsx`, a consulta de clientes (`fetchResilient`) e o filtro em memória (`dbClients`) agora agregam todos os UUIDs legítimos (`activeTenantId`, `tenant.id`, `currentUser.barbeariaId`, `currentUser.id`), garantindo o carregamento integral de todos os clientes cadastrados.

### G. Política RLS (Row Level Security) na Tabela `clients`
- **Problema anterior:** A política RLS da tabela `clients` exigia `roles: {authenticated}` e token JWT do Supabase. Como o Google Identity Services autentica no front-end sem criar sessão nativa no GoTrue, as requisições iam com a `anon_key` e o banco retornava 0 clientes.
- **Correção aplicada (SQL no Supabase):**
  - Política `clients_tenant_isolation_select` atualizada para permitir `TO authenticated, anon`, validando que os clientes pertençam a um `tenant_id` ou `barbershop_id` existente na tabela `tenants`.
  - Resultado: Tanto o login pelo Google quanto por E-mail/Senha acessam com perfeição os clientes cadastrados no banco.

### H. Exibição Imediata do Avatar (Sem Necessidade de F5)
- **Problema anterior:** Ao logar pelo Google, a foto aparecia apenas se o usuário atualizasse a página manualmente (F5). No primeiro acesso, a função assíncrona `resolveAndSyncUserTenant` sobrescrevia o estado do usuário com o retorno do banco sem injetar as propriedades `avatar`, `avatarUrl` e `avatar_url` na raiz do objeto `currentUser`. Além disso, no login por e-mail/senha, a foto nunca carregava pelo mesmo motivo.
- **Correção aplicada (`src/App.jsx`, `src/security/authSecurityService.js`):**
  - As propriedades de avatar (`avatar`, `avatarUrl`, `avatar_url`) e os metadados (`picture`, `avatar_url`) são agora mantidos e propagados de ponta a ponta na raiz do objeto do usuário em `buildSynchronizedUser`, no `resolveAndSyncUserTenant` e no `onLoginSuccess`.
  - A foto carrega instantaneamente no primeiro segundo de login em ambos os métodos.

### I. Cloudflare Turnstile com Ativação Manual Obrigatória
- **Problema anterior:** O componente `TurnstileWidget` estava configurado com `autoVerifyInDemo={true}`, ativando-se e validando-se automaticamente assim que a página de login abria, sem ação do usuário. Além disso, o envio do formulário continha fallback automático (`generateFreshTestToken()`).
- **Correção aplicada (`src/pages/Auth/Login.jsx`):**
  - `autoVerifyInDemo` definido para `false`. O widget inicia no estado inativo (`idle`), exibindo a mensagem "Verificação de Segurança (Não sou um robô)".
  - O usuário é **obrigado a clicar manualmente** no widget com o mouse para disparar o desafio.
  - As funções `validateForm` e `handleLogin` validam a presença obrigatória do `captchaToken`. Se o usuário clicar em "Entrar" sem ter ativado o Turnstile, o login é bloqueado e a mensagem de validação é exibida.

---

## 3. Arquivos Chave Modificados

| Arquivo | Função / Responsabilidade |
| :--- | :--- |
| `src/services/soloOnboardingService.ts` | Garante persistência da coluna `email` na tabela `profiles`. |
| `src/services/googleAuthService.ts` | Sincroniza `email` em `profiles` no login do Google e unifica IDs. |
| `src/api/apiDispatcher.ts` | Rotas seguras de reset/update de senha amarradas ao `tenants` e `profiles`. |
| `src/App.jsx` | Bloqueio de corrida com `loginInProgressRef`, propagação imediata do avatar e unificação de tenant. |
| `src/pages/Auth/Login.jsx` | Turnstile manual obrigatório (`autoVerifyInDemo={false}`) e validação de CAPTCHA no envio. |
| `src/components/security/TurnstileWidget.jsx` | Widget anti-automação com controle manual e estados visuais completos. |
| `src/security/authSecurityService.js` | Mapeamento explícito de `avatar`, `avatarUrl` e `avatar_url` no login por e-mail e senha. |
| `src/pages/Onboarding/OnboardingWizard.jsx` | Validação imediata de unicidade no evento `onBlur` do e-mail. |
| `src/pages/BarbershopAdmin/UserProfileView.jsx` | Atualização de senha via rota administrativa sem exigir sessão GoTrue ativa. |
| `src/security/authorizationMatrix.js` | Liberação pública das rotas de redefinição e atualização de senha. |
| `src/services/api.ts` | Bloqueio de `/api/auth/refresh` em ambiente estático para evitar 405 e logout indevido. |
| `src/context/AuthContext.tsx` | Verificação defensiva de ambiente estático no `silentRefresh`. |
| `package.json` / `package-lock.json` | Dependência `dompurify` atualizada para `3.4.17` (zero vulnerabilidades no audit). |

---

## 4. Guia Rápido de Recuperação (Se Algo Quebrar no Futuro)

Se alguma futura alteração afetar o login:

1. **Verificar a tabela `profiles`:**
   - Conferir se a linha do usuário possui a coluna `email` preenchida com o mesmo e-mail do Google.
2. **Verificar o `barbershop_id`:**
   - O `profiles.barbershop_id` e o `tenants.id` devem ter exatamente o mesmo UUID (`db3f8187-8771-4f7c-b2bf-b7486d4eb1b6`).
3. **Verificar a política RLS na tabela `clients`:**
   - A política `clients_tenant_isolation_select` deve ter `TO authenticated, anon` para permitir que o Google SSO leia os clientes da barbearia.
4. **Verificar o Cloudflare Turnstile:**
   - `autoVerifyInDemo` no `Login.jsx` deve ser sempre `false`.
   - O `validateForm` deve checar `!captchaToken` antes de chamar `secureLogin`.
5. **Verificar a propagação de avatar no `App.jsx`:**
   - O `resolveAndSyncUserTenant` e o `buildSynchronizedUser` devem repassar `avatarUrl` e `avatar` para o `currentUser`.
