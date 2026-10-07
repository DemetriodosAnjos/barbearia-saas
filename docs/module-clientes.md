# Módulo: Cadastro e Histórico de Clientes (`/docs/module-clientes.md`)

## 1. Visão Geral
O módulo **Diretório de Clientes (`ClientsDirectoryView.jsx`)** centraliza a gestão dos frequentadores da barbearia:
- Lista completa de clientes com dados de contato (Nome, Telefone/WhatsApp com DDD, E-mail).
- Histórico de atendimentos anteriores, serviços mais realizados e profissional preferido.
- Métricas por cliente: total gasto (LTV), frequência média e data do último atendimento.
- Ações rápidas de contato via link direto do WhatsApp (com mensagem pré-configurada).
- Atalho direto para agendar novo horário a partir do cartão do cliente.

---

## 2. Estrutura SQL da Tabela `clients`
| Coluna | Tipo SQL | Nullable | Descrição / Regra |
|---|---|---|---|
| `id` | `text` / `uuid` | Não | Identificador único do cliente. |
| `barbershop_id` | `uuid` | Não | Chave estrangeira da barbearia (Multi-tenant). |
| `name` | `text` | Não | Nome completo do cliente. |
| `phone` | `text` | Não | WhatsApp com DDD no formato padronizado `(XX) XXXXX-XXXX`. |
| `email` | `text` | Sim | E-mail opcional para envio de recibos e avisos. |
| `notes` | `text` | Sim | Prontuário de preferências (ex: "corte na navalha, café sem açúcar"). |
| `is_vip` | `boolean` | Não | Indicador de cliente fidelizado / prioritário. |
| `created_at` | `timestamptz` | Não | Data do primeiro cadastro. |
| `total_spent` | `numeric` | Sim | Valor acumulado já pago pelo cliente. |
| `total_cuts` | `integer` | Sim | Contagem de atendimentos concluídos. |
| `last_visit` | `date` | Sim | Data do último agendamento concluído. |

---

## 3. Diretrizes de Integração com o Supabase
1. **Consulta:** Buscar clientes com `supabase.from("clients").select("*").eq("barbershop_id", tenantId).order("name")`.
2. **Atualização Automática via Agendamentos:**
   - Quando um novo cliente conclui um agendamento no Core (`NewAppointmentModal`), se o telefone ainda não existir em `clients`, o sistema deve registrar ou atualizar o cadastro automaticamente.
3. **Resiliência:** Manter ordenação alfabética e busca dinâmica por nome ou telefone sem recarregar a tela.
