# Especificação de Regras Financeiras e Integração: Agenda ⇄ Frente de Caixa (PDV)

Este documento define oficialmente a arquitetura de regras de negócio financeiras da plataforma e a modelagem de integração entre a **Agenda Operacional (slots de horários)** e o **Frente de Caixa (PDV / Comandas)**.

---

## 1. Diagnóstico do Problema Identificado

### O que estava acontecendo:
1. Dois agendamentos foram criados e posicionados nos slots da **Agenda**.
2. Ao navegar até o submenu **Frente de Caixa (PDV)**, o bloco de indicadores financeiros e o quadro de comandas não refletiam o valor desses agendamentos.
3. **Causa raiz técnica**:
   - O componente `CashierPosView.jsx` gerenciava seu próprio estado local de comandas (`localComandas`), sem sincronizar dinamicamente todos os agendamentos registrados em `appointments` para a data selecionada.
   - Além disso, os indicadores de faturamento do topo do caixa estavam limitados apenas às comandas criadas manualmente pelo balcão ou com sincronização pontual que falhava quando os agendamentos vinham com estruturas parciais de `servicePrice` / `services`.

---

## 2. Regras de Negócio Oficiais Aprovadas

Com base nas decisões alinhadas para a operação do SaaS:

### 2.1 Conversão Automática de Agendamentos em Comandas
- **Regra**: Todo agendamento confirmado, aguardando ou em atendimento presente na Agenda na data selecionada é **automaticamente projetado como uma comanda no Frente de Caixa**.
- **Identificação Visual**: A comanda oriunda da agenda possui o identificador `[Agenda]` com o horário marcado (ex: `14:30 - Carlos Silva`) e o barbeiro responsável.
- **Flexibilidade**: O operador do caixa pode adicionar itens de balcão (pomadas, cervejas, barba terapia, adicionais) diretamente nessa comanda sem alterar a integridade do agendamento original.

### 2.2 Os 3 Indicadores de Previsão Financeira no Topo do Caixa
O topo do submenu Frente de Caixa apresentará de forma destacada:

1. **Previsão Total do Dia** (R$ Previsto):
   - Soma de todos os agendamentos ativos do dia (não cancelados) + produtos e serviços avulsos de comandas abertas ou liquidadas.
   - Representa o potencial financeiro máximo esperado para a operação do dia.

2. **Recebido Hoje** (R$ Realizado):
   - Soma de todos os atendimentos e vendas cujo pagamento já foi formalmente liquidado (`isPaid: true` / status `paid`).
   - Discrimina pagamentos via Dinheiro, Cartão ou Mercado Pago/PIX.

3. **Saldo Pendente** (R$ A Receber):
   - $\text{Saldo Pendente} = \max(0, \text{Previsão Total do Dia} - \text{Recebido Hoje})$.
   - Indica com precisão quanto dinheiro ainda resta para entrar no caixa até o fim do expediente.

### 2.3 Momento da Consolidação de Receita e Comissão de Barbeiros
- **Regra**: A receita e as comissões dos barbeiros **NÃO são consolidadas no momento do agendamento**.
- Enquanto o agendamento estiver apenas agendado ou em andamento, o valor é estritamente **previsão operacional**.
- **Efetivação**: Apenas no momento em que a comanda for liquidada no Caixa (ou via QR Code Mercado Pago / PIX), o status passa para `paid` / `completed`, gravando o faturamento definitivo e gerando o crédito de comissão para o profissional.

### 2.4 Sincronização Bidirecional Contínua
- Ao liquidar a comanda no **Frente de Caixa**, o agendamento na **Agenda** é atualizado para `completed` e `isPaid: true`.
- Se um agendamento for cancelado na **Agenda**, sua comanda e sua previsão são automaticamente removidas do cálculo no **Frente de Caixa**.
- Se um agendamento for quitado previamente via link/app do cliente, a comanda respectiva no caixa já aparece com status de `Quitada / Pago`, entrando direto em **Recebido Hoje**.

---

## 3. Estrutura de Dados e Integração Técnica

### 3.1 Mapeamento `appointments` ⇄ `comandas`
```typescript
interface ComandaIntegrada {
  id: string; // appointment.id ou crypto.randomUUID()
  source: 'agenda' | 'balcao';
  appointmentId?: string;
  clientName: string;
  clientPhone?: string;
  barberId: string;
  barberName: string;
  timeSlot?: string;
  items: Array<{
    id: string;
    type: 'service' | 'product';
    name: string;
    price: number;
    quantity: number;
  }>;
  total: number;
  status: 'open' | 'in_progress' | 'paid' | 'cancelled';
  paymentMethod?: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'mercadopago';
  isPaid: boolean;
  createdAt: string;
  paidAt?: string;
}
```

### 3.2 Fórmulas de Cálculo dos Indicadores do Caixa
```javascript
// Previsão Total = Total de serviços/produtos agendados ou abertos + Total já pago
const previsaoTotal = todasAsComandasDoDia
  .filter(c => c.status !== 'cancelled')
  .reduce((acc, c) => acc + c.total, 0);

// Recebido Hoje = Total de comandas com status 'paid' ou isPaid = true
const recebidoHoje = todasAsComandasDoDia
  .filter(c => c.status === 'paid' || c.isPaid === true)
  .reduce((acc, c) => acc + c.total, 0);

// Saldo Pendente = Previsão que ainda não foi liquidada
const saldoPendente = Math.max(0, previsaoTotal - recebidoHoje);
```

---

## 4. Próximos Passos de Implementação no Código

1. **Atualização do `CashierPosView.jsx`**:
   - Fazer o merge automático dos `appointments` do dia com as comandas ativas de balcão.
   - Atualizar a barra superior de métricas para exibir com destaque **Previsão Total do Dia**, **Recebido Hoje** e **Saldo Pendente**.
   - Implementar a liquidação integrada atualizando tanto o estado de comandas quanto o agendamento original.
2. **Propagação no `BarbershopDashboard.jsx` & `App.jsx`**:
   - Garantir sincronização do callback `onUpdateAppointment` ao liquidar pelo caixa.
