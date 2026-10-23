# Registro Oficial de Atualização de Autenticação & Login

> **Data de Conclusão:** 23 de outubro de 2026  
> **Status:** ✅ Atualização realizada com sucesso no dia 23 de outubro. Sincronização do e-mail Google com E-mail/Senha finalizada e testada em produção local e remota.  
> **Repositório:** `DemetriodosAnjos/barbearia-saas` (branch `main`)  
> **Commit de Referência:** `5b465be` e `725efe3`

---

## 1. Objetivo da Atualização

Eliminar a duplicidade de cadastros e divergência de UUIDs na plataforma. Anteriormente, ao entrar pelo botão **"Entrar com o Google"**, o sistema criava a barbearia original com o plano **TRIAL** e carregava os clientes. Porém, ao tentar entrar ou redefinir a senha via **E-mail e Senha**, o sistema gerava um segundo UUID e um segundo tenant em branco com 0 clientes.

A partir de 23 de outubro de 2026, **o e-mail do usuário é a chave única e soberana de identidade em todo o sistema**, garantindo que ambos os métodos de entrada acessem exatamente o mesmo tenant, o mesmo plano e os mesmos dados.

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

---

## 3. Arquivos Chave Modificados

| Arquivo | Função / Responsabilidade |
| :--- | :--- |
| `src/services/soloOnboardingService.ts` | Garante persistência da coluna `email` na tabela `profiles`. |
| `src/services/googleAuthService.ts` | Sincroniza `email` em `profiles` no login do Google e unifica IDs. |
| `src/api/apiDispatcher.ts` | Rotas seguras de reset/update de senha amarradas ao `tenants` e `profiles`. |
| `src/App.jsx` | Bloqueio de corrida com `loginInProgressRef` e resolução unificada do tenant. |
| `src/pages/Auth/Login.jsx` | Disparo correto das rotas locais e integração do fluxo esqueci minha senha. |
| `src/pages/Onboarding/OnboardingWizard.jsx` | Validação imediata de unicidade no evento `onBlur` do e-mail. |
| `src/pages/BarbershopAdmin/UserProfileView.jsx` | Atualização de senha via rota administrativa sem exigir sessão GoTrue ativa. |
| `src/security/authorizationMatrix.js` | Liberação pública das rotas de redefinição e atualização de senha. |
| `src/services/api.ts` | Tratamento inteligente de URLs para evitar redirecionamento CORS indevido. |

---

## 4. Guia Rápido de Recuperação (Se Algo Quebrar no Futuro)

Se alguma futura alteração desvincular o login com Google do login com e-mail e senha:

1. **Verificar a tabela `profiles`:**
   - Conferir se a linha do usuário possui a coluna `email` preenchida com o mesmo e-mail do Google.
2. **Verificar o `barbershop_id`:**
   - O `profiles.barbershop_id` e o `tenants.id` devem ter exatamente o mesmo UUID.
3. **Verificar o `apiDispatcher.ts`:**
   - Garantir que as rotas de reset e update de senha consultem `tenants.owner_email` como fallback se `profiles.email` não retornar dados imediatos.
4. **Verificar o `loginInProgressRef` em `App.jsx`:**
   - Garantir que o `onAuthStateChange` não esteja executando uma segunda chamada de `loadDataFromSupabase` logo após o `onLoginSuccess`.
