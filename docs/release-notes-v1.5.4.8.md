# Release Notes - Barbearia SaaS v1.5.4.8

**Data de Lançamento:** Outubro de 2026  
**Status:** Homologado & Ativo  
**Módulos:** Bottom Navigation Bar (`BottomNavigation.jsx`, `BottomNavigation.styles.js`), Dashboard Geral (`BarbershopDashboard.jsx`, `BarbershopDashboard.styles.js`), Agenda (`ScheduleView.jsx`), Estilos Globais (`index.css`), Metadados (`index.html`)

---

## 🎯 Principais Atualizações da Versão 1.5.4.8

### 1. Bottom Navigation Bar com Cantos Arredondados Superiores e Proteção Dark Mode
* **Cantos Arredondados Superiores (`rounded-t-2xl`):**
  * Aplicado arredondamento suave exclusivo nos cantos superior esquerdo e superior direito (`border-top-left-radius: 1rem` e `border-top-right-radius: 1rem`).
  * Borda superior e laterais sutis em cinza escuro (`border-t border-x border-neutral-800/90`).
* **Proteção Defensiva Contra Vazamento de Fundo Claro (Anti-Leak):**
  * Background `#171717` (Dark Theme) aplicado diretamente via inline styles e regras estritas no `index.css`.
  * Previne vazamento do fundo claro do navegador ou de seletores globais de modo claro nas curvas do topo.
  * Meta tags `<meta name="theme-color" content="#171717" />` e `<meta name="color-scheme" content="dark" />` adicionadas no `index.html`.

---

### 2. Menu Popover Suspenso Padronizado com o Dropdown da Navbar
* **Conexão Direta e Ergonômica:** O botão "Mais" (extrema direita) aciona o menu popover flutuante com a mesma identidade visual e componentes do dropdown do Avatar da Navbar.
* **As 5 Opções Oficiais (Tipografia #969696 e Componente ThemeToggle):**
  1. **Modo de Exibição (Reutilização de ThemeToggle):** Integração direta do componente `<ThemeToggle />` da Navbar, preservando o switch pílula com ícones de Sol e Lua e sincronização reativa com o tema do sistema.
  2. **Meu Perfil:** Texto na cor `#969696` (Dark) / `#55555E` (Light) e ícone em tom dourado/âmbar com hover branco.
  3. **Configurações da Barbearia:** Texto na cor `#969696` (Dark) / `#55555E` (Light) com hover branco.
  4. **Suporte & Ajuda:** Texto na cor `#969696` (Dark) / `#55555E` (Light) com hover branco.
  5. **Sair da Plataforma:** Texto na cor `#969696` (Dark) / `#55555E` (Light) e ícone de logout com hover branco, acionando o encerramento seguro de sessão.
* **Padronização dos Ícones da Barra Inferior:**
  * Todos os ícones da Bottom Navigation Bar (`Agenda`, `Clientes`, `Novo Atendimento`, `Financeiro`, `Mais`) adotam a cor **Âmbar** (`text-amber-500 dark:text-amber-400`).
  * Paleta de cores da versão Light preservada integralmente sem qualquer alteração.
* **Interatividade & Fechamento:**
  * Fechamento automático ao clicar/tocar fora (*click outside*).
  * Suporte ao fechamento via tecla `Escape`.
  * Backdrop invisível touch-friendly em dispositivos móveis.

---

### 3. Layout Simétrico 2 + 1 + 2 e Destaque CTA Central
* **Estrutura Oficial de 5 Itens:**
  1. **Agenda (Home)** — `Calendar` em tom Âmbar *(Extrema esquerda)*
  2. **Clientes** — `Users` em tom Âmbar *(Esquerda do centro)*
  3. **Novo Atendimento** — `Scissors` *(Centro / Destaque principal elevado em gradiente laranja/âmbar)*
  4. **Financeiro** — `DollarSign` em tom Âmbar *(Direita do centro)*
  5. **Mais / Perfil** — `Menu` em tom Âmbar *(Extrema direita com menu popover)*
* **Espaçamento Defensivo:** Margem inferior expandida para `pb-32 md:pb-8` no container de telas, evitando qualquer sobreposição com o rodapé.

---

### 4. Correções e Suíte de Testes Automatizados
* Correção do import de `useEffect` em `ScheduleView.jsx`.
* Testes unitários atualizados em `src/tests/components/BottomNavigation.test.jsx`, cobrindo cantos arredondados, proteção de cor de fundo, abertura do popover, chave de tema e acionamento de logout.
