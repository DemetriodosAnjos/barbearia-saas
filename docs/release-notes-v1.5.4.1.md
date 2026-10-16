# Release Notes - Barbearia SaaS v1.5.4.1

**Data de Lançamento**: Outubro de 2026  
**Status**: Homologado & Ativo  
**Módulos**: Agenda de Atendimentos (`src/components/calendar/CalendarView.styles.js`), Barra de Navegação Superior (`src/components/ui/Navbar.styles.js`), Menu Lateral / Sidebar (`src/components/ui/Sidebar.jsx`), HTML & Metadados (`metadata.json`, `index.html`), Documentação Técnica (`docs/module-agenda.md`, `docs/analise-ux-sidebar-theme-light.md`)

---

## 🎯 Principais Atualizações da Versão 1.5.4.1

### 1. Correção de Sobreposição de Z-Index na Agenda (Coluna "Horários" vs Navbar)
- **Problema Reportado**: Ao executar o scroll vertical da página na tela da Agenda, a coluna lateral fixa de horários (`timeGutter` com o cabeçalho `"Horários"` e os slots de horas `08:00`, `09:00`, etc.) passava por cima da barra de navegação superior (`Navbar`).
- **Diagnóstico Técnico**:
  - O contêiner pai da agenda não possuía contexto de empilhamento isolado (`isolation: isolate`), fazendo com que o `z-index` de elementos filhos (como `sticky z-30`) competisse diretamente no contexto raiz com a `Navbar` (`sticky z-30`).
  - Como a agenda aparece após a `Navbar` no DOM, a ordem de pintura padrão colocava os elementos da agenda sobre o cabeçalho durante a rolagem.
- **Solução Implementada**:
  - **Isolamento de Stacking Context (`relative isolate z-10`)**: Adicionado ao `calendarViewStyles.container`. Todo o conteúdo e subcamadas da agenda ficam restritos a esse contexto local, sem vazar para elementos superiores da página.
  - **Elevação da Navbar (`z-40` e `z-50`)**: A `Navbar` foi configurada com `sticky top-0 z-40`, garantindo precedência absoluta sobre a grade da agenda durante o scroll. O menu suspenso do usuário (*dropdown*) opera com `z-50`.
  - **Hierarquia Interna na Régua Horária**:
    - `timeGutter`: ajustado para `sticky left-0 z-20`, mantendo fixação horizontal ao navegar entre barbeiros.
    - `timeGutterHeader` ("Horários"): definido com `sticky top-0 z-30`, garantindo sobreposição adequada aos cabeçalhos das colunas de profissionais no scroll bidirecional interno da grade.

### 2. Atualização Geral de Versão (`SaaS V1.5.4.1`)
- **Metadados e Entry Point HTML**:
  - Sincronização em `metadata.json` para `"name": "SaaS V1.5.4.1"`.
  - Atualização no `index.html` das tags `<title>SaaS V1.5.4.1</title>` e `<meta property="og:title" content="SaaS V1.5.4.1" />`.
- **Menu Lateral (Sidebar)**:
  - Rodapé atualizado para exibir `SaaS V1.5.4.1` no modo expandido e `V1.5.4.1` no modo recolhido (*collapsed*).
  - Preservada a formatação cromática aprovada na v1.5.4.0: verde esmeralda `#059669` no Modo Claro (*Theme Light*) e branco puro `#ffffff` no Modo Escuro (*Theme Dark*).

---

## 📋 Arquivos Afetados
- `metadata.json`
- `index.html`
- `src/components/calendar/CalendarView.styles.js`
- `src/components/ui/Navbar.styles.js`
- `src/components/ui/Sidebar.jsx`
- `docs/module-agenda.md`
- `docs/analise-ux-sidebar-theme-light.md`
- `docs/release-notes-v1.5.4.1.md`
