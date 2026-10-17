# Release Notes - Barbearia SaaS v1.5.4.7

**Data de Lançamento**: Outubro de 2026  
**Status**: Homologado & Ativo  
**Módulos**: Card "Previsão atual" (`ScheduleView.jsx`, `ScheduleView.styles.js`), Card "Agenda de Atendimentos" (`CalendarView.jsx`, `CalendarView.styles.js`), Integração Reativa (`BarbershopDashboard.jsx`), Metadados (`metadata.json`, `index.html`)

---

## 🎯 Principais Atualizações da Versão 1.5.4.7

### 1. Card "Previsão atual" com 3 Big Numbers Dinâmicos (Substitui o antigo card de agenda)
* **Cabeçalho Interativo (Dropdown Expansível)**:
  * **Ícone de Cifrão/Previsão**: Ícone `DollarSign` com container estilizado em fundo suave âmbar (`bg-amber-500/10 text-amber-500`).
  * **Título Oficial**: *"Previsão atual"*.
  * **Indicador de Chevron**: Indicador rotativo (180°) com transição suave que permite recolher e expandir o card sob demanda.
  * **Linha Divisória Interna**: Separador visual (`border-t border-neutral-800/80`) entre o cabeçalho e os blocos de métricas.
* **Os 3 Big Numbers Internos**:
  1. **Clientes**: Contabiliza a quantidade total de clientes cadastrados no sistema (menu Clientes e Prontuários), com contagem reativa e fallback defensivo para clientes únicos de agendamentos.
  2. **Serviços**: Quantidade de serviços realizados e agendados com base no filtro temporal ativo (**Dia**, **Semana** ou **Mês**).
  3. **Preço / Faturamento**: Soma total dos preços dos serviços e comandas pertinentes ao período selecionado (**Dia**, **Semana** ou **Mês**), prevenindo duplicidade de faturamento.

---

### 2. Card "Agenda de Atendimentos" (Container de Slots)
* **Header do Container**:
  * Adicionado ícone de calendário (`Calendar`) em destaque âmbar.
  * Título oficial: *"Agenda de Atendimentos"*.
* **Linha Divisória (Divider)**:
  * Linha divisória horizontal dedicada inserida logo abaixo do título para separar visualmente o cabeçalho dos controles de navegação e filtros.
* **Controles Inferiores Integrados**:
  * Preservada a barra de navegação de data (botões Anterior/Próximo e atalho dinâmico para "Hoje").
  * Dropdown seletor de período (**Dia**, **Semana**, **Mês**) com fundo em laranja de destaque (`bg-amber-600`).
  * Filtro de profissionais com truncamento e botão primário compacto com ícone de soma e rótulo **`Novo`**.

---

### 3. Reatividade Bidirecional (Regras de Negócio)
* **Sincronização em Tempo Real**:
  * A alteração do seletor de período na agenda (**Dia**, **Semana** ou **Mês**) ou a navegação para datas anteriores/futuras recalcula e atualiza instantaneamente os Big Numbers de **Serviços** e **Preço / Faturamento**.
  * Arquitetura de estado controlado com zero falhas de sincronização entre `ScheduleView` e `CalendarView`.

---

### 4. Preservação Estrita da Paleta de Cores do Light Theme
* **Anti-Regressão Visual**:
  * Nenhuma alteração foi realizada nas regras de estilo do modo claro (`index.css`).
  * Superfícies, bordas e tipografia respeitam integralmente os tokens da paleta **Minimalist Emerald** no modo claro e **Dark Theme** de alto contraste no modo escuro.

---

### 5. Documentação Técnica Atualizada
* `docs/release-notes-v1.5.4.7.md`: Registro completo desta versão.
* `docs/module-agenda.md`: Atualização da arquitetura do módulo da agenda com o novo card de Previsão Atual e container de slots.
* `docs/analise-ux-agenda-previsao-atual.md`: Documentação de UX e regras de cálculo dos Big Numbers.
