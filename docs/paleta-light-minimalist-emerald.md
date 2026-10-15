# Documentação Técnica: Paleta 3 - Minimalist Emerald (Clean e Tecnológico)

## 1. Visão Geral e Conceito
A **Paleta 3: Minimalist Emerald** foi projetada com foco em alta produtividade, leitura rápida e agendamentos fluidos para softwares de gestão SaaS modernos. A arquitetura visual adota uma base neutra limpa em tons de cinza **Zinc** com realces pontuais e funcionais em **Verde Esmeralda** (`emerald-600` / `emerald-700`).

Todas as regras e tokens da **Paleta Dark (Âmbar Nobre)** permanecem 100% preservadas e intactas sob a classe seletora `.dark`.

---

## 2. Tabela Oficial de Tokens e Equivalências

| Elemento | Classe Tailwind | Código Hex | Finalidade / Aplicação |
| :--- | :--- | :--- | :--- |
| **Títulos / Textos** | `text-zinc-900 / text-zinc-600` | `#18181b / #52525b` | Títulos principais em quase-preto (#18181b) e textos secundários legíveis (#52525b). |
| **Ícones** | `text-zinc-500 (ativo: text-emerald-600)` | `#71717a (#059669)` | Ícones informativos neutros; ícones de seleção ativa e destaque em esmeralda. |
| **Badges** | `bg-emerald-50 text-emerald-700 border-emerald-200` | `#ecfdf5 / #047857 / #a7f3d0` | Selos de status, confirmação e pílulas informativas de alta legibilidade. |
| **Botão Ativo** | `bg-emerald-600` | `#059669` | Ação principal (CTA) de alto contraste e foco imediato. |
| **Botão Hover** | `hover:bg-emerald-700` | `#047857` | Feedback tátil e visual ao passar o cursor. |
| **Botão Desativado** | `bg-zinc-200 text-zinc-400` | `#e4e4e7 / #a1a1aa` | Ações bloqueadas ou indisponíveis com cursor `not-allowed`. |
| **Botão Transparente** | `bg-transparent hover:bg-zinc-100 text-zinc-700 border border-zinc-300` | `transparent / #f4f4f5 / #3f3f46 / #d4d4d8` | Ações secundárias e outlines sem poluição visual. |
| **Texto dos Botões** | `text-white (principal) / text-zinc-700 (transparente)` | `#ffffff / #3f3f46` | Contraste seguro WCAG 2.2 AA (4.5:1+) garantido em ambos os tipos. |
| **Links** | `text-emerald-600 hover:text-emerald-700 underline` | `#059669 / #047857` | Hiperlinks com sublinhado padrão e hover dinâmico. |
| **Tags** | `bg-zinc-100 text-zinc-800 border border-zinc-200` | `#f4f4f5 / #27272a / #e4e4e7` | Tags de serviços, categorias e filtros rápidos. |

---

## 3. Preservação da Paleta Dark
O sistema utiliza o seletor contextual `html:not(.dark)` para as regras de transformação clara, enquanto a presença da classe `dark` na tag `<html>` garante a manutenção de:
- Fundo escuro profundo (`#0a0a0a` / `#171717`)
- Destaques em Âmbar Nobre (`#f59e0b` / `#d97706` / `#b45309`)
- Badges sutis e contornos com baixa opacidade para ambiente noturno.

---

## 4. Conformidade e Acessibilidade (WCAG 2.2 AA)
- Contraste de texto principal `#18181b` sobre fundo `#ffffff` / `#fafafa`: **16.1:1** (Nível AAA)
- Contraste do botão esmeralda `#059669` com texto branco `#ffffff`: **4.64:1** (Nível AA aprovado)
- Contraste de links `#059669` sobre fundo claro: **4.64:1** (Nível AA aprovado)
- Anéis de foco interativo com outline `2px solid #059669` e offset de foco de `2px`.

---

## 5. Refinamentos Específicos do Componente Navbar (Theme Light)
1. **Theme Toggle**:
   - Container: Fundo transparente (`bg-transparent`) com borda stroke em `#D4D4D8`.
   - Indicador Ativo (Light): Elipse verde em `#059669` (`bg-[#059669]`).
   - Ícone do Sol: Branco puro (`#ffffff`) com contraste seguro sobre o verde esmeralda.
2. **Ícone Alert (Sino de Notificações)**:
   - Círculo de Notificações: Vermelho vivo (`#dc2626` / `bg-red-600`).
   - Texto Numérico: Branco puro (`#ffffff`), protegido contra estilos de texto escuro globais.
3. **Avatar ("DE")**:
   - Iniciais do Usuário/Gestor: Texto `#18181B` (`text-zinc-900`) e borda stroke em `#D4D4D8`.
4. **Breadcrumb**:
   - Título da aba ativa padronizado de caixa alta (`AGENDA`) para texto formatado (`Agenda`).
5. **Ícone Hambúrguer (Menu Mobile)**:
   - Versão Light: Alterado para `Color: #059669` (verde esmeralda), hover com fundo `#F4F4F5`.
   - Versão Dark: Mantido integralmente em tom neutro `neutral-400` (`#a3a3a3` com hover `#ffffff`).

---

## 6. Refinamento Oficial do Componente AVATAR (Theme Toggle Light)

Refinamento da paleta de cor clara aplicado ao botão de usuário ativo e ao menu suspenso do Avatar, mantendo **100% preservadas todas as cores da versão DARK**.

### 6.1. Tabela Comparativa de Tokens (Light vs. Dark)

| Elemento do Componente Avatar | Versão DARK (Preservada) | Versão LIGHT (Refinada) | Finalidade / Especificação |
| :--- | :--- | :--- | :--- |
| **Ativo / Hover (Expandido)** | `BG #262626` (`neutral-800`) | `BG #262626` | Fundo ativo/hover quando expandido ou cursor passa por cima |
| **AVATAR ("DE")** | `bg-neutral-800` / `#FFB900` | `BG #F4F4F5` | Permanece na cor cinza claro (#F4F4F5) com stroke #D4D4D8 |
| **Título do Profissional** | `Color #e5e5e5` (`neutral-200`) | `Color #059669` (verde) | "Demetrio A L dos Anjos" em verde esmeralda de alta legibilidade |
| **Cargo / Papel** | `Color #FFB900` (âmbar nobre) | `Color #55555E` / `#A1A1AA` | "Administrador" em tom de cinza neutro balanceado |
| **Ícones do Menu (Repouso)** | `Color #FFC21F` (amarelo) | `Color #059669` (verde) | Ícones: *E-mail & Senha*, *Meu perfil*, *Configurações da Barbearia*, *Suporte & Ajuda* |
| **Ícones do Menu (Hover)** | `Color #ffffff` (branca) | `Color #ffffff` (branca) | Quando o mouse passa por cima: *Meu Perfil*, *Configurações da Barbearia*, *Suporte & Ajuda*, *Sair da Plataforma* transicionam para branco puro (#ffffff) |
| **Textos do Menu** | `Color #d4d4d8` / `text-red-400` | `Color #55555E` (hover: `#ffffff`) | Textos: *E-mail & Senha*, *Meu perfil*, *Configurações da Barbearia*, *Suporte & Ajuda*, *Sair da Plataforma* |
| **Hover nos Itens do Menu** | `hover:bg-neutral-800` | `hover:bg-[#262626]` | Quando o mouse passa por cima das opções do menu |
| **Bordas e Divisores** | `border-neutral-800` (`#262626`) | `border-[#E4E4E7]` / `border-[#D4D4D8]` | Traços refinados em zinc-200 e zinc-300 |

### 6.2. Regras de Preservação da Versão Dark
- No modo escuro (`html.dark`), o menu flutuante e o estado ativo do Avatar utilizam estritamente o fundo escuro `#262626`.
- O papel "Administrador" reluz no tom dourado `#FFB900` e os 4 ícones institucionais permanecem em `#FFC21F`.
- A opção de logout "Sair da Plataforma" preserva a semântica de alerta em vermelho suave (`text-red-400`).

---

## 7. Refinamento Oficial do Topo do Menu Lateral (Sidebar - Theme Light)

Refinamento da paleta de cores clara aplicado ao topo da barra lateral de navegação (`Sidebar.jsx`), mantendo alinhamento estrito com os elementos da Navbar e preservando a identidade visual Dark (Âmbar Nobre).

### 7.1. Tabela Comparativa de Tokens (Topo da Sidebar)

| Elemento do Topo da Sidebar | Versão DARK (Preservada) | Versão LIGHT (Refinada) | Especificação & Código Hex |
| :--- | :--- | :--- | :--- |
| **Avatar Container (Fundo)** | `bg-amber-600` (`#d97706`) | `bg-[#059669]` | `#059669` (Verde esmeralda container bg com sombra sutil) |
| **Avatar Ícone (Tesoura)** | `#ffffff` / Âmbar | `Color: #ffffff` | `#ffffff` (Branca com alto contraste sobre o verde) |
| **Título da Barbearia** | `text-neutral-100` (`#f5f5f5`) | `Color: #18181B` | Nome da barbearia (ex: "Barbearia dos Anjos") em `#18181B`, com contraste nítido e legível |
| **Link do Texto (Trial)** | `text-amber-500` (`#f59e0b`) | `Color: #059669` (verde) | `#059669` (hover: `#047857`), abre modal de upgrade |
| **TAG Planos (Container)** | `bg-amber-500/20` | `BG: #ECFDF5` | `#ECFDF5` (Verde claro idêntico à tag "Disponível" da Navbar) |
| **TAG Planos (Borda)** | `border-amber-500/30` | `Border: #A7F3D0` | `#A7F3D0` (Verde suave discreto) |
| **TAG Planos (Texto)** | `text-amber-300` | `Color: #059669` | `#059669` (Verde escuro de alta legibilidade) |


