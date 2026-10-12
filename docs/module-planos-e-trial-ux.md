# Módulo de Planos, Assinaturas & Experiência do Período de Testes (Trial UX)

## 1. Visão Geral da Arquitetura de Planos

O sistema SaaS Barbearia opera em um modelo multi-tenant híbrido com 4 planos principais:

| Plano | Categoria | Cadeiras / Barbeiros | Preço | Checkout Mercado Pago |
| :--- | :--- | :--- | :--- | :--- |
| **Plano de Teste** | Gratuito (Trial) | Até 2 Cadeiras | R$ 0,00 (7 Dias) | Não requer cartão |
| **Starter (Solo)** | Pago Ativo | 1 Cadeira / Barbeiro | R$ 69,90/mês | PIX / Cartão em até 12x |
| **Pro** | Pago Ativo | Até 6 Cadeiras | R$ 149,90/mês | PIX / Cartão em até 12x |
| **Entreprise** | Pago Ativo | Ilimitado | R$ 279,90/mês | PIX / Cartão em até 12x |

---

## 2. Regras de Negócio e Governança da UI (UX)

### A. Visibilidade da Barra de Contagem Regressiva e Botão de Upgrade
O componente visual do topo (`TrialBanner`):
> *"Período de Avaliação: Você tem X dias restantes de Teste Grátis na sua barbearia."*  
> Botão: `[ Fazer Upgrade / Assinar ]`

**Regra Estrita:**
- **Apenas no Plano Trial:** Esse componente e o botão de upgrade são renderizados **exclusivamente** quando a barbearia estiver no status ou plano de teste (`isTenantTrial === true`).
- **Planos Pagos (Starter, Pro, Entreprise):** Quando o usuário realiza o pagamento e migra para qualquer plano pago (exemplo: usuário `ddoanjos@gmail.com` no plano Starter), a barra do topo e o botão de upgrade ficam **completamente ocultos e desativados**. O cliente pagante desfruta de um painel limpo, sem contagem regressiva e sem mensagens de teste.

### B. Gestão de Planos para Usuários Pagantes
- Usuários em planos pagos mantêm o selo do seu plano ativo visível no menu lateral (Sidebar) (ex: `STARTER`, `PRO`, `ENTREPRISE`).
- Ao clicar no link `"Planos"` na Sidebar, o modal oficial *"Escolha o plano ideal para sua barbearia"* é aberto permitindo fazer upgrades futuros (ex: de Starter para Pro ou Entreprise via Mercado Pago).

### C. Ocultação do Plano Trial para Usuários Pagantes & Exclusividade do SuperAdmin
- **Ocultação do Card de Teste (Trial):** Para qualquer usuário que já possua um plano contratado e ativo (`Starter`, `Pro`, `Entreprise`), a opção do "Plano de Teste" **não é exibida** na grade de planos do modal de upgrades (`displayPlans` filtra estritamente o plano de teste quando `!isCurrentTrial`). O usuário pagante visualiza exclusivamente os planos pagos disponíveis para upgrade ou manutenção.
- **Autoridade Única do SuperAdmin (`atendmentor@gmail.com`):**
  - Somente o SuperAdmin oficial possui a credencial e a permissão administrativa para reverter uma barbearia com plano pago de volta ao status `trial` ou atribuir dias adicionais de teste.
  - A opção de selecionar e ativar o "Plano de Teste (Trial Grátis 7 Dias - Exclusivo SuperAdmin)" existe **exclusivamente no Painel SuperAdmin** (`/superadmin`), no modal de edição de barbearias e no modal de bônus de dias.
  - Usuários finais e administradores comuns da barbearia não têm permissão para atribuir a si mesmos o plano de teste.

### D. Reversibilidade Dinâmica
- Caso o SuperAdmin reative o plano Trial para a barbearia (ou conceda bônus de dias de teste), o banco de dados Supabase (`tenants` e `barbershops`) e o cache local (`safeStorage`) são atualizados imediatamente.
- Na tela da barbearia, o componente de contagem regressiva e o botão `[ Fazer Upgrade / Assinar ]` **voltam a aparecer automaticamente na interface (UI)** refletindo os dias restantes concedidos.

### E. Eliminação Total de Mocks e Fallbacks Falsos-Positivos
- **Consistência Direta com o Banco de Dados (Supabase):** Toda e qualquer lista estática ou de contingência com dados fictícios (nomes de barbearias fictícias como "Vintage Club", serviços genéricos, produtos de vitrine/bar e barbeiros como Carlos Silva) foi totalmente removida do fluxo operacional.
- **Tabelas Oficiais Consultadas:** `barbershops`, `tenants`, `services`, `products`, `barbers`, `appointments`, `clients`.
- **Estados Vazios Autênticos:** Se a barbearia não possuir produtos cadastrados, o painel exibe um estado vazio autêntico e limpo com botão para cadastro, sem injetar itens ou preços simulados.

---

## 3. Matriz Técnica de Implementação

### 1. `src/components/dashboard/TrialBanner.jsx`
- Função determinística `isTenantTrial(tenant)`:
  - Avalia `tenant.status === 'trial'`, `tenant.plan` e `tenant.subscription_plan`.
  - Retorna `false` para `starter`, `pro` e `enterprise`.
- Controle de renderização:
  ```javascript
  const isCurrentTrial = isTenantTrial(tenant);
  const showBanner = isCurrentTrial && trialDaysLeft !== undefined && trialDaysLeft !== null;
  const isExpired = isCurrentTrial && typeof trialDaysLeft === "number" ? trialDaysLeft <= 0 : false;
  ```
- Bloqueio no modal:
  ```javascript
  if (isPlanTrial && !isCurrentTrial) {
    setErrorMessage("Sua barbearia já possui um plano pago ativo. O retorno ao Plano de Teste é restrito e só pode ser ativado pelo SuperAdmin oficial (atendmentor@gmail.com).");
    return;
  }
  ```

### 2. `src/pages/BarbershopAdmin/BarbershopDashboard.jsx`
- Cálculo seguro de `realDaysLeft`: retorna `0` caso a conta não esteja no modo trial.
- Sincronização assíncrona (`syncTenantPlanFromSupabase`): reflete em tempo real qualquer alteração realizada pelo SuperAdmin.
- Ao assinar plano pago via Mercado Pago (`onSubscribePlan`), define `trial_days_left: 0` e `status: 'active'`.

### 3. `src/pages/SuperAdmin/SuperAdminDashboard.jsx`
- Disponibiliza a opção `{ value: "trial", label: "Plano de Teste (Trial Grátis 7 Dias - Exclusivo SuperAdmin)" }` no seletor de planos.
- Ao salvar a transição para Trial, recalcula `trial_ends_at`, `trial_days_left: 7`, `status: "trial"` e sincroniza as tabelas `tenants`, `barbershops` e o cache do navegador (`safeStorage`).
