# Análise de UX & Design System: Refinamento da Aba Perfil & Chave PIX

## 1. Visão Geral
Este documento formaliza as mudanças estruturais e cromáticas implementadas no **Componente Meu Perfil / Aba Perfil & Chave PIX** (`UserProfileView.jsx`), com foco na simplificação do fluxo visual, separação de contêineres independentes no Light Theme e refinamento da seção de biografia, sugestões rápidas e tags de especialidades ativas.

---

## 2. Separação dos Containers (Versão Light Theme)
A aba foi estruturada em dois contêineres cartões (*cards*) totalmente separados e desacoplados:

### Container 1: Cadastre sua chave PIX (`data-profile-pix-container`)
- **Container**: Card isolado com fundo `#FFFFFF`, borda suave `#e4e4e7` (`border-zinc-200`), cantos arredondados `rounded-3xl` e sombra sutil.
- **Ícone e Título**: Ícone com preenchimento verde `#059669` no Light Theme (`dark:text-amber-500` no Dark Theme) + título **"Cadastre sua chave PIX"**.
- **Subtítulo**: *"Chave usada para recebimento dos atendimentos e comandas."*
- **Grid de Entradas (3 Colunas Responsivas)**:
  1. **Tipo de Chave**: Componente `Select` (CPF, Celular, E-mail, Chave Aleatória).
  2. **Chave PIX Cadastrada**: Input dinâmico com máscara adaptável.
  3. **Instagram Profissional**: Input para divulgação `@seunome_barber`.

### Container 2: Perfil Profissional (`data-profile-portfolio-container`)
- **Container**: Card isolado e independente com espaçamento vertical (`space-y-6`), fundo `#FFFFFF` no Light Theme e borda `#e4e4e7`.
- **Textos Gerais**: Padronizados na cor **`#18181B`** no Light Theme (título, subtítulo, rótulos, contadores e texto digitado).
- **Apresentação Profissional / Biografia**:
  - Rótulo simplificado: **`Apresentação Profissional / Biografia`**.
  - Placeholder: Mantido em cinza claro (`placeholder-zinc-400`).
  - Limite de caracteres com contador dinâmico (até 250 caracteres).
- **Especialidades com Sugestões Rápidas (`TagInput.jsx`)**:
  - **Sugestões Rápidas (Estado Normal)**:
    - Fundo: Transparente (`bg-transparent`).
    - Contorno (stroke): Cor **`#171719`**.
    - Fonte (texto e ícone `+`): Cor **`#171719`**.
  - **Sugestões Rápidas (Estado Hover)**:
    - Fundo: Transparente (`hover:bg-transparent`).
    - Contorno (stroke): Cor verde **`#059669`**.
    - Fonte (texto e ícone `+`): Cor verde **`#059669`**.
- **Tags Ativas no Perfil**:
  - **Container**: Fundo **transparente** (`bg-transparent`) com contorno em cinza claro (`border-zinc-200` / `#e4e4e7`).
  - **Rótulo "TAGS ATIVAS NO PERFIL"**: Cor **`#18181B`**.
  - **Texto "visíveis na agenda do cliente"**: Cor **`#18181B`**.
  - **Tags Ativas**: Fundo **`#ECFDF5`** com texto em verde **`#059669`**.
  - **Ícone de Remoção "X"**: Cor **`#ffffff`** (Branco), abrigado em botão circular verde `#059669`.
- **Linha Divisória de Ação**:
  - Linha superior ao botão *"Salvar Alterações do Perfil"* em **cinza claro** (`#e4e4e7` / `border-zinc-200`).

---

## 3. Preservação da Versão Dark Theme
Todas as cores e estilos do tema escuro foram rigorosamente mantidos:
- Fundo dos containers: `dark:bg-neutral-900/90`
- Bordas dos cards: `dark:border-neutral-800`
- Títulos: `dark:text-white`
- Subtítulos: `dark:text-neutral-400`
- Ícones destacados: tom Âmbar (`dark:text-amber-500` / `dark:text-amber-400`)
- Tags ativas no Dark Theme: `dark:bg-amber-500/10`, `dark:border-amber-500/40`, `dark:text-amber-300`
- Sugestões no Dark Theme: `dark:bg-neutral-900`, `dark:border-neutral-800`, hover âmbar `dark:hover:text-amber-400`

---

## 4. Arquivos Envolvidos
- `src/pages/BarbershopAdmin/UserProfileView.jsx`
- `src/pages/BarbershopAdmin/UserProfileView.styles.js`
- `src/components/ui/TagInput.jsx`
- `src/components/ui/TagInput.styles.js`
- `src/components/ui/Tabs.styles.js`
- `src/index.css`
- `docs/analise-ux-perfil-chave-pix.md`
- `docs/release-notes-v1.5.4.2.md`
