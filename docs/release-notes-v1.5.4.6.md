# Release Notes - Barbearia SaaS v1.5.4.6

**Data de Lançamento**: Outubro de 2026  
**Status**: Homologado & Ativo  
**Módulos**: Componente Navbar (`src/components/ui/Navbar.jsx`, `src/components/ui/Navbar.styles.js`), Estilos Globais (`src/index.css`), Metadados do Applet (`metadata.json`, `index.html`), Documentação Técnica (`docs/analise-ux-navbar-mobile-first-dark.md`)

---

## 🎯 Principais Atualizações da Versão 1.5.4.6

### 1. Elemento "Unidade da Barbearia" Restaurado e Posicionado na Navbar
* **Posicionamento Estratégico (Mobile First)**:
  * O elemento foi restaurado e posicionado no lado direito da barra (`rightSection`), imediatamente ao lado do Alerta (Sino).
* **Especificações Visuais do Dark Theme**:
  * **Cor do texto**: `#969696` (cinza claro).
  * **Cor do ícone**: `#969696` (cinza claro), com alternância dinâmica entre `ChevronDown` (fechado) e `ChevronUp` (aberto).
  * **Cor do contorno**: `#969696` (cinza claro - `border-[#969696]`).
* **Responsividade Mobile & Desktop**:
  * Largura máxima e espaçamentos adaptativos (`max-w-[125px]` em telas ultra-compactas, `xs:max-w-[155px]`, `sm:max-w-[210px]` e até `max-w-[240px]` no desktop com `truncate`), eliminando qualquer risco de transbordamento horizontal ou sobreposição com outros elementos da barra.

### 2. Preservação Estrita da Paleta de Cores do Light Theme
* **Anti-Regressão**:
  * Paleta original 100% preservada: fundo `#F4F4F5`, texto `#55555E`, borda `#D4D4D8`.
  * Menu hambúrguer verde esmeralda `#059669`.
  * Sino neutro oficial `#71717a` (`text-zinc-500`).
  * Nenhuma regra de alta especificidade interfere no comportamento ou nas cores do modo claro.

### 3. Otimizações Complementares de UX
* **Remoção de Duplicidades**:
  * Componente `ThemeToggle` mantido no menu suspenso do perfil do usuário e removido da barra direta para maximizar a área útil em telas móveis.
  * Badge de status de atendimento na barra unificado com o indicador de presença nativo do Avatar.

### 4. Correção de Bug: Padrão Dark Theme no Carregamento Inicial (Anti-Flicker)
* **Correção do Carregamento Inicial**:
  * Adicionada a classe `dark` diretamente na tag raiz `<html class="dark" lang="pt-BR">` em `index.html`.
  * Implementado script inline no `<head>` para verificação antecipada de preferência salva, garantindo que o tema escuro seja sempre o padrão antes e após o login.
  * Invocação explícita de `initTheme()` no bootstrap da aplicação (`src/main.tsx`), montagem do componente principal (`src/App.jsx`) e auto-execução em `src/utils/theme.js`.
  * **Eliminação do Bug de Alternância no Avatar**: O menu suspenso do Avatar e o componente `ThemeToggle` não alteram mais o tema da página de forma inesperada ao serem clicados ou montados.

### 5. Otimização de Espaço Vertical: Card "Agenda de Atendimentos" Expansível (Accordion)
* **Novo Formato Expansível (Accordion)**:
  * O card principal passa a iniciar **recolhido (closed)** por padrão, reduzindo o consumo vertical do Dashboard.
  * Cabeçalho compacto interativo com ícone do Calendário, título *"Agenda de Atendimentos"* e indicador **Chevron Down** rotativo.
  * Transição suave via CSS Grid que revela a nova copy (*"Acompanhe atendimentos, altere a agenda dos profissionais, cadastre novos clientes, produtos e serviços."*) e as tags de métricas do dia (`{N} cortes hoje` e `R$ previsto`).

### 6. Cabeçalho Responsivo da Agenda Mobile First (Navegação + Filtros em Dropdown + CTA Compacto)
* **Estrutura em Duas Linhas Otimizada para Mobile**:
  * **Linha 1 (Navegação Temporal)**: Controles `Chevron Left` / `Chevron Right` com data centralizada em destaque (`Hoje, Sábado 17 de Outubro de 2026`).
  * **Linha 2 (Controles em Linha Única)**:
    * Seletor de visualização compacto em `<select>` com fundo/pílula em laranja de destaque (`bg-amber-600`) para os modos `Dia`, `Semana` e `Mês`.
    * Filtro de profissionais em `<select>` com indicador `Chevron Down` e truncamento inteligente.
    * Botão primário de ação (CTA) compacto com ícone de soma e rótulo **`Novo`**.
    * Remoção do botão secundário de cancelados ("Ocultos") para garantir o alinhamento horizontal dos 3 controles em smartphones.

### 7. Documentação Técnica
* Documentação técnica detalhada formalizada em:
  * `docs/analise-ux-navbar-mobile-first-dark.md` (Navbar e Tema Escuro)
  * `docs/analise-ux-avatar-dropdown-dark-theme.md` (Menu Dropdown do Avatar)
  * `docs/analise-ux-agenda-accordion.md` (Card da Agenda Expansível)
  * `docs/analise-ux-agenda-cabecalho-mobile-first.md` (Cabeçalho Responsivo Mobile First)
  * `docs/module-agenda.md` (Módulo da Agenda Atualizado)

