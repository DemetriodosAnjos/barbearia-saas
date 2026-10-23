# Análise UX: Bottom Navigation Bar Mobile com Ação Rápida Central e Menu Popover (Layout 2+1+2)

**Data:** Outubro de 2026  
**Versão:** v1.5.4.8  
**Componentes:** `BottomNavigation.jsx`, `BottomNavigation.styles.js`, `BarbershopDashboard.jsx`, `BarbershopDashboard.styles.js`  
**Objetivo:** Proporcionar navegação ergonômica de alto desempenho na zona do polegar (*thumb zone*) em dispositivos móveis, com acesso instantâneo às 4 áreas vitais da barbearia, destaque proeminente para a criação de novos atendimentos e acesso rápido a configurações e perfil via Menu Popover "Mais".

---

## 1. Ergonomia e Arquitetura de Informação (2 + 1 + 2)

A barra inferior foi desenhada respeitando o princípio de Fitts e o padrão ergonômico mobile para operação com uma só mão, distribuída em 5 colunas simétricas:

```
+-------------------------------------------------------------------------+
| [Agenda]    [Clientes]    [ (✂️) Novo Atendimento ]    [Financeiro]   [Mais]  |
|  (Home)                     (CTA Central Elevado)              |        |
+----------------------------------------------------------------|--------+
                                                                 v
                                                     [ Popover Suspenso ]
                                                     - Modo de Exibição (Switch)
                                                     - Meu Perfil
                                                     - Configurações da Barbearia
                                                     - Suporte & Ajuda
                                                     ---------------------------
                                                     - Sair da Plataforma
```

### Distribuição Rigorosa dos Elementos
1. **Agenda (Home)** — Ícone: `Calendar` *(Extrema esquerda)*
   - Acesso direto à visualização de atendimentos do dia, semana e mês.
2. **Clientes** — Ícone: `Users` *(Esquerda do centro)*
   - Gestão de clientes, prontuários, histórico de cortes e contatos.
3. **Novo Atendimento** — Ícone: `Scissors` *(Centro / Destaque Principal)*
   - Botão flutuante central elevado (FAB integrado) com fundo em gradiente laranja/âmbar, acionando diretamente o modal de criação de agendamento.
4. **Financeiro** — Ícone: `DollarSign` *(Direita do centro)*
   - Visão consolidada de receitas, comissões dos barbeiros e faturamento.
5. **Mais / Perfil** — Ícone: `Menu` *(Extrema direita)*
   - Conectado diretamente ao Menu Popover suspenso de configurações rápidas, perfil e modo de exibição.

---

## 2. Cantos Arredondados Superiores e Prevenção de Vazamento de Tema (Dark Mode)

### Cantos Arredondados Superiores (`rounded-t-2xl`)
- Arredondamento aplicado estritamente na parte superior da barra (`border-top-left-radius: 1rem; border-top-right-radius: 1rem; border-bottom-left-radius: 0; border-bottom-right-radius: 0;`).
- Linha divisória superior com tom sutil neutro (`border-t border-x border-neutral-800/90`).

### Blindagem Contra Vazamento de Tema (Anti-Leak)
- **Causa Raiz Identificada:** Em regras globais de modo claro (`html:not(.dark)`), utilitários `.bg-neutral-900` poderiam ser forçados a fundo claro (`#ffffff`), gerando clarões ou vazamentos nas curvas arredondadas em navegadores mobile (Safari, Chrome).
- **Solução Implementada:**
  1. Aplicação explícita e direta de `style={{ backgroundColor: '#171717', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}` no container da Bottom Bar.
  2. Inclusão de regra prioritária no `index.css` assegurando que `nav[data-testid="bottom-navigation-bar"]` e `[data-testid="bottom-nav-more-popover"]` mantenham `#171717` sem exceções.
  3. Adição das meta tags `<meta name="theme-color" content="#171717" />` e `<meta name="color-scheme" content="dark" />` no `index.html`.

---

## 3. Menu Suspenso ("Mais")

Ancorado imediatamente acima da aba "Mais" no canto inferior direito, o Popover exibe uma interface compacta, elegante e fluida, padronizada com o dropdown do Avatar da Navbar:

1. **Modo de Exibição (Reutilização de ThemeToggle):**
   - Reutilização do componente oficial `<ThemeToggle />` da Navbar, exibindo o botão pílula com ícones de Sol e Lua.
   - Texto "Modo de Exibição" na tipografia `#969696` (Dark) / `#55555E` (Light).
   - Alternância em tempo real com persistência segura em `safeStorage`.
2. **Meu Perfil:**
   - Ícone de usuário (`User`) em tom dourado/âmbar + texto `Meu Perfil` na cor `#969696` (Dark) / `#55555E` (Light) com hover branco (`group-hover:text-white`).
   - Navega para a tela `perfil` e fecha o popover.
3. **Configurações da Barbearia:**
   - Ícone de engrenagem (`Settings`) + texto `Configurações da Barbearia` na cor `#969696` (Dark) / `#55555E` (Light) com hover branco.
   - Navega para a tela `configuracoes` e fecha o popover.
4. **Suporte & Ajuda:**
   - Ícone de balão (`MessageSquare`) + texto `Suporte & Ajuda` na cor `#969696` (Dark) / `#55555E` (Light) com hover branco.
   - Navega para a tela `suporte` e fecha o popover.
5. **Divisor Interno:** Linha sutil separadora na cor `#E4E4E7` (Light) / `#969696` (Dark).
6. **Sair da Plataforma:**
   - Ícone de logout (`LogOut`) + texto `Sair da Plataforma` na cor `#969696` (Dark) / `#55555E` (Light) com hover branco.
   - Executa a função segura de logout `onLogout` e expurga os dados de sessão.

### Ícones da Bottom Navigation Bar
- Todos os ícones da barra inferior (`Agenda`, `Clientes`, `Novo Atendimento`, `Financeiro`, `Mais`) adotam o tom **Âmbar** oficial (`text-amber-500 dark:text-amber-400`).
- A paleta de cores da versão **Light** foi integralmente preservada sem qualquer alteração.

### Lógica de Fechamento (*Click Outside* & Acessibilidade)
- Escuta ativa para cliques ou toques fora da área do Popover (`mousedown` e `touchstart`).
- Suporte à tecla `Escape` (`keydown`) para fechamento rápido via teclado.
- Backdrop invisível protetor para dispositivos touchscreen.

---

## 4. Prevenção de Sobreposição de Conteúdo (Content Padding)

- Margem inferior expandida no container principal das telas: `pb-32 md:pb-8`.
- Margem segura integrada na base da barra para aparelhos com barra de navegação por gestos: `pb-[max(0.65rem,env(safe-area-inset-bottom))]`.

---

## 5. Testes e Acessibilidade (WCAG 2.2 AA)

- `role="navigation"` com rótulo descritivo `aria-label="Navegação inferior mobile"`.
- Popover com `role="menu"` e botões com `role="menuitem"`.
- Switch com `role="switch"` e `aria-checked`.
- Áreas de toque de no mínimo 48x48px em conformidade com as diretrizes do Google Material e Apple HIG.
- Suíte completa de testes automatizados em `src/tests/components/BottomNavigation.test.jsx`.
