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

### 2. Menu Popover Suspenso Conectado ao Botão "Mais"
* **Conexão Direta e Ergonômica:** O botão "Mais" (extrema direita) aciona um menu popover flutuante ancorado logo acima da barra inferior.
* **As 5 Opções Oficiais:**
  1. **Modo de Exibição (Theme Toggle):** Chave seletora (*toggle switch*) com ícones dinâmicos de Lua (`Dark`) e Sol (`Light`), sincronizando instantaneamente o tema global.
  2. **Meu Perfil:** Acesso direto à gestão cadastral, avatar, biografia e dados do profissional gestor.
  3. **Configurações da Barbearia:** Acesso ao painel de políticas, horários de atendimento e integrações.
  4. **Suporte & Ajuda:** Central de ajuda e chamados técnicos.
  5. **Sair da Plataforma:** Botão em destaque de alerta (`text-red-400`) para logout seguro e expurgo de sessão.
* **Interatividade & Fechamento:**
  * Fechamento automático ao clicar/tocar fora (*click outside*).
  * Suporte ao fechamento via tecla `Escape`.
  * Backdrop invisível touch-friendly em dispositivos móveis.

---

### 3. Layout Simétrico 2 + 1 + 2 e Destaque CTA Central
* **Estrutura Oficial de 5 Itens:**
  1. **Agenda (Home)** — `Calendar` *(Extrema esquerda)*
  2. **Clientes** — `Users` *(Esquerda do centro)*
  3. **Novo Atendimento** — `Scissors` *(Centro / Destaque principal elevado em gradiente laranja/âmbar)*
  4. **Financeiro** — `DollarSign` *(Direita do centro)*
  5. **Mais / Perfil** — `Menu` *(Extrema direita com menu popover)*
* **Espaçamento Defensivo:** Margem inferior expandida para `pb-32 md:pb-8` no container de telas, evitando qualquer sobreposição com o rodapé.

---

### 4. Correções e Suíte de Testes Automatizados
* Correção do import de `useEffect` em `ScheduleView.jsx`.
* Testes unitários atualizados em `src/tests/components/BottomNavigation.test.jsx`, cobrindo cantos arredondados, proteção de cor de fundo, abertura do popover, chave de tema e acionamento de logout.
