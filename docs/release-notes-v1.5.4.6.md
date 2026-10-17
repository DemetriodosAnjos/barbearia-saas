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

### 5. Documentação Técnica
* Documentação técnica detalhada formalizada em `docs/analise-ux-navbar-mobile-first-dark.md`.

