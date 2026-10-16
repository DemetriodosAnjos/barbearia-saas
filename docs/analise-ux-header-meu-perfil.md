# Análise de UX & Design System: Refinamento do Header (Meu Perfil)

## 1. Visão Geral

Este documento formaliza o refinamento visual e estrutural do cabeçalho de identificação rápida no **Componente Meu Perfil** (`UserProfileView.jsx`), garantindo limpeza visual, harmonia espacial e conformidade estrita entre as versões Light e Dark do SaaS.

---

## 2. Estrutura Visual do Card Container

O cabeçalho é montado em um **CARD (Container Branco #FFFFFF)** na versão Light:
- **Fundo**: `#FFFFFF` puro no Light Theme (`html:not(.dark) .profile-header-card`).
- **Stroke (Contorno)**: **Removido** na versão Light (`border-0` e `border: none !important;`), eliminando qualquer linha ou traço ao redor do container pai.
- **Versão Dark**: Preservada integralmente com `dark:bg-neutral-900` e `dark:border-neutral-800`.

### DIV 1 - Alinhado à Esquerda do Card Container
1. **Avatar com Elipse Verde**:
   - Preserva o indicador de status presencial verde com animação piscante (`animate-pulse`).
   - Remove o contorno preto (`stroke`/`ring-neutral-950`), exibindo a elipse suave diretamente sobreposta ao avatar.
2. **Título do Profissional**:
   - Exibe o nome completo do profissional (ex: "Demetrio A L dos Anjos" / "Deme Frost"), centralizado verticalmente com o Avatar.
   - Cor no Light Theme: `#18181B` (`.profile-header-text-dark`).
   - Removido o texto redundante entre parênteses que ficava ao lado do título (ex: "(Deme Frost)").
3. **Identificação de Papel e Apelido**:
   - Disposto em linha (`div inline`) logo abaixo do título:
     `Administrador • Apelido: Deme Frost`
   - **Administrador**: Cor `#059669` (verde esmeralda) na versão Light via classe `.profile-header-role` / `[data-profile-header-role]`.
   - **Separador**: Elipse suave em `#18181B/40`.
   - **Apelido** (rótulo e valor): Cor `#18181B` no Light Theme (`.profile-header-text-dark`).

### DIV 2 - Link Superior Direito: "Voltar ao Painel"
- **Posicionamento**: Canto superior direito do card, alinhado ao topo.
- **Estrutura**: Ícone `ArrowLeft` da biblioteca Lucide + texto `Voltar ao Painel`.
- **Estado Default (Light)**: Cor `#18181B` para o ícone e para o texto (`.profile-back-button`).
- **Estado Hover (Light)**: Cor `#059669` (verde) simultaneamente para o ícone e para o texto quando o mouse passa por cima (`hover:text-[#059669]`).
- **Limpeza de Estilo**:
  - **Sem contorno (stroke)**: `border: 0 !important;` e `outline: none !important;`.
  - **Sem BG hover**: `background: transparent !important;` em todos os estados, sem qualquer fundo acinzentado ao interagir.

### DIV 3 - Alinhado no Canto Direito na Base (Bottom)
- Posicionado na base inferior direita do card container, logo abaixo do link "Voltar ao Painel":
  - **Elemento 1**: Ícone `Mail` (Lucide) + email do usuário (ex: `ddoanjos@gmail.com`) na cor `#18181B` no Light Theme (`.profile-header-icon-dark` e `.profile-header-text-dark`).
  - **Elemento 2**: Ícone `Lock` (Lucide) + texto `Acesso por e-mail e senha` (ou ícone Google + `Conta Google Vinculada`) na cor `#18181B` no Light Theme.
  - Ambos estruturados em div inline com alinhamento à direita.

---

## 3. Conformidade de Temas (Light e Dark)

- **Versão Light**:
  - Container pai: `#FFFFFF` sem contorno (`border-0`).
  - Papel Administrador: `#059669` (verde esmeralda).
  - Título, apelido, e-mail, método de acesso e ícones: `#18181B`.
  - Botão Voltar ao Painel: `#18181B` (default) -> `#059669` (hover), 100% transparente sem bordas.
- **Versão Dark**:
  - Preservada integralmente com `dark:bg-neutral-900`, `dark:border-neutral-800` e tipografia `dark:text-white` / `dark:text-neutral-400`.

---

## 4. Arquivos Envolvidos
- `src/pages/BarbershopAdmin/UserProfileView.jsx`
- `src/pages/BarbershopAdmin/UserProfileView.styles.js`
- `src/index.css`
- `src/components/ui/Avatar.jsx`
- `src/components/ui/Avatar.styles.js`
- `docs/analise-ux-header-meu-perfil.md`
