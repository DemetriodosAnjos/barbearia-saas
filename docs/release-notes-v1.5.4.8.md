# Release Notes - Barbearia SaaS v1.5.4.8

**Data de Lançamento:** Outubro de 2026  
**Status:** Homologado & Ativo  
**Módulos:** Bottom Navigation Bar (`BottomNavigation.jsx`, `BottomNavigation.styles.js`), Dashboard Geral (`BarbershopDashboard.jsx`, `BarbershopDashboard.styles.js`), Agenda (`ScheduleView.jsx`), Metadados (`index.html`)

---

## 🎯 Principais Atualizações da Versão 1.5.4.8

### 1. Bottom Navigation Bar com Ação Rápida Central (Layout Simétrico 2+1+2)
* **Estrutura e Ordem Ergonômica:**
  1. **Agenda (Home)** — Ícone: `Calendar` *(Extrema esquerda)*
  2. **Clientes** — Ícone: `Users` *(Esquerda do centro)*
  3. **Novo Atendimento** — Ícone: `Scissors` *(Centro / Destaque principal)*
  4. **Financeiro** — Ícone: `DollarSign` *(Direita do centro)*
  5. **Mais / Perfil** — Ícone: `Menu` *(Extrema direita)*
* **Destaque Visual do CTA Central:**
  * Botão em elevação (`-mt-6`) com gradiente em destaque laranja/âmbar (`bg-gradient-to-tr from-orange-600 to-amber-500`).
  * Sombra pronunciada (`shadow-orange-600/40`), anel duplo protetor e feedback tátil ao toque.
  * Gatilho direto que abre instantaneamente o modal de cadastro de novo atendimento na Agenda.
* **Estados Ativo e Inativo:**
  * Identificação imediata da aba corrente com cor de realce (`text-orange-600 dark:text-amber-400 font-bold`) e micro-indicador inferior.
  * Suporte a leitores de tela com `aria-current="page"` e conformidade de contraste WCAG 2.2 AA.

---

### 2. Espaçamento Defensivo de Conteúdo (`Padding Bottom`)
* Ajustado o espaçamento inferior no container principal de telas (`mainContent`) para `pb-32 md:pb-8`.
* Elimina qualquer risco de sobreposição da barra flutuante sobre listas de agendamentos, cartões de faturamento ou botões de rodapé.
* Suporte nativo ao `env(safe-area-inset-bottom)` para iPhones com barra de gestos e dispositivos Android modernos.

---

### 3. Correção de Resiliência no `ScheduleView.jsx`
* Corrigido `ReferenceError: useEffect is not defined` adicionando o import explícito de `useEffect` no módulo da Agenda.
* Garantida a escuta reativa da prop `openNewAppointmentTrigger` para acionamento do modal através do clique no botão central da Bottom Navigation.

---

### 4. Suíte de Testes Automatizados
* Adicionado teste unitário em `src/tests/components/BottomNavigation.test.jsx`:
  * Validação do container fixo e atributos de acessibilidade.
  * Validação do botão central (`data-nav-center="true"`).
  * Validação de transição de abas e disparos de evento `onChange`.
