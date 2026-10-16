# Release Notes - Barbearia SaaS v1.5.4.2

**Data de Lançamento**: Outubro de 2026  
**Status**: Homologado & Ativo  
**Módulos**: Perfil do Usuário & Chave Pix (`src/pages/BarbershopAdmin/UserProfileView.jsx`), Estilos do Perfil (`src/pages/BarbershopAdmin/UserProfileView.styles.js`), Componente TagInput (`src/components/ui/TagInput.jsx`, `src/components/ui/TagInput.styles.js`), Abas do Sistema (`src/components/ui/Tabs.styles.js`), Folha de Estilos Global (`src/index.css`), Documentação Técnica (`docs/analise-ux-perfil-chave-pix.md`)

---

## 🎯 Principais Atualizações da Versão 1.5.4.2

### 1. Separação de Contêineres na Aba "Perfil & Chave PIX" (Light Theme)
- **Container 1 (Cadastre sua chave PIX)** e **Container 2 (Perfil Profissional)** foram desacoplados em dois cartões independentes com `space-y-6`.
- Cada contêiner possui fundo `#FFFFFF`, borda cinza clara `#e4e4e7` (`border-zinc-200`), cantos arredondados `rounded-3xl` e espaçamento interno padronizado.
- Eliminada duplicação de botões de ação e linhas residuais fora dos contêineres na aba profissional.

### 2. Refinamento Cromático dos Ícones (Light Theme vs Dark Theme)
- **Modo Claro (Light Theme)**:
  - Ícones de seção dos contêineres e ícone de sugestões rápidas atualizados para o verde esmeralda **`#059669`**.
- **Modo Escuro (Dark Theme)**:
  - Preservação estrita das cores originais no tom **Âmbar** (`#f59e0b` / `dark:text-amber-500` / `dark:text-amber-400`).

### 3. Container 2 (Perfil Profissional) - Textos, Biografia e Tags
- **Padronização de Textos em `#18181B`**:
  - Títulos, subtítulos, rótulos e contadores atualizados para `#18181B` no Light Theme.
  - **Placeholder preservado**: Mantido em cinza claro original (`placeholder-zinc-400`).
  - **Rótulo da Biografia**: Ajustado para `Apresentação Profissional / Biografia`.
- **Sugestões Rápidas de Especialidades**:
  - Estado normal: fundo transparente, contorno (stroke) `#171719` e texto `#171719`.
  - Estado hover: fundo transparente, contorno (stroke) `#059669` (verde) e texto `#059669` (verde).
- **Tags Ativas no Perfil**:
  - Contêiner de tags com fundo transparente e contorno cinza claro (`#e4e4e7`).
  - Rótulos "TAGS ATIVAS NO PERFIL" e "visíveis na agenda do cliente" na cor `#18181B`.
  - Tags ativas no Light Theme com fundo `#ECFDF5`, texto `#059669` e ícone "X" em branco puro `#ffffff`.
- **Linha Divisória de Salvamento**:
  - Separador superior do botão "Salvar Alterações do Perfil" em cinza claro (`#e4e4e7`).

### 4. Banner de Avaliação (Plano Trial) - Mobile First & Botão de Upgrade
- **Layout Mobile First**:
  - Alinhamento responsivo (`flex-col sm:flex-row`) com centralização em telas menores e fluidez horizontal em telas maiores.
- **Botão "Fazer Upgrade / Assinar"**:
  - **Background**: Cor **Âmbar** (`#d97706` / hover `#b45309`).
  - **Cor do texto**: **Branca** (`#ffffff`).
  - Isolado de sobrescritas globais de cor de botões em modo claro através da classe `.trial-banner-upgrade-btn` e do atributo `[data-trial-upgrade-btn]`.

