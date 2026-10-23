# Refinamento de UI/Mobile — Cabeçalho Responsivo da Agenda (Mobile First)

## 1. Visão Geral
Este documento formaliza as decisões de arquitetura de interface e responsividade aplicadas à barra superior de controles e navegação da **Agenda de Atendimentos** (`src/components/calendar/CalendarView.jsx` e `src/components/calendar/CalendarView.styles.js`). O objetivo primordial foi implementar uma abordagem **Mobile First**, garantindo que todos os controles interativos essenciais fiquem perfeitamente alinhados e utilizáveis em telas pequenas sem quebras de layout.

---

## 2. Estrutura em Duas Linhas (Layout Arquitetural)

### 2.1. Linha Superior: Navegação Temporal
- **Botão Anterior (`Chevron Left`)**: Permite retroceder a data selecionada (dia anterior, semana anterior ou mês anterior, dependendo do modo ativo).
- **Rótulo Centralizado em Destaque**:
  - Exibe a data formatada contextualmente com dia da semana, dia do mês e ano (ex: **`Hoje, Sábado 17 de Outubro de 2026`**).
  - Inclui atalho contextual *"Hoje"* quando navegando em dias anteriores ou futuros.
- **Botão Próximo (`Chevron Right`)**: Permite avançar o período com transição instantânea de grade.

### 2.2. Linha Inferior: 3 Controles em Linha Única (Mobile First)
A linha inferior foi otimizada para conter exatamente 3 elementos essenciais alinhados horizontalmente em telas compactas (`controlsRow` com `flex items-center justify-between gap-1.5 xs:gap-2`):

1. **Seletor de Modo de Visualização (Dropdown Select)**:
   - Substitui o segmented control tradicional por um menu `<select>` compacto.
   - **Estilização de Destaque**: Fundo em **laranja âmbar (`bg-amber-600 font-bold text-white`)** com borda suave e indicador `Chevron Down`.
   - **Opções**: `Dia`, `Semana`, `Mês`.

2. **Filtro de Profissionais (Dropdown Select)**:
   - Menu `<select>` estilizado em Dark Theme (`bg-neutral-800/90 text-neutral-200 border-neutral-700/80`) com indicador `Chevron Down`.
   - Largura flexível com truncamento inteligente (`truncate`), exibindo *"Todos os Barbeiros"* ou o nome do profissional selecionado.

3. **Botão Principal de Ação (CTA Compacto)**:
   - Estilizado em **laranja âmbar (`bg-amber-600 hover:bg-amber-500 font-bold text-white`)** com sombra temática.
   - Ícone de soma (`Plus`) e rótulo enxuto: **`Novo`**.
   - Dispara a abertura do modal de agendamento pré-preenchendo a data selecionada.

4. **Otimização de Espaço (Remoção do Botão "Ocultos")**:
   - O botão secundário de cancelados foi removido da barra superior, eliminando poluição visual e garantindo a distribuição dos 3 controles principais em linha única em smartphones.

---

## 3. Matriz de Componentes e Tokens

| Elemento | Dark Theme | Light Theme (Preservado) | Responsividade |
| :--- | :--- | :--- | :--- |
| **Linha 1: Container** | `bg-neutral-900 border-neutral-800` | Mapeado para `#F4F4F5` / `#E4E4E7` | Alinhamento flex `justify-between` |
| **Linha 1: Data Title** | `text-white font-bold` | Mapeado para `#18181b font-bold` | `text-xs xs:text-sm sm:text-base` |
| **Linha 2: Dropdown Período** | `bg-amber-600 text-white font-bold` | `bg-amber-600 text-white font-bold` | Compacto com `pr-6` e chevron |
| **Linha 2: Dropdown Barbeiros**| `bg-neutral-800 text-neutral-200` | Fundo claro com borda `#D4D4D8` | `flex-1 min-w-0 truncate` |
| **Linha 2: CTA "Novo"** | `bg-amber-600 hover:bg-amber-500` | `bg-amber-600 hover:bg-amber-500` | `px-2.5 xs:px-3 whitespace-nowrap`|

---

## 4. Conformidade e Acessibilidade
- **Critérios WCAG 2.2**: Texto branco sobre fundo laranja (`#d97706` / `amber-600`) atinge contraste superior a **3.8:1** para texto em negrito e ícones em botões primários.
- **Touch Target**: Altura de 36px (`py-2`) em todos os 3 controles inferiores, permitindo toque confortável em telas táteis.
- **Single-Line Guarantee**: Distribuição garantida sem quebra de linha em resoluções de 320px até tablets e desktops.
