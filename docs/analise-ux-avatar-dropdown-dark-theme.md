# Refinamento de UI — Paleta Dark Theme no Dropdown do Avatar

## 1. Visão Geral do Ajuste
Este documento formaliza as decisões de design e arquitetura CSS aplicadas ao menu suspenso (**Dropdown**) do componente **Avatar** na **Navbar**, garantindo consistência visual com a paleta oficial `#969696` no **Dark Theme** com foco na experiência **Mobile First**.

---

## 2. Microtarefas Implementadas

### 2.1. Identificador de Usuário (Header do Dropdown)
- **Alvo**: Texto referente às credenciais/perfil ativo (nome de exibição do usuário, dados de autenticação e detalhes de sessão).
- **Cor Aplicada**: `#969696` (cinza claro de alto contraste contra o fundo `#262626`).
- **Implementação**:
  - `src/components/ui/Navbar.jsx`: Adicionado `dark:text-[#969696]` e atributo `data-user-dropdown-name="true"`.
  - `src/index.css`: Regra com escopo estrito `html.dark [data-user-dropdown-header] [data-user-name]`, `html.dark [data-user-dropdown-name]`, `html.dark [data-user-dropdown-header] p`.

### 2.2. Itens de Navegação (Links do Menu)
- **Alvo**: Textos dos links de navegação:
  - *Meu Perfil*
  - *Configurações da Barbearia*
  - *Suporte & Ajuda*
  - *Sair da Plataforma*
- **Cor Aplicada em Repouso**: `#969696` (cinza claro).
- **Cor Aplicada no Hover/Foco**: `#ffffff` (branco puro) sobre fundo `#3f3f46`, garantindo feedback tátil imediato e alto contraste.
- **Implementação**:
  - `src/components/ui/Navbar.styles.js`: `dropdownItem` atualizado para `dark:text-[#969696]`.
  - `src/components/ui/Navbar.jsx`: spans dos itens e botão de logout calibrados com `dark:text-[#969696]`.
  - `src/index.css`: Regras `html.dark .avatar-dropdown-item span` e seletores semânticos `[data-user-dropdown-text]`.

### 2.3. Linhas Divisórias (`Borders` / `Separators`)
- **Alvo**: Linhas divisórias internas do dropdown (divisor pós-header, divisor de modo de exibição, divisor pré-logout e contorno do container).
- **Cor Aplicada**: `#969696`.
- **Implementação**:
  - `src/components/ui/Navbar.styles.js`: `dropdownMenu` (`dark:border-[#969696]`), `dropdownHeader` (`dark:border-[#969696]`), `dropdownDivider` (`dark:border-[#969696]`).
  - `src/components/ui/Navbar.jsx`: Divisor da linha de tema atualizado com `dark:border-[#969696]`.
  - `src/index.css`: Regras de borda com escopo `html.dark [data-user-dropdown-header]`, `html.dark [data-user-dropdown-divider]`, `html.dark [data-user-dropdown-menu] .border-b`, `.border-t`.

---

## 3. Matriz de Cores do Dropdown (Dark Theme vs Light Theme)

| Elemento | Dark Theme (Novo Padrão) | Light Theme (Preservado) |
| :--- | :--- | :--- |
| **Fundo do Menu** | `#262626` | `#F4F4F5` |
| **Contorno do Menu** | `#969696` | `#D4D4D8` |
| **Nome / Credencial (Header)** | `#969696` | `#059669` |
| **Cargo / Papel do Usuário** | `#FFB900` | `#55555E` |
| **Linhas Divisórias** | `#969696` | `#E4E4E7` |
| **Links em Repouso** | `#969696` | `#55555E` |
| **Links no Hover / Foco** | `#ffffff` (Fundo `#3f3f46`) | `#ffffff` (Fundo `#262626`) |
| **Ícones de Ação em Repouso** | `#FFC21F` (Sair: `#F87171`) | `#059669` (Sair: `#EF4444`) |
| **Ícones de Ação no Hover** | `#ffffff` | `#ffffff` |

---

## 4. Conformidade e Acessibilidade (WCAG 2.2)
- **Contraste de Texto (`#969696` sobre `#262626`)**: ~4.98:1 (Atende ao critério WCAG 2.2 AA para texto padrão).
- **Contraste no Hover (`#ffffff` sobre `#3f3f46`)**: ~9.5:1 (Atende ao critério WCAG 2.2 AAA).
- **Responsividade Mobile**: Largura controlada (`w-56`, ~224px) com margens seguras e posicionamento absolute alinhado à direita, prevenindo qualquer transbordamento da viewport em dispositivos móveis.
