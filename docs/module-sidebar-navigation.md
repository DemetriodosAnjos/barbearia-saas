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

### 2.2 Topo da Sidebar: Avatar, Identidade Visual e Link de Plano "TRIAL" / Upgrade
- **Avatar de Marca (Logo com Tesoura):**
  - **Versão Light:** Container com fundo verde `#059669` (`bg-[#059669]`), sombra esmeralda suave, e ícone vetorial da Tesoura (`Scissors`) em branco puro `#ffffff`.
  - **Versão Dark:** Container com fundo âmbar nobre `#d97706` (`bg-amber-600`) e ícone branco `#ffffff`.
  - Ao clicar no avatar, atua como gatilho acessível para alternar entre recolhimento e expansão do menu.
- **Título da Barbearia (ex: "Barbearia dos Anjos"):**
  - **Versão Light:** Texto na cor `#18181B` (`text-[#18181B]`), proporcionando máxima nitidez e conformidade WCAG AAA.
  - **Versão Dark:** Mantido integralmente na cor clara original `#f5f5f5` (`text-neutral-100`).
- **Link do Plano "TRIAL":**
  - **Versão Light:** Texto na cor verde esmeralda `#059669` (`text-[#059669] hover:text-[#047857]`).
  - **Versão Dark:** Mantido em tom âmbar nobre `#f59e0b` (`text-amber-500 hover:text-amber-400`).
  - Ao ser clicado, abre diretamente o modal oficial de contratação: `"Escolha o plano ideal para a sua barbearia"`.
- **TAG "Planos":**
  - **Versão Light:** Fundo verde claro `#ECFDF5` (idêntico à tag "Disponível" da Navbar), borda `#A7F3D0` e texto em verde `#059669`.
  - **Versão Dark:** Fundo translúcido `bg-amber-500/20`, borda `border-amber-500/30` e texto `text-amber-300`.

### 2.3 Versão Centralizada do Sistema (`metadata.json`)
- **Carregamento Automático e Centralizado:**
  - O rodapé da Sidebar carrega diretamente o campo `"name"` do arquivo `metadata.json` (`"SaaS V1.5.1.9"`).
  - A versão é renderizada em bloco dedicado, centralizado horizontalmente (`text-center` e `justify-center`), com divisor sutil e tipografia monoespaçada em destaque Âmbar (`text-amber-400 font-mono font-bold tracking-wider`).
  - Quando a barra lateral é recolhida, a versão compactada (`V1.5.1.9`) permanece centralizada e com tooltip acessível.
- **Substituição de Informações Técnicas e Remoção do Avatar:**
  - O termo técnico de autenticação `"Authenticated"` e o avatar circular com iniciais foram removidos do rodapé da Sidebar.
  - A visualização foi substituída pelo nome do usuário ativo e a versão oficial `SaaS V1.5.2.0` centralizada.

### 2.4 Link Contextual Super Admin (`atendmentor@gmail.com`)
- **Exibição Condicional Estrita:**
  - O link/botão para o **Painel Super Admin** é renderizado dinamicamente apenas quando o e-mail do usuário autenticado for `atendmentor@gmail.com` (ou corresponder à chave `VITE_SUPERADMIN_EMAIL`).
- **Posicionamento no Rodapé:**
  - Posicionado no rodapé da Sidebar, imediatamente acima do bloco que exibe a versão centralizada do sistema.
  - No modo expandido: exibe o ícone de Coroa (`Crown`), texto *"Painel Super Admin"* e efeito hover âmbar.
  - No modo recolhido: exibe o botão compacto com ícone de Coroa e tooltip acessível.
- **Segurança de Acesso:**
  - Usuários convencionais, clientes e barbeiros não visualizam o atalho, mantendo a interface limpa e restrita.

