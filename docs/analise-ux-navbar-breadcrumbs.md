# Análise de UX & Design System: Breadcrumbs da Navbar

## 1. Visão Geral
Este documento formaliza as regras visuais e cromáticas para os **Breadcrumbs** (indicadores de caminho de navegação) da barra superior (**Navbar**), assegurando legibilidade instantânea, contraste equilibrado e distinção clara entre páginas ancestrais e a página atual ativa onde o usuário se encontra.

---

## 2. Regras Cromáticas por Tema

### Versão Light Theme
- **Página Atual (Onde o usuário se encontra - Último item da trilha)**:
  - **Cor**: `#059669` (Verde Esmeralda).
  - **Peso tipográfico**: Semibold (`font-semibold`).
  - **Exemplos**:
    - `Painel da Barbearia / ` **`Meu Perfil`** (`#059669`)
    - `Painel da Barbearia / ` **`Agenda`** (`#059669`)
    - `Painel da Barbearia / ` **`Configurações`** (`#059669`)
    - `Painel da Barbearia / ` **`Financeiro`** (`#059669`)
- **Páginas Anteriores (Ancestrais / Caminho base)**:
  - **Cor**: `#71717A` (`text-zinc-500` / `.navbar-breadcrumb-parent`).
  - **Peso tipográfico**: Medium (`font-medium`).
- **Separador (`/`)**:
  - **Cor**: `#A1A1AA` (`text-zinc-400` / `.navbar-breadcrumb-separator`).

### Versão Dark Theme
- **Página Atual (Onde o usuário se encontra - Último item da trilha)**:
  - **Cor**: Cor padrão âmbar do SaaS — `#fbbf24` (`text-amber-400` / `.navbar-breadcrumb-current`).
  - **Peso tipográfico**: Semibold (`font-semibold`).
- **Páginas Anteriores (Ancestrais / Caminho base)**:
  - **Cor**: `#A3A3A3` (`text-neutral-400` / `.navbar-breadcrumb-parent`).
- **Separador (`/`)**:
  - **Cor**: `#52525B` (`text-neutral-600` / `.navbar-breadcrumb-separator`).

---

## 3. Implementação Técnica
- **Componente**: `src/components/ui/Navbar.jsx`
  - Marcação com atributo semântico `data-breadcrumb-current="true"` para o último item (`idx === breadcrumbs.length - 1`).
  - Classe semântica `.navbar-breadcrumb-current` e `.navbar-breadcrumb-parent`.
- **Estilos**: `src/components/ui/Navbar.styles.js`
  - Definição de classes Tailwind no objeto `navbarStyles.breadcrumbCurrent` e `navbarStyles.breadcrumbSeparator`.
- **Sobrescrita de Alta Especificidade**: `src/index.css`
  - Seletores `html:not(.dark) .navbar-breadcrumb-current` e `html.dark .navbar-breadcrumb-current` para garantir que regras de reset global não sobreponham o verde `#059669` no Light ou o âmbar `#fbbf24` no Dark.

---

## 4. Arquivos Envolvidos
- `src/components/ui/Navbar.jsx`
- `src/components/ui/Navbar.styles.js`
- `src/index.css`
- `docs/analise-ux-navbar-breadcrumbs.md`
