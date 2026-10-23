# Release Notes - Barbearia SaaS v1.5.3.8

**Data de Lançamento**: Outubro de 2026  
**Status**: Homologado & Ativo  
**Módulos**: Edição Rápida de Atendimento (`ScheduleView.jsx`), Gestão Cadastral Completa (`ClientsDirectoryView.jsx`), Sincronização em Cascata (`App.jsx`, `BarbershopDashboard.jsx`), Tabela (`Table.jsx`), Documentação Técnica (`docs/module-clientes.md`)

---

## 🎯 Principais Atualizações da Versão 1.5.3.8

### 1. Edição Rápida de Cliente em Atendimento (`ScheduleView.jsx`)
- **Link 'Editar' no Modal de Atendimento**:
  - Inserido discretamente ao lado do cabeçalho "Cliente Agendado".
  - **Light Mode**: `text-[#059669] hover:text-[#047857]` com fonte `text-xs font-semibold` e foco acessível (`focus-visible:ring-2 focus-visible:ring-amber-500`).
  - **Dark Mode**: `text-amber-400 hover:text-amber-300`.
- **Modal de Edição Rápida Sobreposto (`QuickClientEditModal`)**:
  - Diálogo compacto (`size="sm"`) com foco automático no campo Nome.
  - Campos para alteração imediata de Nome e Celular/Telefone (com máscara de WhatsApp).
  - Preserva integralmente o contexto e estado do atendimento em andamento.

### 2. Sincronização em Cascata Imediata
- Ao salvar as alterações do cliente na edição rápida:
  - O modal de atendimento ativo atualiza instantaneamente o card do cliente agendado.
  - A grade da Agenda (`appointments`) reflete de imediato o novo nome e telefone em todos os horários correspondentes.
  - O cadastro na tabela de clientes do Supabase (`public.clients`) é atualizado/inserido de imediato com persistência nos caches locais (`saas_clients_cache` e `barbearia_saas_clients_v2`).

### 3. Gestão Cadastral Completa em Clientes & Prontuários (`ClientsDirectoryView.jsx`)
- **Ação na Coluna de Ações da Tabela**:
  - Ícone de lápis/edição (`Edit3` / 16px) posicionado ergonomicamente entre o Sino (Lembrete Preditivo) e o Arquivo (Prontuário/Ficha Técnica).
  - Estilo: Botão de ação circular compacto (`w-8 h-8 rounded-lg`), hover sutil (`hover:bg-neutral-800 dark:hover:bg-neutral-800 [html:not(.dark)_&]:hover:bg-zinc-100`).
- **Modal de Cadastro Completo (`FullClientEditModal`)**:
  - Grid de 2 colunas responsivo, inputs padronizados com borda suave e labels legíveis.
  - **Nome Completo e Telefone**: Validação obrigatória e máscara de telefone.
  - **Total Gasto (R$)**: Campo monetário livre para ajuste direto de saldo acumulado pelo administrador.
  - **Barbeiro Preferido**: Select populado dinamicamente com os barbeiros da barbearia.
  - **Frequência Habitual (em dias)**: Validação de intervalo de retorno (1 a 365 dias).
  - **Prontuário Técnico / Ficha de Corte**: Edição direta das especificações de estilo, lâmina, pente e observações.

### 4. Arquitetura e Resiliência
- **Manipulação Centralizada no `App.jsx`**: Função `handleUpdateClient` para unificar regras de negócio, garantia de concorrência e integridade referencial.
- **Tabela Reutilizável (`Table.jsx`)**: Suporte aprimorado para `act.className` e `act.iconSize` mantendo compatibilidade visual com o Design System.
- **Metadados**: Sincronizado para `SaaS V1.5.3.8` em `metadata.json` e `index.html`.
