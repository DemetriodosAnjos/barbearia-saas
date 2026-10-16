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
### 4. Refinamento de UI: Cor do Texto "Conta Google Vinculada" no Componente Meu Perfil (#55555E)
- **Ajuste Solicitado**: No componente Meu Perfil, padronizar o texto *"Conta Google Vinculada"* para a cor **`#55555E`**.
- **Solução Implementada**:
  - `src/pages/BarbershopAdmin/UserProfileView.jsx`:
    - No cabeçalho de identificação rápida do perfil, a badge de autenticação Google foi atualizada para exibir *"Conta Google Vinculada"* com a cor `#55555E` (Light e Dark) e atributo `data-google-auth-text="true"`.
    - Na aba *Segurança & Acesso*, o título do card de método de autenticação ativo foi padronizado para *"Conta Google Vinculada"* com a cor `#55555E` quando autenticado via Google SSO.
  - `src/components/ui/Navbar.jsx`:
    - No menu suspenso do Avatar do usuário (*dropdown*), o indicador de conta Google vinculada foi harmonizado para utilizar `#55555E` tanto no tema claro quanto no escuro com o atributo `data-user-dropdown-google="true"`.
  - `src/index.css`:
    - Regra com máxima especificidade adicionada para os seletores `[data-google-auth-text="true"]` e `[data-user-dropdown-google="true"]` garantindo a renderização consistente da cor `#55555E !important`.

### 5. Refinamento de UI: Estados das Abas no Componente Meu Perfil (Default, Hover e Ativo)
- **Ajuste Solicitado**: Padronização dos 3 estados (Default, Hover e Ativo) para Títulos, Ícones e Linha inferior das 4 abas (*Dados Pessoais*, *Contato & Endereço*, *Perfil & Chave PIX*, *Segurança & Acesso*):
  - **Títulos**: Default `#52525B` | Hover `#262626` | Ativo `#059669` (verde esmeralda em negrito)
  - **Ícones**: Default `#52525B` | Hover `#262626` | Ativo `#059669` (verde esmeralda)
  - **Line (borda inferior)**: Default `#52525B` | Hover `#059669` (verde esmeralda) | Ativo `#059669` (verde esmeralda)
- **Implementação**:
  - `src/components/ui/Tabs.styles.js`: adicionada variante `profile` com `tabProfile` configurada para transições suaves e linha de borda inferior de 2px com preservação estrita do dark mode.
  - `src/components/ui/Tabs.jsx`: renderização dos atributos e classes semânticas (`.profile-tab-title`, `.profile-tab-icon`, `.profile-tab-item`).
  - `src/pages/BarbershopAdmin/UserProfileView.jsx`: integração de `variant="profile"` e `className="profile-tabs"`.
  - `src/index.css`: regras com alta especificidade garantindo fidelidade cromática absoluta no modo claro e preservando o tema escuro.
  - `docs/analise-ux-perfil-tabs-estados.md`: documentação técnica detalhada dos estados.

### 6. Refinamento de UI: Estados das Abas no Componente Configurações da Barbearia
- **Ajuste Solicitado**: Eliminação de ícones exibidos como strings nos títulos e inclusão de componentes oficiais da biblioteca `lucide-react`:
  - `Estabelecimento`: `<Building2 />`
  - `Regras de Agenda`: `<Clock />`
  - `Funcionamento`: `<Calendar />`
  - `Notificação WhatsApp`: `<MessageSquare />`
- **Padronização Cromática na Versão Light (`html:not(.dark)`)**:
  - **Títulos**: Default `#52525B` | Hover `#262626` | Ativo `#059669` (verde esmeralda em negrito)
  - **Ícones**: Default `#52525B` | Hover `#262626` | Ativo `#059669` (verde esmeralda)
  - **Line (borda inferior)**: Default `#52525B` | Hover `#059669` (verde esmeralda) | Ativo `#059669` (verde esmeralda)
- **Preservação Estrita da Versão Dark (`html.dark`)**:
  - Regras isoladas sob o seletor `html:not(.dark)`, mantendo cores nativas em âmbar (`text-amber-400`, `border-amber-500`) e neutros no modo escuro sem qualquer alteração.
- **Implementação**:
  - `src/pages/BarbershopAdmin/BarbershopSettingsView.jsx`: integração dos 4 títulos com ícones Lucide e variante `settings`.
  - `src/components/ui/Tabs.styles.js`: adição de `tabSettings` e `listWrapper.settings`.
  - `src/components/ui/Tabs.jsx`: atributos `data-settings-tab` e classes `.settings-tab-*`.
  - `src/index.css`: seção 23 com regras exclusivas para a versão light.
  - `docs/analise-ux-configuracoes-tabs-estados.md`: documentação técnica do componente.

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
- `src/components/ui/Tabs.jsx`
- `src/components/ui/Tabs.styles.js`
- `src/pages/BarbershopAdmin/BarbershopDashboard.jsx`
- `src/pages/BarbershopAdmin/BarbershopSettingsView.jsx`
- `src/pages/BarbershopAdmin/UserProfileView.jsx`
- `src/index.css`
- `docs/module-agenda.md`
- `docs/module-planos-e-trial-ux.md`
- `docs/analise-ux-sidebar-theme-light.md`
- `docs/analise-ux-perfil-tabs-estados.md`
- `docs/analise-ux-configuracoes-tabs-estados.md`
- `docs/release-notes-v1.5.4.1.md`
