# Módulo: Gestão de Equipe / Barbeiros (`/docs/module-equipe.md`)

## 1. Visão Geral
O módulo **Gestão de Equipe (`BarbersTeamView.jsx`)** é responsável pela administração de todos os profissionais e barbeiros vinculados ao salão (tenant), contemplando:
- Informações cadastrais e contratuais individuais.
- Comissões diferenciadas: percentual sobre serviços (`service_commission`) e sobre produtos (`product_commission`).
- Chave PIX oficial para repasse financeiro de comissões (suporte a CPF, E-mail, Celular ou chave aleatória EVP/UUID).
- Escala de trabalho semanal (`schedule`) com horários de início/fim e intervalos (`breaks`).
- Status operacional (`active`, `vacation`, `inactive`).
- Vínculo com a conta de autenticação do Supabase (`auth.users`), permitindo acesso restrito ao barbeiro.

---

## 2. Estrutura SQL Oficial da Tabela `barbers` (20 Colunas)

Todas as 21 colunas devem ser respeitadas em consultas, inserções e atualizações:

| Coluna | Tipo SQL | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|
| `id` | `text` | Não | ID único do profissional (ex: UUID ou `barb-xxx`). |
| `barbershop_id` | `uuid` | Não | ID da barbearia dona do cadastro (Multi-tenancy). |
| `name` | `text` | Não | Nome completo de registro do profissional. |
| `display_name` | `text` | Sim | Apelido / Nome público exibido na agenda e para os clientes. |
| `role` | `text` | Não | Cargo/função (ex: `'Barbeiro Profissional'`, `'Master Barber'`, `'Colorista'`). |
| `avatar` | `text` | Sim | URL da foto de perfil ou iniciais de identificação visual. |
| `rating` | `numeric` | Sim | Nota média de avaliação (0.00 a 5.00). Default: 5.0. |
| `review_count` | `integer` | Sim | Quantidade total de avaliações recebidas. |
| `status` | `text` | Não | Situação: `'active'` (ativo), `'vacation'` (férias), `'inactive'` (desativado). |
| `specialties` | `ARRAY` (`text[]`) | Sim | Lista de especialidades (ex: `['Degradê', 'Barboterapia', 'Platinado']`). |
| `breaks` | `jsonb` | Sim | Configurações de horários de almoço/pausa por dia. |
| `schedule` | `jsonb` | Sim | Grade de horários de entrada e saída para cada dia da semana. |
| `commission_percentage` | `numeric` | Sim | Percentual geral de comissão padrão (legado / fallback). |
| `service_commission` | `numeric` | Não | Percentual específico de comissão sobre serviços (0 a 100%). |
| `product_commission` | `numeric` | Não | Percentual específico de comissão sobre produtos (0 a 100%). |
| `email` | `text` | Sim | E-mail corporativo / chave de login no sistema. |
| `phone` | `text` | Sim | Telefone / WhatsApp com DDD para contato e notificações. |
| `pix_type` | `text` | Sim | Tipo de chave PIX: `'cpf'`, `'phone'`, `'email'`, `'random'`. |
| `pix_key` | `text` | Sim | Chave PIX informada pelo profissional para recebimento de comissões (sem gerador randômico automático). |
| `notes` | `text` | Sim | Anotações internas da gerência sobre o profissional. |
| `created_at` | `timestamptz` | Não | Data/hora de inclusão do registro no banco. |

---

## 3. Integração com Autenticação (`auth.users`)
- Cada barbeiro pode estar associado a um usuário no `supabase.auth.users`.
- O papel (`role`) no `raw_user_meta_data` do token JWT determina a visibilidade:
  - `role: 'admin'` / `role: 'superadmin'`: visualiza e edita todos os barbeiros e comissões do salão.
  - `role: 'barber'`: visualiza apenas seus próprios agendamentos, comissões e horários de trabalho.

---

## 4. Regras de Carregamento e Persistência no Supabase
1. **Busca no Montar (Fetch Resiliente):**
   - Ao carregar `BarbersTeamView`, executar consulta:
     ```javascript
     supabase.from("barbers").select("*").eq("barbershop_id", tenantId).order("name");
     ```
   - Tratar caso de fallback: se a resposta for vazia ou erro de rede temporário, manter os dados em cache/props sem travar a interface.
2. **Novo Barbeiro (+ Cadastrar):**
   - Inserir com `supabase.from("barbers").insert([{ ...payload, barbershop_id: tenantId }])`.
   - Propagar imediatamente para o estado global (`onUpdateBarbers`) para sincronizar a Agenda de Atendimentos.
3. **Edição e Escala:**
   - Atualizar via `supabase.from("barbers").update(payload).eq("id", barberId)`.
4. **Mapeamento Bidirecional:**
   - Sempre manter a conversão segura entre `snake_case` (banco de dados) e `camelCase` (componentes React).
5. **Normalização Defensiva de `breaks` e `schedule`:**
   - A coluna `breaks` (JSONB) pode conter um array de pausas `[{ startTime, endTime, label }]` ou um objeto de metadados. O front-end e o validador Zod devem sempre garantir `Array.isArray(breaks)` antes de iterar com `.map()` ou `.some()`, extraindo intervalos de almoço da coluna `schedule[].breakStart/breakEnd` para evitar quebras em tempo de execução.

---

## 5. Limites de Profissionais por Plano & Análise de UX (`PlanLimitModal.jsx`)

Ao clicar no botão `+ Novo Barbeiro`, o sistema valida imediatamente a quantidade de profissionais já cadastrados na barbearia contra o limite contratado do plano ativo (`barbers.length >= maxBarbers`). Caso o limite seja atingido, a abertura do formulário de cadastro é bloqueada e o modal correspondente ao plano é exibido.

### Matriz de Limites e Estrutura dos Modais:

1. **Plano Trial (Limite: 1 profissional)**
   - **Bloqueio:** Impede o cadastro de mais de 1 profissional.
   - **Título:** `Plano Trial`
   - **Texto:** `este plano só permite 1 cadastro, caso deseje cadastrar mais profissionais escolha os planos Starter Pro ou Enterprise`
   - **Link:** `Starter / Pro / Enterprise` (redireciona para o modal de upgrades com seleção do plano)
   - **Ações:** Botão fechar `(x)` e botão primário `Ok, entendi!` (fecham o modal).

2. **Plano Starter (Limite: 2 profissionais)**
   - **Bloqueio:** Impede o cadastro de mais de 2 profissionais.
   - **Título:** `Plano Starter “Mais Popular”`
   - **Texto:** `este plano só permite 2 cadastros, caso deseje cadastrar mais profissionais escolha os planos Pro ou Enterprise`
   - **Link:** `Pro / Enterprise` (redireciona para o modal de upgrades)
   - **Ações:** Botão fechar `(x)` e botão primário `Ok, entendi!` (fecham o modal).

3. **Plano Pro (Limite: 5 profissionais)**
   - **Bloqueio:** Impede o cadastro de mais de 5 profissionais.
   - **Título:** `Plano Pro`
   - **Texto:** `este plano só permite 5 cadastros, caso deseje cadastrar mais profissionais escolha o plano Enterprise`
   - **Link:** `Enterprise` (redireciona para o modal de upgrades)
   - **Ações:** Botão fechar `(x)` e botão primário `Ok, entendi!` (fecham o modal).

4. **Plano Enterprise (Limite: 15 profissionais)**
   - **Bloqueio:** Impede o cadastro de mais de 15 profissionais.
   - **Título:** `Plano Enterprise`
   - **Texto:** `este plano permite 15 cadastros caso deseje cadastrar mais profissionais entre em contato com o suporte técnico`
   - **Link:** `Suporte Técnico` (abre o canal oficial de suporte / WhatsApp para liberação de vagas corporativas)
   - **Ações:** Botão fechar `(x)` e botão primário `Ok, entendi!` (fecham o modal).

---

## 6. Redesign da Tela de Equipe: Arquitetura dos 4 Componentes

A tela de gestão de equipe (`BarbersTeamView.jsx`) foi totalmente redesenhada substituindo os cards volumosos por uma data table moderna e inline de alta produtividade:

### COMPONENTE 1: Header (Topo)
- **Ícone:** Tesoura (`Scissors` da Lucide) estilizada em âmbar.
- **Título & Subtítulo:** Identificação oficial da tela e subtítulo de gestão de comissões/escalas.
- **Tag de Capacidade:** Contagem dinâmica de cadeiras ocupadas com limite do plano (ex: `15 de 15 Cadeiras ocupadas`).
- **Botões:**
  - `Novo Barbeiro`: Ícone `Plus` da biblioteca Lucide substituindo o caracter "+".
  - `Voltar`: Ícone `ArrowLeft` para retorno rápido à agenda.

### COMPONENTE 2: Barra de Pesquisa & Ordenação (Novo)
- **Busca em Tempo Real:** Campo com ícone `Search` da Lucide. A cada caractere digitado pelo operador, filtra instantaneamente os profissionais comparando nome completo, apelido (`displayName`), cargo ou iniciais (ex: digitar `"c"` filtra profissionais com iniciais C).
- **Ordenação:** Texto `Ordenar por:` acompanhado de dois botões de rádio estilizados com ícones:
  - `Crescente` (A-Z, com ícone `ArrowUpAZ`).
  - `Decrescente` (Z-A, com ícone `ArrowDownZA`).
  - Permite seleção única e reordena a lista reativamente.

### COMPONENTE 3: Barra de Título (Header Inline da Lista)
Alinhamento horizontal em colunas (`grid md:grid-cols-12`) contendo:
- `Checkbox`: Seleciona ou desmarca todos os profissionais da lista de uma única vez.
- `Profissional` (Avatar + Nome + Cargo).
- `Telefone`.
- `Status`.
- `Chave Pix`.
- `Ação`.

### COMPONENTE 4: Linhas da Lista de Profissionais (Inline)
Cada linha apresenta todos os dados no mesmo alinhamento horizontal:
1. **Checkbox:** Seleção individual do profissional (com suporte a ações em lote quando múltiplos itens forem marcados).
2. **Avatar:** Foto oficial ou iniciais geradas dinamicamente (ex: `CE` para Carlos Eduardo) com badge colorido de status operacional.
3. **Nome:** Nome completo e display name/cargo.
4. **Telefone:** Telefone formatado com DDD (ex: `(44) 9999-9999`).
5. **Status:** Badge com cor (Ativo, Férias, Inativo) e ícone `ChevronDown`, abrindo um dropdown rápido para alterar a situação do profissional no Supabase com 1 clique.
6. **Chave Pix:** Exibe a chave cadastrada com tipo (`CPF`, `E-mail`, `Telefone`, `Aleatória`) ou texto `"Não cadastrado"`, acompanhado do botão de cópia com ícone `Copy` e feedback de `Check` verde ("Copiado!").
7. **Ações:** Botões com ícones dedicados:
   - `Editar Dados` (`Edit3`): abre o formulário de edição de cadastro.
   - `Ficha do Profissional` (`FileText`): abre a ficha cadastral do barbeiro.
   - `Escala & Horários` (`Clock`): atalho para o modal de horários e almoço.


