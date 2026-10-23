# Refinamento de UI — Card "Agenda de Atendimentos" Expansível (Accordion)

## 1. Visão Geral do Refinamento
Este documento formaliza as decisões de arquitetura e design para a conversão do card principal de cabeçalho da **Agenda de Atendimentos** (`src/pages/BarbershopAdmin/ScheduleView.jsx`) em um componente **expansível (Accordion)**, otimizando o espaço vertical útil da dashboard operacional.

---

## 2. Diagnóstico & Oportunidade de UX
- **Problema anterior:** O card da agenda continha título, subtítulo explicativo e badges de faturamento/cortes em exibição estática permanente, ocupando área vertical excessiva antes da grade temporal de slots.
- **Solução implementada:**
  - O card agora inicia **recolhido (closed)** por padrão, reduzindo significativamente a altura inicial do bloco de cabeçalho.
  - A barra superior opera como um gatilho clicável com feedback tátil, ícone de calendário e indicador **Chevron Down**.
  - Ao expandir, o conteúdo adicional (subtítulo e tags de métricas) é revelado através de uma animação suave em CSS Grid.

---

## 3. Estados do Componente

### 3.1. Estado Inicial (Fechado / Collapsed)
- **Visibilidade**:
  - Ícone do Calendário (`ProjectIcon name="Calendar"` tamanho 20 em âmbar).
  - Título principal: **"Agenda de Atendimentos"** (`text-base sm:text-lg md:text-xl font-bold text-white`).
  - Botão de voltar (quando ativo via prop `onBack`).
  - Ícone **Chevron Down** alinhado à extrema direita indicando que o elemento é clicável/expansível.
- **Comportamento**: Subtítulo e pills de métricas ocupam `0px` de altura (`grid-rows-[0fr] opacity-0 pointer-events-none`).

### 3.2. Estado Expansível (Aberto / Expanded)
- **Gatilho**: Clique em qualquer área da barra superior ou no próprio Chevron.
- **Transição**:
  - O ícone Chevron rotaciona suavemente 180° (`rotate-180 text-amber-400`).
  - Abertura fluida através de CSS Grid (`grid-template-rows: 1fr`, `opacity-100`, borda divisória sutil `border-neutral-800/80`).
- **Conteúdo Revelado**:
  - **Subtítulo Oficial**:
    > *"Acompanhe atendimentos, altere a agenda dos profissionais, cadastre novos clientes, produtos e serviços."*
  - **Pills de Estatísticas Operacionais**:
    - Tag de Cortes: `{totalTodayAppointments} cortes hoje` (estilo âmbar com ícone Scissors).
    - Tag de Faturamento: `R$ {totalEstimatedRevenue} previsto` (estilo esmeralda com ícone DollarSign).

---

## 4. Matriz de Cores e Preservação Light Theme

| Elemento | Dark Theme | Light Theme (Preservado) |
| :--- | :--- | :--- |
| **Card Container** | `bg-neutral-900 border-neutral-800` | Mapeado para `#F4F4F5` / borda `#E4E4E7` |
| **Título** | `text-white` | Mapeado para `#18181b` |
| **Subtítulo** | `text-neutral-400` | Mapeado para `#71717a` |
| **Ícone Chevron** | `text-neutral-400` (aberto: `text-amber-400`) | Neutro oficial com hover suave |
| **Pill Cortes** | `bg-amber-500/10 border-amber-500/30 text-amber-400` | Fundo suave com texto âmbar/dourado |
| **Pill Previsto** | `bg-emerald-500/10 border-emerald-500/30 text-emerald-400` | Fundo suave com verde esmeralda `#059669` |

---

## 5. Arquivos Impactados
- `src/pages/BarbershopAdmin/ScheduleView.jsx`: Adicionado estado `isHeaderExpanded`, gatilho com atributos `aria-expanded` e animação CSS grid.
- `src/pages/BarbershopAdmin/ScheduleView.styles.js`: Calibração de padding compacto (`p-3.5 sm:p-4 md:p-5`) no `headerCard`.
- `docs/module-agenda.md`: Atualização da documentação do módulo da agenda.
- `docs/analise-ux-agenda-accordion.md`: Este documento técnico.
