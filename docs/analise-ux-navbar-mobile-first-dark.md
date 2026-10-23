# Refinamento de UI — Navbar Mobile First (Versão Dark Theme)

## 1. Visão Geral do Refinamento
Este documento formaliza as decisões de arquitetura e design para a barra de navegação superior (**Navbar**) na experiência **Mobile First**, com ênfase no **Dark Theme**, posicionamento do elemento **Unidade da Barbearia** ao lado do **Alerta (Sino)** e preservação estrita da paleta de cores do **Light Theme**.

---

## 2. Diagnóstico & Problemas Solucionados

### 2.1. Elemento "Unidade da Barbearia" (Posicionamento ao Lado do Sino)
- **Problema anterior:** No lado esquerdo da barra, o seletor de unidade colidia com o hambúrguer e breadcrumbs.
- **Solução implementada:**
  - O elemento foi **restaurado e reposicionado no lado direito, imediatamente ao lado do Alerta (Sino)**.
  - **Cor do texto:** `#969696` (cinza claro no Dark Theme).
  - **Cor do ícone (Chevron Down / Up):** `#969696` (cinza claro no Dark Theme), alternando dinamicamente entre `ChevronDown` (fechado) e `ChevronUp` (aberto).
  - **Cor do contorno do container (stroke):** `#969696` (cinza claro no Dark Theme - `border-[#969696]`).
  - **Responsividade:** Truncamento inteligente e padding adaptativo (`max-w-[125px]` no mobile ultra-compacto até `max-w-[240px]` no desktop), permitindo coexistência perfeita com o Sino e Avatar sem quebras de linha ou overflow horizontal.

### 2.2. Eliminação de Duplicidades: Componente Theme Toggle
- **Problema:** O botão de alternância de tema estava duplicado, aparecendo tanto na barra da Navbar quanto no menu suspenso do Avatar ("Meu Perfil").
- **Ação:**
  - **REMOVER:** Removido o componente `ThemeToggle` da barra da Navbar.
  - **MANTER:** Mantido o componente `ThemeToggle` dentro do Seletor Meu Perfil (menu suspenso ao clicar no Avatar), acessível tanto no desktop quanto no mobile.

### 2.3. Eliminação de Duplicidades: Elemento de Status de Atendimento
- **Problema:** O badge de status de atendimento na barra superior duplicava a informação já exibida no ponto indicador de presença do próprio Avatar do profissional.
- **Ação:**
  - **REMOVER:** Removido o badge de status da barra da Navbar.
  - O Avatar mantém a exibição do status presencial em tempo real via indicador circular nativo.

---

## 3. Elementos na Navbar (Resumo Mobile First)

| Posição | Elemento | Comportamento no Dark Theme | Comportamento no Light Theme |
| :--- | :--- | :--- | :--- |
| **Esquerda** | **Menu Hambúrguer** | Cor **Âmbar** (`#f59e0b` / `dark:text-amber-400`) | Preserva Verde Esmeralda oficial (`#059669`) |
| **Direita** | **Unidade da Barbearia** | Texto, contorno e Chevron Down/Up em **`#969696`** | Preserva texto `#55555E` e borda `#D4D4D8` |
| **Direita** | **Alerta (Sino)** | Cor **Âmbar** (`#f59e0b` / `dark:text-amber-400`) com badge contador | Preserva Neutro oficial (`#71717a` / `text-zinc-500`) |
| **Direita** | **Seletor Avatar** | Miniatura idêntica ao Header de "Meu Perfil" com indicador de status | Avatar circular original com iniciais em caixa alta |

---

## 4. Preservação da Paleta Light Theme (Anti-Regressão)
Em estrito cumprimento aos requisitos de design:
- Nenhuma classe ou regra CSS do Light Theme foi modificada ou sobreposta com cores âmbar ou cinza escuro.
- O Menu Hambúrguer permanece em `#059669` (Verde Esmeralda).
- O Sino permanece em `#71717a` / `text-zinc-500`.
- O Seletor de Unidade no modo claro utiliza fundo `#F4F4F5`, texto `#55555E` e borda `#D4D4D8`.
- O Seletor de Tema dentro do menu suspenso continua com sua elipse verde `#059669` e ícone solar em branco no modo Light.
- Todas as regras Dark utilizam seletores com escopo estrito `html.dark` e `dark:`.

---

## 5. Arquivos Impactados
- `src/components/ui/Navbar.jsx`: Reposicionamento da Unidade da Barbearia para o lado direito ao lado do sino, alternância de ChevronUp/Down e atributos semânticos.
- `src/components/ui/Navbar.styles.js`: Calibração do `branchSelect` com `#969696` em texto e borda no Dark.
- `src/index.css`: Seção 25 com regras de alta especificidade para o elemento de Unidade da Barbearia (`#969696`).
- `docs/analise-ux-navbar-mobile-first-dark.md`: Documentação técnica do refinamento.
