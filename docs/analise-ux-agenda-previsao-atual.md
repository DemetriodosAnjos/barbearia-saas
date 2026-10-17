# Análise de UX & Regras de Negócio — Card "Previsão atual" e Container "Agenda de Atendimentos"

## 1. Visão Geral
Este documento formaliza as decisões de design, experiência do usuário (UX) e regras de cálculo para a reestruturação da área superior do Dashboard da Barbearia (`src/pages/BarbershopAdmin/ScheduleView.jsx` e `src/components/calendar/CalendarView.jsx`).

---

## 2. Card "Previsão atual" (Dropdown Expansível com Big Numbers)
Substitui o antigo card estático de agenda por um sumário executivo com foco em produtividade e controle financeiro.

### 2.1. Cabeçalho Interativo
- **Ícone:** `DollarSign` no container âmbar (`bg-amber-500/10 text-amber-500`).
- **Título:** *"Previsão atual"*.
- **Indicador de Expansão (Chevron):** Rotação dinâmica de 180° (`rotate-180 text-amber-400`).
- **Ação:** O clique em qualquer ponto da barra superior expande ou recolhe o bloco de métricas com transição suave CSS Grid (`grid-template-rows: 1fr` / `0fr`).

### 2.2. Linha Divisória Interna
- Separador visual suave (`border-t border-neutral-800/80`) separando o cabeçalho dos três cartões de Big Numbers.

### 2.3. Os Três Big Numbers
1. **Clientes**:
   - **Origem:** Puxa a quantidade total de clientes cadastrados no sistema (menu Clientes e Prontuários).
   - **Ícone:** `Users` em container celeste/sky (`bg-sky-500/10 text-sky-400 border-sky-500/20`).
   - **Subtexto:** *"Cadastrados no sistema"*.
2. **Serviços**:
   - **Origem:** Quantidade de serviços realizados e agendados no intervalo temporal ativo.
   - **Ícone:** `Scissors` em container âmbar (`bg-amber-500/10 text-amber-400 border-amber-500/20`).
   - **Subtexto Dinâmico:** *"Realizados hoje"* (modo Dia), *"Realizados na semana"* (modo Semana) ou *"Realizados no mês"* (modo Mês).
3. **Preço / Faturamento**:
   - **Origem:** Soma dos valores de serviços dos agendamentos e comandas ativas no período, prevenindo duplicidade.
   - **Ícone:** `TrendingUp` em container esmeralda (`bg-emerald-500/10 text-emerald-400 border-emerald-500/20`).
   - **Subtexto Dinâmico:** *"Faturamento previsto (dia / semana / mês)"*.

---

## 3. Card "Agenda de Atendimentos" (Container de Slots)

### 3.1. Header do Container
- **Ícone:** `Calendar` em destaque âmbar.
- **Título:** *"Agenda de Atendimentos"*.

### 3.2. Linha Divisória (Divider)
- Linha divisória horizontal dedicada (`border-t border-neutral-800 w-full`) logo abaixo do header, separando o título dos controles de navegação e filtros.

### 3.3. Controles Inferiores
- **Navegação de Data:** Botões Anterior e Próximo com data formatada e atalho "Hoje".
- **Filtro de Período:** Dropdown com opções `Dia`, `Semana` e `Mês`.
- **Filtro de Profissionais:** Dropdown de barbeiros ativos.
- **Botão de Ação (CTA):** Botão compacto `+ Novo`.

---

## 4. Reatividade Bidirecional
- Ao alternar o dropdown de período (`viewMode`) ou navegar nas datas (`currentDate`), a prop controlada dispara a sincronização imediata com `ScheduleView`.
- Os cálculos com `useMemo` atualizam instantaneamente os Big Numbers de Serviços e Preço/Faturamento sem atrasos de renderização ou inconsistências de estado.
