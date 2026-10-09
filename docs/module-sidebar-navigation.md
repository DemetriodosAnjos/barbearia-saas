# Módulo: Navegação Lateral & Sidebar (`/docs/module-sidebar-navigation.md`)

## 1. Visão Geral
A barra lateral de navegação (`src/components/ui/Sidebar.jsx` e `Sidebar.styles.js`) é o componente primário de roteamento e identidade visual no Painel Administrativo da Barbearia (`BarbershopDashboard.jsx`) e no Design System.

---

## 2. Recursos e Comportamento de UX

### 2.1 Encolhimento / Expansão do Menu (Collapsible Sidebar)
- **Ícone e Botão de Ação:** 
  - No modo expandido, exibe o botão `<ProjectIcon name="ChevronLeft" />` no cabeçalho para recolher o menu.
  - No modo recolhido, o menu encolhe à esquerda da interface para uma coluna compacta (`w-20` no desktop), exibindo o botão `<ProjectIcon name="ChevronRight" />` para expandir novamente.
- **Coluna de Ícones:**
  - Quando encolhido, apenas a coluna de ícones centralizados permanece visível.
  - Cada item possui tooltip nativo (`title={item.label}`) e indicador visual sutil para notificações pendentes (badge dot).
- **Persistência de Preferência:**
  - A preferência do operador é armazenada em `localStorage` (`barbearia_sidebar_collapsed`) para manter o estado entre recarregamentos e navegação.

### 2.2 Link de Plano "TRIAL" / Upgrade
- **Ação Direta:**
  - O indicador de plano no cabeçalho da Sidebar (ex: `TRIAL`) atua como link interativo na cor Âmbar (`text-amber-500 hover:text-amber-400`).
  - Ao ser clicado, abre diretamente o modal oficial de contratação: `"Escolha o plano ideal para a sua barbearia"`.
  - Possui a mesma funcionalidade e destino do botão `"Fazer Upgrade / Assinar"` presente na barra superior de contagem regressiva (`TrialBanner.jsx`).

### 2.3 Versão Dinâmica do Sistema (`metadata.json`)
- **Carregamento Automático:**
  - O rodapé da Sidebar carrega diretamente o campo `"name"` do arquivo `metadata.json` (ex: `"SaaS V1.5.1.6"`).
  - Sempre que a versão do projeto é atualizada em `metadata.json`, a exibição na Sidebar atualiza de forma reativa e automática sem necessidade de hardcode.
- **Substituição de Informações Técnicas e Remoção do Avatar:**
  - O termo técnico de autenticação `"Authenticated"` e o avatar circular com iniciais foram removidos do rodapé da Sidebar.
  - A visualização foi substituída pelo nome do usuário ativo e a versão oficial em destaque monoespaçado Âmbar (`text-amber-400 font-mono font-bold`).
