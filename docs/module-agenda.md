# Módulo: Agenda de Atendimentos (`/docs/module-agenda.md`)

## 1. Visão Geral do Módulo
A **Agenda de Atendimentos** é o núcleo (Core Engine) da barbearia. É nela que convergem:
- O cliente agendado e seu contato telefônico.
- O profissional (barbeiro) responsável pelo atendimento.
- Os serviços selecionados e o tempo de cadeira calculado.
- O valor a ser cobrado e posteriormente lançado no caixa.
- O bloqueio e disponibilidade de horários na grade diária.

---

## 2. Componentes Principais
1. **`ScheduleView.jsx` (`src/pages/BarbershopAdmin/ScheduleView.jsx`):**
   - Painel principal da agenda no Dashboard da Barbearia.
   - Renderiza timeline por barbeiro (`BarberTimelineColumn`), cartões de atendimento (`AppointmentCard`), filtros de data e status.
   - Gerencia alterações de status em tempo real:
     - `confirmed` (Confirmado)
     - `in_service` (Em atendimento na cadeira)
     - `completed` (Concluído)
     - `cancelled` (Cancelado / Horário liberado)
   - Dispara a abertura do modal `NewAppointmentModal` com barbeiro e horário pré-selecionados.

2. **`NewAppointmentModal.jsx` (`src/components/calendar/NewAppointmentModal.jsx`):**
   - Modal de criação de novo agendamento.
   - **Regra de Horário em Tempo Real:** Se a data selecionada for hoje, a grade de horários de início calcula os minutos decorridos do relógio e **omite horários iguais ou menores que o horário atual**.
   - **Cálculo de Término Automático:** Calcula `end_time` somando `duration_minutes` a `start_time`.
   - **Cadastro On-The-Fly:** Sub-modal para registrar novo serviço diretamente no catálogo durante o agendamento.
   - **Persistência Supabase:** Realiza o `insert` na tabela `appointments` mapeando todas as 17 colunas oficiais.
   - **Spinner de Ação (2.4s):** Exibe overlay com `"Salvando Agendamento..."` e transiciona para `"Agendamento Salvo com sucesso!"` antes de concluir.

3. **`AppointmentCard.jsx` (`src/components/calendar/AppointmentCard.jsx`):**
   - Exibição visual de cada atendimento na coluna do respectivo barbeiro com layout adaptativo (`compact` para horários simultâneos ou com colisões).
   - **Correção de Z-Index e Menu de 3 Pontos (Dots):** Menu contextual flutuante com elevação prioritária `!z-[100]` no contêiner pai `cardWrapper`, posicionamento dinâmico vertical (abre para baixo quando próximo ao topo da timeline para evitar truncamento e para cima nas demais faixas).
   - **Prevenção de Apinhamento (Anti-Colisão):** Colunas com largura mínima expandida (`min-w-[290px]`), distribuição proporcional lado a lado com respiro de 6px entre cards adjacentes e foco visual ao passar o cursor (`hover:z-40 hover:scale-[1.02] hover:shadow-2xl`).
   - **Integração Mercado Pago:** Opção direta no menu e no modal de detalhes para liquidar o atendimento via API do Mercado Pago (Pix ou Cartão).

4. **`UnavailableSlotModal.jsx` (`src/components/calendar/UnavailableSlotModal.jsx`):**
   - Modal com overlay exibido ao clicar em slots da agenda que pertençam a dias ou horários anteriores ao atual.
   - **Ícone:** Alert (`AlertTriangle`).
   - **Título:** `"OPS! Horário indisponível para agendamento"`.
   - **Subtítulo:** `"Não é possível agendar em dias e horários anteriores ao dia e horário atual."`.
   - **Ações:** Botão `"Ver horários disponíveis"` (redireciona para hoje e abre a seleção de horários futuros) e Botão `"Fechar"`.

---

## 3. Fluxo de Dados e Ciclo de Vida
```
[Usuário clica em Slot da Agenda]
         ↓
[Verifica se o dia ou horário é anterior ao atual]
   ├── [SIM (Passado)] → [Abre UnavailableSlotModal: "OPS! Horário indisponível para agendamento"]
   │                         ├── [Clicar "Fechar"] → Fecha modal
   │                         └── [Clicar "Ver horários disponíveis"] → Redireciona para Hoje e abre Novo Agendamento
   │
   └── [NÃO (Futuro)]  → [Abre NewAppointmentModal pré-preenchido com Barbeiro e Horário]
                               ↓
                         [timeOptions filtra horários > horário atual do relógio]
                               ↓
                         [Usuário seleciona Barbeiro, Serviço e Horário Futuro]
                               ↓
                         [Usuário clica em Confirmar e Agendar]
                               ↓
                         [Abre Modal Spinner: "Salvando Agendamento..."]
                               ↓
                         [supabase.from("appointments").insert(payload)]
                               ↓
                         [Transição visual (1.4s): "Agendamento Salvo com sucesso!"]
                               ↓
                         [onSaveAppointment atualiza estado local da Agenda]
                               ↓
                         [Modal fecha e card aparece imediatamente na coluna do Barbeiro]
```

---

## 4. Diretrizes de Manutenção
- **NUNCA** remover a filtragem de horários passados em tempo real na data de hoje.
- **BLOQUEIO DE SLOTS PASSADOS:** Qualquer tentativa de agendamento em datas ou horários retroativos deve obrigatoriamente exibir o `UnavailableSlotModal` com overlay, título `"OPS! Horário indisponível para agendamento"` e opções de `"Ver horários disponíveis"` e `"Fechar"`.
- **NUNCA** remover a gravação assíncrona na tabela `appointments` do Supabase.
- **NUNCA** reintroduzir `localStorage` sem o adapter `safeStorage`.
- **DEFESA DE INTERVALOS (BREAKS):** O tratamento de pausas e almoço (`breaks` JSONB) deve sempre validar `Array.isArray(breaks)` defensivamente antes de iterar com `.map()` ou `.some()`, recorrendo a `schedule[].breakStart/breakEnd` caso `breaks` não seja um array direto.
- **TAGS HTML E SAFEHTML:** Componentes renderizados dentro de `<p>` (como `SafeHtml`) devem sempre utilizar `as="span"` para preservar a semântica do DOM e evitar erros de hidratação (`<div> cannot be a descendant of <p>`).
- Ao alterar campos no modal, manter sincronizadas as propriedades snake_case (banco) e camelCase (React).
