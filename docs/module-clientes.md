# Módulo: Clientes, Prontuário Técnico e Ações da Agenda (`/docs/module-clientes.md`)

## 1. Visão Geral
O módulo **Clientes & Prontuário (`ClientsDirectoryView.jsx`)** centraliza a fidelização, inteligência de retorno e ficha técnica dos frequentadores da barbearia:
- **Gestão Cadastral Completa:** Nome completo, WhatsApp com DDD sanitizado, e-mail para recibos e identificação de clientes prioritários (`is_vip`).
- **Prontuário Técnico de Corte & Preferências:** Ficha técnica persistente com histórico de estilos, tamanho de lâmina habitual, acabamento de barba/cabelo e observações personalizadas (ex.: *"degradê navalhado alto, não passar navalha na testa, cafezinho sem açúcar"*).
- **Métricas de LTV e Frequência:** Total gasto acumulado (LTV), ticket médio por visita, frequência média de retorno (em dias) e contagem de atendimentos concluídos.
- **Régua Preditiva de Retorno (Recall Inteligente):** Alerta proativo de clientes cuja janela habitual de corte (ex.: 15 a 21 dias) está prestes a vencer, com geração de mensagem humanizada pré-configurada para envio via WhatsApp com link direto da agenda do barbeiro favorito.
- **Integração Bidirecional com a Agenda:** Consulta direta de prontuário e cadastro rápido de clientes sem sair da grade diária de atendimentos.

---

## 2. Ações Operacionais no Card de Agendamento (`AppointmentCard.jsx`)

O menu de opções rápidas (botão de 3 pontos) do card de agendamento na grade diária possui cinco ações padronizadas com inteligência contextual:

| Ação no Menu | Condição de Exibição | Comportamento Técnico |
|---|---|---|
| **Iniciar Atendimento** | Status `waiting` ou `confirmed` | Altera status do agendamento para `in_progress` (Em Cadeira), reflete na timeline e garante abertura da comanda correspondente no Caixa. |
| **Concluir Atendimento** | Status `in_progress` | Altera status do agendamento para `completed` e encaminha a comanda para finalização/pagamento. |
| **Cadastrar como Cliente** | Cliente não localizado na lista de `clients` (por telefone) | Abre modal rápido de cadastro pré-preenchido com o nome e telefone do agendamento para salvar na tabela `clients`. |
| **Ver Prontuário do Cliente** | Cliente já existente na lista de `clients` (por telefone) | Abre gaveta/modal do Prontuário Técnico com o histórico de visitas, LTV e preferências de corte do cliente. |
| **Ver Comanda no Caixa** | Sempre visível | Redireciona para o Frente de Caixa (PDV) com foco direto na comanda associada ao atendimento para lançamento de itens extras (bebidas, pomadas) ou conferência. |
| **Pagar via Mercado Pago** | Comanda/agendamento não liquidado (`!isPaid`) | Abre o modal de checkout com Pix (QR Code dinâmico) e cartão via gateway Mercado Pago. |
| **Cancelar Horário** | Status não cancelado | Abre confirmação para cancelar o agendamento (`status: 'cancelled'`), remove dos cálculos de previsão do dia e arquiva a comanda correspondente no PDV. |

---

## 3. Estrutura de Dados e Esquema SQL (`clients`)

```sql
CREATE TABLE IF NOT EXISTS public.clients (
  id text PRIMARY KEY DEFAULT ('cli-'::text || (gen_random_uuid())::text),
  barbershop_id text,
  name text NOT NULL,
  phone text,
  email text,
  cpf text,
  birth_date date,
  notes text, -- Observações gerais e Prontuário Técnico
  technical_notes jsonb DEFAULT '{}'::jsonb, -- Especificações detalhadas de corte, alergias e preferências
  frequency_days integer DEFAULT 18, -- Intervalo habitual entre cortes (dias)
  is_vip boolean DEFAULT false,
  total_visits integer DEFAULT 0,
  total_spent numeric(10, 2) DEFAULT 0.00,
  average_ticket numeric(10, 2) DEFAULT 0.00,
  preferred_barber text DEFAULT 'Barbeiro Geral',
  status text DEFAULT 'active',
  last_visit date,
  loyalty_stamps integer DEFAULT 0,
  subscription jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);
```

### Regras de Integridade e Retenção Permanente:
1. **Identificador Resiliente:** O campo `id` utiliza prefixo amigável `cli-UUID` garantindo interoperabilidade entre backend e cliente. O campo `barbershop_id` aceita tanto UUID quanto TEXT para evitar falhas de foreign key em instâncias recém-provisionadas.
2. **Atualização Automática de LTV:** Quando uma comanda vinculada a um agendamento é liquidada no PDV (`CashierPosView`), o valor total pago é somado a `total_spent`, `total_visits` é incrementado em 1 e `last_visit` é atualizado com a data do serviço.
3. **Resiliência Multi-Camada (Anti-Perda ao Atualizar F5):**
   - **Banco de Dados:** O Supabase possui política RLS `clients_all_access_policy` para leitura e escrita por `anon` e `authenticated`.
   - **Local Storage (`safeStorage`):** Todo cliente cadastrado ou atualizado é gravado de imediato na chave `saas_clients_cache`.
   - **Ciclo de Inicialização:** Ao recarregar a página (F5), o estado do React é inicializado instantaneamente com os clientes do cache local enquanto a query assíncrona do Supabase é executada em segundo plano, mesclando dados sem perda.

---

## 4. Prontuário Técnico e Ficha do Cliente

O Prontuário é composto pelas seguintes camadas de informação:
1. **Cabeçalho Clínico/Estético:** Nome, contato, selo VIP (se aplicável), barbeiro preferido habitual.
2. **Histórico de Visitas:** Linha do tempo cronológica com data, serviço realizado, barbeiro que atendeu e valor pago.
3. **Ficha Técnica de Preferências:**
   - Estilo de corte habitual (ex.: Undercut, Fade, Americano, Pompadour).
   - Ajuste de pentes e máquina (ex.: Pente 1,5 na lateral, disfarçado com navalha).
   - Barba e finalização (ex.: Alinhamento com toalha quente, óleo para barba amadeirado).
   - Alergias ou restrições (ex.: Sensibilidade à lâmina no pescoço, não usar loção com álcool).
4. **Métricas Financeiras Consolidadas:**
   - **LTV (Lifetime Value):** Total financeiro deixado pelo cliente na barbearia.
   - **Ticket Médio:** `total_spent / total_cuts`.
   - **Frequência de Retorno:** Média de dias entre agendamentos.

---

## 5. Auditoria de Privacidade e LGPD
- **Consentimento e Prontuário:** As notas técnicas são de uso restrito da equipe de barbeiros para atendimento personalizado.
- **Anonimização:** Em conformidade com o motor LGPD do SaaS (`lgpdPurgeEngine.ts`), clientes inativos há mais de 24 meses ou com solicitação de exclusão passam por rotina de anonimização (substituição de nome por `CLIENTE_ANONIMIZADO_UUID`, hash do telefone com pepper e limpeza de e-mail e notas pessoais).
