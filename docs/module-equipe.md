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

Todas as 20 colunas devem ser respeitadas em consultas, inserções e atualizações:

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
| `pix_key` | `text` | Sim | Chave PIX cadastrada para pagamento de comissões. |
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
