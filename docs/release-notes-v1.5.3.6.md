# Release Notes - Barbearia SaaS v1.5.3.6

**Data de Lançamento**: Outubro de 2026  
**Status**: Homologado & Ativo  
**Módulos**: Design System (`theme.js`, `index.css`), Barra de Navegação (`Navbar.jsx`, `Navbar.styles.js`), Theme Toggle (`ThemeToggle.jsx`, `ThemeToggle.styles.js`), Painel Administrativo (`BarbershopDashboard.jsx`)

---

## 🎯 Principais Atualizações da Versão 1.5.3.6

### 1. Paleta 3: Minimalist Emerald (Clean e Tecnológico) para o Modo Claro
- **Arquitetura Visual**: Implementação completa da paleta inspirada em software de gestão SaaS moderno, utilizando base neutra em tons de cinza **Zinc** com realces pontuais em **Verde Esmeralda** (`emerald-600` / `emerald-700`).
- **Títulos e Textos**: Títulos e textos de destaque em `text-zinc-900` (`#18181b`) e subtítulos/legendas em `text-zinc-600` (`#52525b`).
- **Botões e Ações**: Botão principal ativo em `bg-emerald-600` (`#059669`) com hover `hover:bg-emerald-700` (`#047857`) e texto branco (`#ffffff`). Botão transparente com container transparente, hover em `hover:bg-zinc-100` e borda `border-zinc-300` (`#d4d4d8`). Botões desativados em `bg-zinc-200 text-zinc-400`.
- **Badges e Tags**: Badges de status e notificações com fundo `bg-emerald-50`, texto `text-emerald-700` e borda `border-emerald-200`. Tags de serviços em `bg-zinc-100 text-zinc-800 border-zinc-200`.
- **Links**: Estilizados com `text-emerald-600 hover:text-emerald-700 underline`.

### 2. Refinamentos de Alta Fidelidade no Componente Navbar (Theme Light)
- **Theme Toggle**:
  - Container com background transparente e stroke regulado em `#D4D4D8` (alinhado com os strokes do Alerta e do Avatar).
  - Elipse ativa no modo claro com background `#059669` (verde esmeralda).
  - Ícone do Sol com cor `#ffffff` (branco puro com nitidez vetorial).
- **Ícone Alert (Sino de Notificações)**:
  - Círculo indicador em vermelho (`bg-red-600` / `#dc2626`).
  - Contador numérico estritamente em branco puro (`#ffffff`) com proteção contra sobrescritas de tipografia escura global.
- **Avatar ("DE")**:
  - Iniciais do gestor/usuário formatadas com cor de texto `#18181B` (`text-zinc-900`) e stroke do container em `#D4D4D8`.
- **Breadcrumb de Navegação**:
  - Ajustado o texto da aba ativa de caixa alta (`AGENDA`) para escrita padrão em texto formatado: **`Agenda`**.

### 3. Preservação Absoluta da Paleta Dark
- Todas as definições, tokens e comportamentos da paleta escura (Âmbar Nobre `#f59e0b`, superfícies `#0a0a0a`/`#171717` e ícone da Lua) permanecem 100% intactas e inalteradas sob o seletor `.dark`.

### 4. Sincronização de Metadados
- Atualização do arquivo `metadata.json` para a versão **SaaS V1.5.3.6**.
