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

### 3. Prevalência de Z-Index do Banner de Avaliação (Trial) sobre a Navbar no Scroll
- **Problema Reportado**: Durante a execução do scroll da página, a `Navbar` estava sobrepondo (passando por cima com seu `z-index`) a barra de contagem regressiva: *"Período de Avaliação: Você tem X dias restantes de Teste Grátis na sua barbearia."*.
- **Causa Raiz**:
  - A barra de `TrialBanner` operava com `sticky top-0 z-30`.
  - A `Navbar` possuía `sticky z-40`, o que fazia com que, ao rolar a página verticalmente, a Navbar passasse por cima do banner.
- **Solução Implementada**:
  - **Z-Index Prioritário do Banner (`z-[100]`)**: O componente `TrialBanner.jsx` agora conta com `sticky top-0 z-[100]`, atributo `data-trial-banner="true"` e classe `.trial-banner-top`.
  - **Regra de Especificidade no CSS**: Em `src/index.css`, foi configurada a regra `[data-trial-banner="true"] { position: sticky !important; top: 0 !important; z-index: 100 !important; }`, garantindo que o banner prevaleça sobre todos os elementos da UI.
  - **Deslocamento Dinâmico da Navbar (`top-[41px]` vs `top-0`)**: A `Navbar` foi adaptada para receber a prop `hasTrialBanner`. Quando a barbearia estiver em modo Trial com o banner ativo, a Navbar ancora em `top-[41px]`, garantindo visibilidade simultânea do banner e do cabeçalho sem colisões.
  - **Modais e Overlays Elevados (`z-[200]`)**: As sobreposições de modais (`Modal.styles.js`, `ActionSpinnerOverlayModal.jsx`) foram atualizadas para `z-[200]` e toasts para `z-[250]`, assegurando que modais de upgrade e alertas cubram a tela inteira quando acionados.

---

## 📋 Arquivos Afetados
- `metadata.json`
- `index.html`
- `src/components/dashboard/TrialBanner.jsx`
- `src/components/calendar/CalendarView.styles.js`
- `src/components/ui/Navbar.jsx`
- `src/components/ui/Navbar.styles.js`
- `src/components/ui/Sidebar.jsx`
- `src/components/ui/Modal.styles.js`
- `src/components/ui/ActionSpinnerOverlayModal.jsx`
- `src/components/ToastContainer.tsx`
- `src/pages/BarbershopAdmin/BarbershopDashboard.jsx`
- `src/index.css`
- `docs/module-agenda.md`
- `docs/module-planos-e-trial-ux.md`
- `docs/analise-ux-sidebar-theme-light.md`
- `docs/release-notes-v1.5.4.1.md`
