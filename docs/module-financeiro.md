# Módulo: Fluxo Financeiro, Comissões e Receita (`/docs/module-financeiro.md`)

## 1. Visão Geral
O módulo financeiro é composto por duas interfaces integradas:
1. **Frente de Caixa / PDV (`CashierPosView.jsx`):**
   - Gestão integrada de comandas e atendimentos concluídos/em andamento vindos da agenda (ex: Atendimento `#apt-179138762174` concluído com valor R$ 20,00 e status Pendente).
   - **Controle Manual de Status:** Opção nos cards para o operador alterar manualmente o status entre `Pendente (Aguardando Pagamento)`, `Pago (Liquidado no Caixa)`, `Na Cadeira (Em Andamento)` e `Cancelado`, com sincronização bidirecional em tempo real com a tabela `appointments` e a tela de Agenda (`ScheduleView.jsx`).
   - **Checkout Oficial de Pagamento (`MercadoPagoCheckoutModal.tsx`):**
     - **CardInfo #01 (Título):** Título unificado e limpo `"Pagamento"`.
     - **CardInfo #02 (Resumo do Atendimento):** Nome do barbeiro exibido na cor branca (`text-white`).
     - **CardInfo #03 (Seletores de Modo):** Botões `Pix`, `Cartão Crédito / Débito` e `Link WhatsApp` com estado ativo na cor Âmbar (`bg-amber-600`) e ícones + fonte na cor branca (`text-white`).
     - **CardInfo #04 (PIX & QR Code Real):** Geração de QR Code real (padrão EMV® QRCPS-MPM BR Code do Banco Central com CRC16-CCITT) a partir da chave cadastrada pelo usuário em `"Meu Perfil" => Perfil & Chave PIX / Chave PIX Cadastrada` (`src/utils/pixQrCode.ts`), sem botões ou textos de simulação de webhook.
     - **CardInfo Cartão de Crédito / Débito (Checkout Pro):** Criação de preferência real via `POST https://api.mercadopago.com/checkout/preferences` (`init_point` oficial sem IDs simulados `pref_mp_...` que causavam erro 400 `COW00`) e botão de ação intitulado `"Pagar com Mercado Pago"`.
     - **CardInfo Link WhatsApp:**
       - **Link Editar:** Mesmo padrão minimalista e limpo adotado no modal "Detalhes do Atendimento" (`text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer`), permitindo editar a mensagem para o cliente ou restaurar o modelo padrão.
       - **Telefone do Cliente:** Carrega e formata o telefone do cliente cadastrado no atendimento (ex: Marilia Santos -> `41 99788-4424` / `wa.me/5541997884424`).
       - **Botão Oficial:** Intitulado `"Compartilhar por WhatsApp"`, abrindo diretamente a conversa no WhatsApp com o cliente para envio da cobrança com o link oficial de pagamento.
     - **CardInfo #05 (Rodapé Limpo):** Sem rodapé técnico (`Mercado Pago API v1...`) e sem botão inferior `Fechar` redundante.
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
