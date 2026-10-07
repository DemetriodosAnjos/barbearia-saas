# Estrutura do Banco de Dados: Supabase PostgreSQL (01-database-schema.md)

Este documento define a Fonte Única da Verdade (SSOT) para os schemas de banco de dados do projeto. Todas as mutações e consultas no Supabase devem aderir a estes tipos.

---

## 1. Tabela: `appointments` (Agendamentos da Barbearia)

Tabela central do núcleo (Core) da aplicação onde convergem clientes, profissionais, horários e valores.

| Nome da Coluna | Tipo de Dado (PostgreSQL) | Obrigatório | Descrição / Regra |
|---|---|---|---|
| `id` | `text` | Sim | Identificador único do agendamento (ex: `apt-17282829291` ou UUID). |
| `barbershop_id` | `uuid` | Sim | Chave estrangeira vinculando a barbearia/tenant (Multi-tenant). |
| `barber_id` | `text` | Sim | Identificador do barbeiro selecionado. |
| `barber_name` | `text` | Não | Nome do barbeiro para desnormalização de consulta rápida. |
| `client_name` | `text` | Sim | Nome completo do cliente agendado. |
| `client_phone` | `text` | Sim | Telefone/WhatsApp com DDD do cliente para confirmações. |
| `service_name` | `text` | Sim | Nome do serviço solicitado (ex: "Corte Tradicional"). |
| `date` | `date` | Sim | Data do atendimento no formato `YYYY-MM-DD`. |
| `start_time` | `text` | Sim | Horário de início no formato `HH:MM` (ex: "10:15"). |
| `end_time` | `text` | Sim | Horário de término estimado (`start_time` + `duration_minutes`). |
| `duration_minutes`| `integer` | Sim | Duração do atendimento em minutos (ex: 30, 45, 60). |
| `price` | `numeric` | Sim | Valor cobrado pelo serviço (ex: 45.00). |
| `status` | `text` | Sim | Status operacional: `'confirmed'`, `'in_service'`, `'completed'`, `'cancelled'`. |
| `is_paid` | `boolean` | Sim | Flag indicando se o atendimento já foi quitado no caixa. |
| `is_vip` | `boolean` | Não | Flag indicando atendimento VIP ou cliente prioritário. |
| `notes` | `text` | Não | Observações e preferências do cliente. |
| `created_at` | `timestamp with time zone` | Sim | Timestamp de criação do registro no banco. |

---

## 2. Tabela: `barbers` (Equipe de Barbeiros)

Mapeamento exato de todas as 20 colunas SQL oficiais no Supabase:

| Nome da Coluna | Tipo de Dado (PostgreSQL) | Obrigatório | Descrição / Regra |
|---|---|---|---|
| `id` | `text` | Sim | Identificador único do barbeiro (ex: `barb-1` ou UUID). |
| `barbershop_id` | `uuid` | Sim | Chave estrangeira da barbearia proprietária (Multi-tenant). |
| `name` | `text` | Sim | Nome completo do profissional. |
| `display_name` | `text` | Não | Nome de exibição na agenda de atendimentos. |
| `role` | `text` | Sim | Cargo/Nível (ex: `'Barbeiro Profissional'`, `'Master Barber'`). |
| `avatar` | `text` | Não | Iniciais, URL de foto ou ícone do profissional. |
| `rating` | `numeric` | Não | Avaliação média (0.0 a 5.0). Padrão: 5.0. |
| `review_count` | `integer` | Não | Total de avaliações recebidas. |
| `status` | `text` | Sim | Status operacional: `'active'`, `'vacation'`, `'inactive'`. |
| `specialties` | `ARRAY` (`text[]`) | Não | Lista de especialidades (ex: `['Degradê', 'Barboterapia']`). |
| `breaks` | `jsonb` | Não | Intervalos e pausas do profissional. |
| `created_at` | `timestamp with time zone` | Sim | Data e hora de cadastro no sistema. |
| `commission_percentage` | `numeric` | Não | Percentual geral de comissão padrão. |
| `schedule` | `jsonb` | Não | Escala semanal com horários de entrada e saída por dia. |
| `email` | `text` | Não | E-mail de contato / login. |
| `phone` | `text` | Não | Telefone / WhatsApp do profissional. |
| `pix_key` | `text` | Não | Chave PIX (CPF, E-mail, Telefone ou Aleatória/EVP). |
| `service_commission` | `numeric` | Sim | Comissão sobre serviços realizados (0 a 100%). |
| `product_commission` | `numeric` | Sim | Comissão sobre venda de produtos (0 a 100%). |
| `notes` | `text` | Não | Anotações administrativas sobre o membro da equipe. |

---

## 3. Tabela: `authentication / users` (Supabase Auth & Perfis)

| Nome da Coluna | Tipo de Dado | Descrição |
|---|---|---|
| `id` | `uuid` | ID único do usuário no Supabase Auth (`auth.users.id`). |
| `email` | `text` | E-mail corporativo / credencial de acesso. |
| `raw_user_meta_data` | `jsonb` | Metadados do usuário (ex: `{ role: 'admin', barbershop_id: 'uuid' }`). |
| `role` | `text` | Papel RBAC: `'superadmin'`, `'admin'`, `'barber'`, `'client'`. |

---

## 3. Tabela: `services` (Catálogo de Serviços)

| Nome da Coluna | Tipo de Dado | Descrição |
|---|---|---|
| `id` | `text` / `uuid` | ID do serviço. |
| `barbershop_id` | `uuid` | Barbearia proprietária. |
| `name` | `text` | Nome do serviço. |
| `category` | `text` | Categoria (`Cabelo`, `Barba`, `Combo`). |
| `price` | `numeric` | Preço de venda. |
| `duration_minutes` | `integer` | Tempo de cadeira estimado. |
| `active` | `boolean` | Disponível para agendamento. |

---

## 4. Tabela: `products` (Estoque e Bar)

| Nome da Coluna | Tipo de Dado | Descrição |
|---|---|---|
| `id` | `text` / `uuid` | ID do produto. |
| `barbershop_id` | `uuid` | Barbearia proprietária. |
| `name` | `text` | Nome do produto. |
| `category` | `text` | `'Vitrine'` (pomadas, óleos) ou `'Bar'` (cervejas, refrigerantes). |
| `cost_price` | `numeric` | Preço de custo. |
| `price` | `numeric` | Preço de venda. |
| `stock` | `integer` | Quantidade em estoque. |
| `commission_percent` | `numeric` | Comissão do barbeiro pela venda. |
| `active` | `boolean` | Ativo para venda no POS. |

---

## 5. Tabela: `clients` (Cadastro de Clientes)

| Nome da Coluna | Tipo de Dado | Descrição |
|---|---|---|
| `id` | `text` / `uuid` | ID do cliente. |
| `barbershop_id` | `uuid` | Barbearia proprietária (Multi-tenant). |
| `name` | `text` | Nome completo do cliente. |
| `phone` | `text` | WhatsApp com DDD `(XX) XXXXX-XXXX`. |
| `email` | `text` | E-mail opcional. |
| `notes` | `text` | Histórico e preferências do cliente. |
| `is_vip` | `boolean` | Indicador de cliente fidelizado. |
| `created_at` | `timestamp with time zone` | Data de inclusão. |

---

## 6. Tabela: `comandas` (Frente de Caixa e Contas)

| Nome da Coluna | Tipo de Dado | Descrição |
|---|---|---|
| `id` | `text` / `uuid` | ID da comanda. |
| `barbershop_id` | `uuid` | Barbearia proprietária. |
| `client_name` | `text` | Nome do cliente. |
| `barber_id` | `text` | Barbeiro responsável. |
| `status` | `text` | `'open'`, `'paid'`, `'cancelled'`. |
| `subtotal` | `numeric` | Valor total dos serviços e itens antes de desconto. |
| `discount` | `numeric` | Desconto aplicado. |
| `total` | `numeric` | Total quitado. |
| `payment_method` | `text` | Forma de quitação (`'pix'`, `'credit'`, `'debit'`, `'cash'`). |
| `items` | `jsonb` | Array com lista de itens e comissões. |
| `created_at` | `timestamp with time zone` | Abertura da comanda. |

