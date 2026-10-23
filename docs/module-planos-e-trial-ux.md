# Módulo de Planos, Assinaturas & Experiência do Período de Testes (Trial UX)

## 1. Visão Geral da Arquitetura de Planos

O sistema SaaS Barbearia opera em um modelo multi-tenant híbrido com 4 planos principais:

| Plano | Categoria | Cadeiras / Barbeiros | Preço | Checkout Mercado Pago |
| :--- | :--- | :--- | :--- | :--- |
| **Plano Trial** | Gratuito (Trial) | Apenas 1 Profissional | R$ 0,00 (7 Dias) | Não requer cartão |
| **Starter (“Mais Popular”)** | Pago Ativo | Até 2 Profissionais | R$ 69,90/mês | PIX / Cartão em até 12x |
| **Pro** | Pago Ativo | Até 5 Profissionais | R$ 149,90/mês | PIX / Cartão em até 12x |
| **Enterprise** | Pago Ativo | Até 15 Profissionais | R$ 279,90/mês | PIX / Cartão em até 12x |

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

### C. Ocultação do Plano Trial para Usuários Pagantes, Ativação em Trial & Exclusividade do SuperAdmin
- **Ocultação do Card de Teste (Trial) para Pagantes:** Para qualquer usuário que já possua um plano contratado e ativo (`Starter`, `Pro`, `Entreprise`), a opção do "Plano de Teste" **não é exibida** na grade de planos do modal de upgrades (`displayPlans` filtra estritamente o plano de teste quando `!isCurrentTrial`). O usuário pagante visualiza exclusivamente os planos pagos disponíveis para upgrade ou manutenção.
- **Acesso ao Modal via Menu Lateral (Sidebar):**
  - No link do menu lateral (`Nome do plano` + Tag `"Planos"`), ao clicar para abrir a tela *"Escolha o plano ideal para sua barbearia"*:
  - **Quando em Modo Trial:** A barbearia visualiza o card do "Plano de Teste" ativado e destacado com a badge oficial **"Seu Plano Atual"** no topo e o botão correspondente **"Seu Plano Atual"**, além dos outros planos pagos disponíveis para upgrade.
  - **Quando em Modo Pago:** O modal abre exibindo o plano contratado (ex: Starter) com a tag "Seu Plano Atual" e os planos superiores para upgrade, mantendo o Trial ocultado.
- **Autoridade Única do SuperAdmin (`atendmentor@gmail.com`):**
  - Somente o SuperAdmin oficial possui a credencial e a permissão administrativa para reverter uma barbearia com plano pago de volta ao status `trial` ou atribuir dias adicionais de teste.
  - A opção de selecionar e ativar o "Plano de Teste (Trial Grátis 7 Dias - Exclusivo SuperAdmin)" existe **exclusivamente no Painel SuperAdmin** (`/superadmin`), no modal de edição de barbearias e no modal de bônus de dias.
  - Usuários finais e administradores comuns da barbearia não têm permissão para atribuir a si mesmos o plano de teste.

### D. Modal de Confirmação de Alteração de Plano no SuperAdmin
- Ao clicar no botão **"Salvar Alterações"** do modal *"Gerenciar Barbearia: [nome da barbearia]"* no Painel SuperAdmin, o sistema intercepta o fluxo e exibe um modal de confirmação:
  > **Confirmar Alteração de Plano**  
  > *"Tem certeza de que deseja realizar a alteração do Plano 'X' para o Plano 'Y'?"*  
  > Botões:  
  > 1. `[ SIM, alterar plano ]` (Confirmação primária)  
  > 2. `[ Cancelar ]` (Retorna à edição sem alterar)
- Ao clicar em **"SIM, alterar plano"**, o sistema sincroniza o banco de dados Supabase da mesma forma que a seleção feita pelo usuário:
  - Se alterado para `trial`: define `status: 'trial'`, `trial_days_left: 7`, `trial_ends_at: +7 dias` nas tabelas `tenants` e `barbershops`.
  - Se alterado para plano pago (`starter`, `pro`, `enterprise`): define `status: 'active'`, `trial_days_left: 0`, `trial_ends_at: null` nas tabelas `tenants` e `barbershops`.
  - Atualiza em tempo real o estado em memória e os caches `saas_active_tenant` e `barbearia_tenant_cache`.

### E. Reversibilidade Dinâmica
- Caso o SuperAdmin reative o plano Trial para a barbearia (ou conceda bônus de dias de teste), o banco de dados Supabase (`tenants` e `barbershops`) e o cache local (`safeStorage`) são atualizados imediatamente.
- Na tela da barbearia, o componente de contagem regressiva e o botão `[ Fazer Upgrade / Assinar ]` **voltam a aparecer automaticamente na interface (UI)** refletindo os dias restantes concedidos.

### F. Eliminação Total de Mocks e Fallbacks Falsos-Positivos
- **Consistência Direta com o Banco de Dados (Supabase):** Toda e qualquer lista estática ou de contingência com dados fictícios (nomes de barbearias fictícias como "Vintage Club", serviços genéricos, produtos de vitrine/bar e barbeiros como Carlos Silva) foi totalmente removida do fluxo operacional.
- **Tabelas Oficiais Consultadas:** `barbershops`, `tenants`, `services`, `products`, `barbers`, `appointments`, `clients`.
- **Estados Vazios Autênticos:** Se a barbearia não possuir produtos cadastrados, o painel exibe um estado vazio autêntico e limpo com botão para cadastro, sem injetar itens ou preços simulados.

### G. Arquitetura de Tabelas no Supabase & Sincronização em Tempo Real (Realtime)
- **Não é necessário criar novas tabelas no Supabase:** As tabelas existentes `tenants` e `barbershops` atendem 100% dos fluxos do sistema.
- **Check Constraint de `barbershops` (`barbershops_plan_check`):**
  - No banco PostgreSQL, a coluna `barbershops.plan` possui uma restrição do tipo `CHECK (plan IN ('starter', 'pro', 'enterprise'))`.
  - Portanto, o status e nome do plano de testes são persistidos oficialmente na coluna `barbershops.subscription_plan` (`'trial'` ou `'Plano de Teste'`) e `payment_status: 'trial'`.
  - Na tabela `tenants`, os campos oficiais são `plan: 'trial'`, `status: 'trial'`, `trial_days_left: 7` e `trial_ends_at`.
- **Gatilho e Sincronização em Tempo Real (Realtime & Window Events):**
  - **Canal Supabase Realtime:** `BarbershopDashboard` assina o canal `postgres_changes` escutando atualizações (`UPDATE`) em tempo real nas tabelas `barbershops` e `tenants`. Quando o SuperAdmin altera o plano no painel, a alteração é transmitida instantaneamente para a interface da barbearia.
  - **Evento Local (`saas:tenant-plan-updated`):** Garante latência zero para alterações realizadas na mesma janela do navegador ao salvar pelo SuperAdmin ou ao contratar novo plano pelo Checkout Mercado Pago.
  - **Atualização na Transição de Telas:** Ao clicar em *"Acessar Painel da Barbearia"*, o sistema revalida o registro no Supabase garantindo que os dados em cache reflitam o estado mais recente do banco.

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

### 4. Hierarquia de Z-Index e Prevalência do Banner de Trial no Scroll (v1.5.4.1)
- **Problema de Sobreposição:** Anteriormente, a `Navbar` (`sticky top-0 z-40`) sobrepunha a barra de contagem regressiva de Trial (`TrialBanner` com `z-30`) durante o scroll vertical da página.
- **Prevalência Absoluta do Banner (`z-[100]`):**
  - O contêiner de contagem regressiva (`TrialBanner.jsx`) recebeu `sticky top-0 z-[100]`, `data-trial-banner="true"` e a classe `.trial-banner-top`.
  - Regra CSS com máxima especificidade adicionada em `src/index.css` (`z-index: 100 !important`).
- **Harmonização do Scroll com a Navbar:**
  - A `Navbar` foi ajustada para receber a prop `hasTrialBanner`. Quando o banner de teste estiver ativo, a Navbar adota deslocamento `top-[41px]`, garantindo que ambos fiquem visíveis e fixos no topo sem colisão durante toda a rolagem.
  - Modais globais (`Modal.styles.js`, `ActionSpinnerOverlayModal.jsx`) operam com `z-[200]` para sobrepor adequadamente todos os elementos da tela ao serem acionados.

