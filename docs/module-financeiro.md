# Módulo: Fluxo Financeiro, Comissões e Receita (`/docs/module-financeiro.md`)

## 1. Visão Geral
O módulo financeiro é composto por duas interfaces integradas:
1. **Frente de Caixa / PDV (`CashierPosView.jsx`):**
   - Gestão integrada de comandas e atendimentos concluídos/em andamento vindos da agenda (ex: Atendimento `#apt-179138762174` concluído com valor R$ 20,00 e status Pendente).
   - **Controle Manual de Status:** Opção nos cards para o operador alterar manualmente o status entre `Pendente (Aguardando Pagamento)`, `Pago (Liquidado no Caixa)`, `Na Cadeira (Em Andamento)` e `Cancelado`, com sincronização bidirecional em tempo real com a tabela `appointments` e a tela de Agenda (`ScheduleView.jsx`).
   - **Checkout Oficial Mercado Pago API (v1):** Botão direto no card da comanda para quitação via Pix Instantâneo (QR Code dinâmico + Copia-e-Cola) ou Cartão de Crédito/Débito (Checkout Pro), com compensação e baixa automática.
   - Adição de serviços realizados e consumo do bar/produtos.
   - Fechamento tradicional de conta no balcão com rateio de comissões por profissional.
2. **Dashboard Financeiro & Métricas (`FinancialDashboardView.jsx`):**
   - Faturamento bruto no período (diário, semanal, mensal).
   - Rateio de comissões calculadas por profissional (serviços e produtos).
   - Lucro líquido da barbearia após dedução dos repasses aos barbeiros.
   - Ticket médio e volume total de atendimentos pagos.
   - Relatório de fechamento de comissões para liquidação via chave PIX.

---

## 2. Estrutura de Tabelas SQL no Supabase

### Tabela `comandas` / `orders`
| Coluna | Tipo SQL | Nullable | Descrição / Regra |
|---|---|---|---|
| `id` | `text` / `uuid` | Não | Identificador da comanda. |
| `barbershop_id` | `uuid` | Não | ID da barbearia dona da comanda. |
| `client_name` | `text` | Não | Nome do cliente associado. |
| `barber_id` | `text` | Sim | Profissional principal do atendimento. |
| `status` | `text` | Não | Situação: `'open'`, `'paid'`, `'cancelled'`. |
| `subtotal` | `numeric` | Não | Soma dos serviços e produtos antes de descontos. |
| `discount` | `numeric` | Sim | Desconto concedido na comanda. |
| `total` | `numeric` | Não | Valor total final pago. |
| `payment_method`| `text` | Sim | Meio de pagamento (`'pix'`, `'credit'`, `'debit'`, `'cash'`). |
| `items` | `jsonb` | Não | Array dos itens da comanda (serviços e produtos com preço e comissão). |
| `closed_at` | `timestamptz` | Sim | Timestamp de quando a comanda foi liquidada. |
| `created_at` | `timestamptz` | Não | Data de abertura da comanda. |

---

## 3. Regra de Negócio de Cálculo de Comissões
1. **Comissão de Serviços:**
   - Multiplica o valor do serviço concluído pelo percentual `service_commission` do barbeiro responsável.
2. **Comissão de Produtos:**
   - Multiplica o valor do produto vendido pelo percentual `product_commission` do barbeiro ou `commission_percent` do item.
3. **Repasse Transparente:**
   - A comissão total a pagar ao barbeiro é a soma de suas comissões de serviço + comissões de produto no período selecionado, pronta para cópia da chave PIX do profissional cadastrada na tabela `barbers`.
