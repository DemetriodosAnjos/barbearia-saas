# Análise de UX: Limites de Profissionais por Plano & Modais de Bloqueio

Este documento detalha o comportamento da experiência do usuário (UX), fluxos de bloqueio e arquitetura de componentes implementada para os limites de cadastro de barbeiros/profissionais na tela de equipe (`BarbersTeamView.jsx`).

---

## 1. Regras de Limites por Plano

| Plano | Limite Máximo de Profissionais | Comportamento ao Clicar em "+ Novo Barbeiro" |
| :--- | :---: | :--- |
| **Plano Trial** | **1** profissional | Se já houver 1 ou mais cadastrados, bloqueia e abre o modal do Plano Trial. |
| **Plano Starter (“Mais Popular”)** | **2** profissionais | Se já houver 2 ou mais cadastrados, bloqueia e abre o modal do Plano Starter. |
| **Plano Pro** | **5** profissionais | Se já houver 5 ou mais cadastrados, bloqueia e abre o modal do Plano Pro. |
| **Plano Enterprise** | **15** profissionais | Se já houver 15 ou mais cadastrados, bloqueia e abre o modal do Plano Enterprise. |

---

## 2. Estrutura dos Modais de Bloqueio (`PlanLimitModal.jsx`)

### A. Plano Trial
- **Título:** `Plano Trial`
- **Texto:** `este plano só permite 1 cadastro, caso deseje cadastrar mais profissionais escolha os planos Starter Pro ou Enterprise`
- **Link:** `Starter / Pro / Enterprise` (links clicáveis que fecham o modal de limite e abrem o modal de seleção e contratação de planos)
- **Ações:**
  - Botão fechar `(x)` no cabeçalho => fecha o modal.
  - Botão primário `Ok, entendi!` => fecha o modal.

### B. Plano Starter (“Mais Popular”)
- **Título:** `Plano Starter “Mais Popular”`
- **Texto:** `este plano só permite 2 cadastros, caso deseje cadastrar mais profissionais escolha os planos Pro ou Enterprise`
- **Link:** `Pro / Enterprise` (links clicáveis que fecham o modal de limite e abrem o modal de planos)
- **Ações:**
  - Botão fechar `(x)` no cabeçalho => fecha o modal.
  - Botão primário `Ok, entendi!` => fecha o modal.

### C. Plano Pro
- **Título:** `Plano Pro`
- **Texto:** `este plano só permite 5 cadastros, caso deseje cadastrar mais profissionais escolha o plano Enterprise`
- **Link:** `Enterprise` (link clicável que fecha o modal de limite e abre o modal de planos com destaque no Enterprise)
- **Ações:**
  - Botão fechar `(x)` no cabeçalho => fecha o modal.
  - Botão primário `Ok, entendi!` => fecha o modal.

### D. Plano Enterprise
- **Título:** `Plano Enterprise`
- **Texto:** `este plano permite 15 cadastros caso deseje cadastrar mais profissionais entre em contato com o suporte técnico`
- **Link:** `Suporte Técnico` (link direto com ícone que abre o canal oficial de Suporte Técnico / WhatsApp para liberação de cadeiras adicionais para grandes redes)
- **Ações:**
  - Botão fechar `(x)` no cabeçalho => fecha o modal.
  - Botão primário `Ok, entendi!` => fecha o modal.

---

## 3. Segurança e Anti-Bypass

1. **Validação no Gatilho da UI (`handleOpenNewBarberModal`):**
   - Antes de abrir o modal de cadastro de novo barbeiro, o sistema confere se `barbers.length >= planMaxBarbers`.
   - Se atingido, interrompe o fluxo imediatamente e exibe o `PlanLimitModal`.

2. **Validação na Persistência (`handleSaveNewBarber`):**
   - Como segunda camada de defesa (anti-race condition ou inspeção de DOM), o método de inserção no Supabase também valida a quantidade de profissionais antes de emitir a chamada de banco de dados.

3. **Feedback de Capacidade em Tempo Real:**
   - O selo de capacidade na tela de equipe (`capacityBadge`) agora reflete dinamicamente a cota do plano ativo:
     - Ex: `1 de 1 vaga ocupada` (Trial)
     - Ex: `2 de 2 vagas ocupadas` (Starter)
     - Ex: `5 de 5 vagas ocupadas` (Pro)
     - Ex: `15 de 15 vagas ocupadas` (Enterprise)
