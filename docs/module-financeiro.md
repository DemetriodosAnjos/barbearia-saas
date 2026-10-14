# Módulo: Fluxo Financeiro, Comissões e Receita (`/docs/module-financeiro.md`)

## 1. Visão Geral
O módulo financeiro é composto por duas interfaces integradas acessíveis pela navegação lateral:

1. **Frente de Caixa / PDV (`CashierPosView.jsx`):**
   - Gestão integrada de comandas e atendimentos concluídos/em andamento vindos da agenda (ex: Atendimento `#apt-179138762174` concluído com valor R$ 20,00 e status Pendente).
   - **Controle Manual de Status:** Opção nos cards para o operador alterar manualmente o status entre `Pendente (Aguardando Pagamento)`, `Pago (Liquidado no Caixa)`, `Na Cadeira (Em Andamento)` e `Cancelado`, com sincronização bidirecional em tempo real com a tabela `appointments` e a tela de Agenda (`ScheduleView.jsx`).
   - **Checkout Oficial de Pagamento (`MercadoPagoCheckoutModal.tsx`):**
     - **CardInfo #01 (Título):** Título unificado e limpo `"Pagamento"`.
     - **CardInfo #02 (Resumo do Atendimento):** Nome do barbeiro exibido na cor branca (`text-white`).
     - **CardInfo #03 (Seletores de Modo):** Botões `Pix`, `Cartão Crédito / Débito` e `Link WhatsApp` com estado ativo na cor Âmbar (`bg-amber-600`) e ícones + fonte na cor branca (`text-white`).
     - **CardInfo #04 (PIX & QR Code Real):** Geração de QR Code real (padrão EMV® QRCPS-MPM BR Code do Banco Central com CRC16-CCITT) a partir da chave cadastrada pelo usuário em `"Meu Perfil" => Perfil & Chave PIX / Chave PIX Cadastrada` (`src/utils/pixQrCode.ts`), sem botões ou textos de simulação de webhook.
     - **CardInfo Cartão de Crédito / Débito (Checkout Pro):** Criação de preferência real via `POST https://api.mercadopago.com/checkout/preferences` e botão de ação intitulado `"Pagar com Mercado Pago"`.
     - **CardInfo Link WhatsApp:**
       - **Link Editar:** Padrão minimalista e limpo (`text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer`), permitindo editar a mensagem para o cliente ou restaurar o modelo padrão.
       - **Telefone do Cliente:** Carrega e formata o telefone do cliente cadastrado no atendimento (ex: Marilia Santos -> `41 99788-4424` / `wa.me/5541997884424`).
       - **Botão Oficial:** Intitulado `"Compartilhar por WhatsApp"`, abrindo diretamente a conversa no WhatsApp com o cliente para envio da cobrança com o link oficial de pagamento.
     - **CardInfo #05 (Rodapé Limpo):** Sem rodapé técnico e sem botão inferior `Fechar` redundante.
   - Adição de serviços realizados e consumo do bar/produtos.
   - Fechamento tradicional de conta no balcão com rateio de comissões por profissional.

2. **Dashboard Financeiro & Submenu Pagamentos (`FinancialDashboardView.jsx`):**
   - **Navegação em Abas:**
     - **Aba `Visão Geral & DRE`:** Faturamento bruto no período (diário, semanal, mensal), Big Numbers, evolução da receita, lucro líquido da casa após dedução das comissões, ticket médio e ocupação de cadeiras com exportação de DRE contábil.
     - **Aba `Pagamentos & Comissões`:** Submenu dedicado à gestão de repasses e liquidações da equipe de barbeiros.
   - **Controle Estrito de Acesso (RBAC):**
     - **Dono / Administrador (`role: 'admin' | 'owner'`):** Visualiza os cards de repasse de todos os profissionais cadastrados e ativos no salão.
     - **Colaborador / Barbeiro Comum (`role: 'barber' | 'employee'`):** Visualiza unicamente o seu próprio card e extrato individual.
   - **Estrutura dos Cards de Pagamento por Barbeiro:**
     - **Identificação do Profissional:** Avatar com foto/iniciais, nome completo e cargo sanitizados com `SafeHtml`.
     - **Badge de Status:** `Pendente` (quando houver saldo a pagar > 0) ou `Quitado` (saldo zerado).
     - **Chave Pix & Tipo:** Badge identificador (`CPF`, `Celular`, `E-mail` ou `Chave Aleatória EVP`) e visualização da chave cadastrada.
     - **Ação Rápida "Copiar Chave":** Botão com cópia para a área de transferência (`navigator.clipboard`) com feedback visual `Copiado!`.
     - **Ação Rápida "QR Code Pix":** Modal com QR Code oficial de transferência bancária gerado dinamicamente com o valor exato da comissão calculada (padrão EMV® Banco Central) e botão `Copiar Código Pix Copia e Cola`.
     - **Métricas Claras:**
       - `Comissão Serviços (R$)` com contagem de atendimentos realizados.
       - `Comissão Produtos (R$)` com contagem de itens do bar/loja faturados.
       - `Total a Pagar (R$)` em tipografia de destaque.
     - **Ação Exclusiva do Dono - "Marcar como Pago":**
       - Modal de confirmação com detalhamento do valor, chave utilizada e campo opcional para notas/comprovante interno.
       - Criação do lote na tabela `barber_settlements` no Supabase e vinculação de `settlement_id` nos agendamentos e comandas do período.
       - Zeramento automático e em tempo real do saldo pendente do profissional para o próximo ciclo de fechamento.
     - **Ação "Extrato & Relatório":**
       - Modal com tabela item a item: data, tipo (serviço/produto), descrição, cliente, valor bruto, taxa contratual (%) e valor líquido de comissão.
       - Botão **"Imprimir / PDF"**: Layout limpo otimizado para impressão física ou geração de PDF.
       - Botão **"Enviar no WhatsApp"**: Disparo de mensagem formatada com o extrato pronto diretamente para o WhatsApp cadastrado do profissional.
   - **Histórico de Quitações / Fechamentos:**
     - Tabela arquivada abaixo dos cards contendo todos os lotes liquidados (data/hora, barbeiro, período, chave pix, serviços, produtos, total pago e status `Liquidado`).

---

## 2. Estrutura de Tabelas SQL no Supabase

### 2.1 Tabela `public.barber_settlements` (Histórico de Fechamentos)
```sql
CREATE TABLE IF NOT EXISTS public.barber_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL,
  barber_id TEXT NOT NULL,
  barber_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  services_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  products_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  services_count INTEGER NOT NULL DEFAULT 0,
  products_count INTEGER NOT NULL DEFAULT 0,
  pix_key_used TEXT,
  paid_by UUID,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 Coluna `settlement_id` em `appointments` e `comandas`
- Tanto `public.appointments` quanto `public.comandas` possuem a coluna `settlement_id UUID NULL`.
- O saldo em aberto apurado na tela de pagamentos considera apenas registros onde `settlement_id IS NULL`. Ao liquidar o lote, o `settlement_id` é gravado, preservando todo o histórico da agenda e do caixa sem duplicar comissões.

### 2.3 Tabela `public.comandas`
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
| `settlement_id` | `uuid` | Sim | ID do lote de quitação de comissão gerado pelo Dono. |
| `closed_at` | `timestamptz` | Sim | Timestamp de quando a comanda foi liquidada. |
| `created_at` | `timestamptz` | Não | Data de abertura da comanda. |

---

## 3. Regra de Negócio de Cálculo de Comissões
1. **Comissão de Serviços:**
   - Multiplica o valor do serviço concluído pelo percentual contratual `service_commission` (ou `commission_percentage`) do barbeiro responsável.
2. **Comissão de Produtos:**
   - Multiplica o valor do produto vendido pelo percentual contratual `product_commission` do barbeiro responsável.
3. **Repasse Transparente & Quitação:**
   - A comissão líquida a pagar ao barbeiro é a soma de suas comissões de serviço + comissões de produto no período selecionado, pronta para cópia da chave PIX do profissional cadastrada na tabela `barbers` ou leitura de QR Code BCB.
   - A liquidação é feita exclusivamente pelo Administrador/Dono através do botão "Marcar como Pago", gerando auditoria imutável na tabela `barber_settlements`.
