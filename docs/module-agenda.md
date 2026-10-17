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
   - **Card "Previsão atual" (Dropdown Expansível):** O card superior atua como sumário executivo com cabeçalho interativo contendo ícone de cifrão (`DollarSign`), título *"Previsão atual"*, Chevron rotativo e linha divisória interna.
   - **3 Big Numbers Dinâmicos e Reativos:**
     1. **Clientes:** Quantidade total de clientes cadastrados no sistema (menu Clientes e Prontuários).
     2. **Serviços:** Quantidade de serviços realizados e agendados no intervalo temporal ativo (Dia, Semana ou Mês).
     3. **Preço / Faturamento:** Soma total dos preços de serviços e comandas no período ativo, sincronizado instantaneamente com os filtros da agenda.
   - Renderiza a grade da linha do tempo (`CalendarView`), gerencia status de agendamentos e modais de edição/cancelamento.
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

4. **`CalendarView.jsx` & `BarberTimelineColumn.jsx` (`src/components/calendar/`):**
   - **Header do Container e Linha Divisória (Divider):**
     - Header dedicado com ícone de calendário (`Calendar`) em container âmbar e título principal *"Agenda de Atendimentos"*.
     - Linha divisória horizontal dedicada separando o cabeçalho dos controles de navegação e filtros.
   - **Controles Inferiores Mobile First:**
     - **Linha 1 (Navegação Temporal):** Controles `Chevron Left` / `Chevron Right` com data centralizada em destaque (`Hoje, Sábado 17 de Outubro de 2026`) e atalho dinâmico para retornar a "Hoje".
     - **Linha 2 (Filtros Compactos e CTA em Linha Única):** Dropdown compacto de modo (`Dia`, `Semana`, `Mês`) com fundo em laranja âmbar de destaque (`bg-amber-600`), dropdown de profissionais com truncamento responsivo e botão primário compacto com ícone de soma e rótulo **`Novo`**.
   - **Isolamento Estrito de Slots por Data (`activeDateYMD`):** Na visão diária (`viewMode === "day"`), cada coluna de barbeiro filtra os cards da timeline estritamente pela data selecionada (`getAppointmentDateYMD(appt) === activeDateYMD`). Agendamentos de dias futuros nunca são misturados nos slots do dia atual.
   - **Tag Indicadora `{N} cortes` Clicável (`BarberTimelineColumn`):** O indicador de total de cortes no cabeçalho do barbeiro (ex: `Henrique Silva • 3 cortes`) funciona como botão interativo que abre o **Modal de Agendamentos do Profissional**.
   - **Modal / Subtela de Agendamentos do Barbeiro:** Exibe os cards de todos os atendimentos do profissional com filtros rápidos (`Todos`, `Dia Atual`, `Outros Dias`), **Nome do Cliente**, telefone, serviço, valor, status e **botão clicável de Dia e Hora** (`dd/mm/aaaa • HH:mm às HH:mm`). Ao clicar no card ou no Dia/Hora, o modal fecha, a agenda navega automaticamente para a data daquele agendamento na visão diária, faz scroll suave até o horário e aplica destaque luminoso (`ring-amber-400 animate-pulse`) no slot.

5. **`UnavailableSlotModal.jsx` (`src/components/calendar/UnavailableSlotModal.jsx`):**
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
- **DEFESA DE INTERVALOS E ALMOÇO (ANTI-DUPLICAÇÃO):** O tratamento de pausas e horários de almoço (`breaks` JSONB ou fallback `schedule[].breakStart/breakEnd`) deve obrigatoriamente:
  1. Identificar o dia da semana da data ativa sendo exibida (`currentDate`) e extrair **estritamente o intervalo do dia correspondente**, jamais iterando cegamente sobre os 7 dias da escala semanal no mesmo slot.
  2. Aplicar deduplicação estrita de pausas por intervalo de horário (`${startTime}-${endTime}`) utilizando `Set`, eliminando quaisquer blocos redundantes ou sobrepostos na coluna do barbeiro.
  3. Respeitar folgas (`active === false`), não exibindo almoço em dias inativos.
  4. Na validação de conflito de almoço por arrastar e soltar (`handleDropAppointment` no `ScheduleView.jsx`), extrair apenas o horário de almoço da data do agendamento de destino.
- **TAGS HTML E SAFEHTML:** Componentes renderizados dentro de `<p>` (como `SafeHtml`) devem sempre utilizar `as="span"` para preservar a semântica do DOM e evitar erros de hidratação (`<div> cannot be a descendant of <p>`).
- Ao alterar campos no modal, manter sincronizadas as propriedades snake_case (banco) e camelCase (React).

---

## 5. Resolução da Duplicação de Horário de Almoço no Slot (v1.5.3.4)

### Causa Raiz Identificada
No componente `BarberTimelineColumn.jsx`, quando o barbeiro não possuía `breaks` fixos cadastrados diretamente como array, o sistema recorria ao array `barber.schedule` (que contém a escala semanal completa dos 7 dias). No entanto, o código executava um `.forEach()` irrestrito sobre todos os 7 dias da semana:
```javascript
// Comportamento problemático anterior:
barber.schedule.forEach((daySchedule) => {
  if (daySchedule?.breakStart && daySchedule?.breakEnd && daySchedule?.active !== false) {
    extractedScheduleBreaks.push({
      startTime: daySchedule.breakStart,
      endTime: daySchedule.breakEnd,
      label: "Intervalo de Almoço",
    });
  }
});
```
Como de segunda a sábado o horário de almoço configurado era idêntico (ex: `12:00` às `13:00`), a lista de pausas recebia até 6 entradas redundantes. Ao renderizar a coluna diária, o componente criava múltiplos blocos `<div className={breakBlock}>` sobrepostos no mesmo slot da timeline.

### Correção Aplicada
1. **Isolamento por Dia da Semana (`currentDate`):** `CalendarView.jsx` agora transmite explicitamente `currentDate` para `BarberTimelineColumn.jsx`. O componente calcula o dia da semana ativo (`dom`, `seg`, `ter`, `qua`, `qui`, `sex`, `sab`) e localiza unicamente o expediente do dia em questão.
2. **Deduplicação Estrita por Chave Única:** Uma camada com `Set` (`${startTime}-${endTime}`) filtra qualquer intervalo duplicado antes da renderização na grade visual.
3. **Harmonização no Drag & Drop (`ScheduleView.jsx`):** O cálculo de colisão com almoço ao arrastar cartões também foi ajustado para considerar unicamente a data do agendamento sendo movimentado.

---

## 6. Resolução de Sobreposição de Z-Index: Coluna "Horários" vs Navbar (v1.5.4.1)

### Causa Raiz Identificada
Durante a rolagem vertical (*scroll*) da página no painel de administração da barbearia (`ScheduleView`), a coluna lateral fixa de horários (`timeGutter` com o cabeçalho `"Horários"` e marcações de horas `08:00`, `09:00`, etc.) passava por cima da barra de navegação superior fixa (`Navbar`).

O problema ocorria devido a:
1. **Ausência de Contexto de Empilhamento Isolado (`isolate`)**: O contêiner pai da agenda (`calendarViewStyles.container`) não definia contexto de empilhamento local, permitindo que os `z-index` internos dos elementos da régua (`sticky z-30` no `timeGutter`) disputassem empilhamento diretamente no contexto raiz do documento.
2. **Concorrência de Z-Index no Contexto Global**: A `Navbar` possuía `sticky top-0 z-30` e o `timeGutter` possuía `sticky left-0 z-30`. Como a agenda aparece posteriormente no DOM em relação ao cabeçalho, a regra natural de ordenação do HTML atribuía prioridade de pintura (*painting order*) à coluna da agenda sobre a `Navbar`.

### Correção Aplicada
1. **Isolamento de Stacking Context (`isolate z-10`)**:
   - No contêiner principal da agenda (`CalendarView.styles.js -> container`), foi adicionada a classe `relative isolate z-10`.
   - Com `isolation: isolate`, **todos os elementos internos** da agenda (`timeGutter`, `header`, cards com hover, etc.) têm seus z-indices estritamente confinados à agenda, tratando o componente inteiro como uma única camada com nível `z-10` na árvore global.
2. **Elevação e Proteção da Navbar (`z-40` e `z-50`)**:
   - A `Navbar` foi elevada para `sticky top-0 z-40`, garantindo precedência absoluta sobre o bloco da agenda (`z-10`) durante o scroll vertical da página.
   - O menu suspenso (*dropdownMenu*) da Navbar foi elevado para `z-50`.
3. **Hierarquia Interna da Régua Horária**:
   - `timeGutter` ajustado para `sticky left-0 z-20`, fixando-se lateralmente na rolagem horizontal.
   - `timeGutterHeader` ("Horários") definido com `sticky top-0 z-30`, garantindo que fique acima tanto dos slots verticais quanto dos cabeçalhos dos barbeiros durante o scroll interno bidirecional da grade.

