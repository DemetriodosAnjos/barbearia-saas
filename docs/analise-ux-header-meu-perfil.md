# Análise de UX & Design System: Refinamento do Header (Meu Perfil)

## 1. Visão Geral

Este documento formaliza o refinamento visual e estrutural do cabeçalho de identificação rápida no **Componente Meu Perfil** (`UserProfileView.jsx`), garantindo limpeza visual, harmonia espacial e conformidade estrita entre as versões Light e Dark do SaaS.

---

## 2. Estrutura Visual do Card Container
 
O cabeçalho é montado em um **CARD (Container Branco #FFFFFF)** na versão Light (`bg-[#FFFFFF]` com fundo `#FFFFFF` e bordas sutis `border-zinc-200`; mantendo integralmente as cores neutras e escuras no modo Dark com `dark:bg-neutral-900` e `dark:border-neutral-800`).

### DIV 1 - Alinhado à Esquerda do Card Container
1. **Avatar com Elipse Verde**:
   - Preserva o indicador de status presencial verde com animação piscante (`animate-pulse`).
   - Remove o contorno preto (`stroke`/`ring-neutral-950`), exibindo a elipse suave diretamente sobreposta ao avatar.
2. **Título do Profissional**:
   - Exibe o nome completo do profissional (ex: "Demetrio A L dos Anjos"), centralizado verticalmente com o Avatar.
   - Removido o texto redundante entre parênteses que ficava ao lado do título (ex: "(Deme Frost)").
3. **Identificação de Papel e Apelido**:
   - Disposto em linha (`div inline`) logo abaixo do título:
     `Administrador • Apelido: Deme Frost`
   - O separador visual é uma elipse sutil (`•`).

### DIV 2 - Link Superior Direito
- **Link "Voltar ao Painel"**:
  - Posicionado no canto superior direito do card, alinhado ao título.
  - Substitui o antigo botão com bordas e preenchimento por um link limpo: ícone `ArrowLeft` da biblioteca Lucide + texto `Voltar ao Painel`.
  - Sem borda, sem stroke ou fundo de botão; apenas texto interativo com transição de cor suave no hover.

### DIV 3 - Alinhado no Canto Direito na Base (Bottom)
- Posicionado na base inferior direita do card container, logo abaixo do link "Voltar ao Painel":
  - **Elemento 1**: Ícone `Mail` (Lucide) + email do usuário (ex: `ddoanjos@gmail.com`).
  - **Elemento 2**: Ícone `Lock` (Lucide) + `Acesso por e-mail e senha` (ou ícone Google + `Conta Google Vinculada` quando aplicável).
  - Ambos estruturados em div inline com alinhamento à direita.

---

## 3. Conformidade de Temas (Light e Dark)

- **Versão Light**: Card em `#FFFFFF` com bordas sutis `border-zinc-200`, textos e ícones em escala zinc suave (`#52525B` e `#262626`).
- **Versão Dark**: Preservada integralmente com `dark:bg-neutral-900`, `dark:border-neutral-800` e tipografia `dark:text-white` / `dark:text-neutral-400`.

---

## 4. Arquivos Envolvidos
- `src/pages/BarbershopAdmin/UserProfileView.jsx`
- `src/pages/BarbershopAdmin/UserProfileView.styles.js`
- `src/components/ui/Avatar.jsx`
- `src/components/ui/Avatar.styles.js`
- `docs/analise-ux-header-meu-perfil.md`
