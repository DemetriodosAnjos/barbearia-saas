# Análise de UX & Documentação Técnica: Estado Hover dos Ícones do Menu Usuário / Administrador

## 1. Contexto e Diagnóstico

No menu suspenso do usuário (Avatar / Administrador no cabeçalho), ao passar o mouse por cima de cada opção (*hover*), o plano de fundo do item transiciona para um fundo escuro (`#262626`) e o texto para branco puro (`#ffffff`).

Anteriormente, os ícones mantinham a cor verde (`#059669` no Light) ou amarelo (`#FFC21F` no Dark) mesmo durante o hover, gerando inconsistência visual e menor contraste contra o fundo escuro `#262626` do item ativo/em foco.

### Itens Alvo
- **Meu Perfil** (`User`)
- **Configurações da Barbearia** (`Settings`)
- **Suporte & Ajuda** (`MessageSquare`)
- **Sair da plataforma** (`LogOut`)

---

## 2. Solução Implementada

1. **Transição de Cor dos Ícones no Hover para `#ffffff` (branca)**:
   - Aplicada a regra de alta especificidade no CSS global (`src/index.css`) garantindo que, quando o mouse passa sobre `.avatar-dropdown-item:hover` ou `:focus`, tanto o `color` quanto o `stroke` dos ícones SVG passem a ser `#ffffff !important`.
   - Adicionada a classe `group` nos botões em `src/components/ui/Navbar.jsx` e classes `group-hover:text-white group-focus:text-white transition-colors` nos componentes de ícone (`ProjectIcon`).
   - Identificado o ícone de logout com o atributo `data-user-dropdown-icon="sair"` para harmonização completa com o sistema de tokens.

2. **Harmonização Dual-Theme (Light & Dark)**:
   - **Modo Claro (`html:not(.dark)`)**:
     - Fundo no hover: `#262626`
     - Texto no hover: `#ffffff`
     - Ícone no hover: `#ffffff`
   - **Modo Escuro (`html.dark`)**:
     - Fundo no hover: `#3f3f46`
     - Texto no hover: `#ffffff`
     - Ícone no hover: `#ffffff`

---

## 3. Matriz de Estados dos Ícones

| Opção do Menu | Ícone Lucide | Estado Repouso (Light) | Estado Repouso (Dark) | **Estado Hover (Ambos os Temas)** |
| :--- | :--- | :--- | :--- | :--- |
| **Meu Perfil** | `User` | `#059669` (Verde) | `#FFC21F` (Amarelo) | **`#ffffff` (Branca)** |
| **Configurações da Barbearia** | `Settings` | `#059669` (Verde) | `#FFC21F` (Amarelo) | **`#ffffff` (Branca)** |
| **Suporte & Ajuda** | `MessageSquare` | `#059669` (Verde) | `#FFC21F` (Amarelo) | **`#ffffff` (Branca)** |
| **Sair da plataforma** | `LogOut` | `#EF4444` (Vermelho) | `#F87171` (Vermelho Claro) | **`#ffffff` (Branca)** |

---

## 4. Acessibilidade (WCAG 2.2 AA)
- Contraste do ícone branco `#ffffff` sobre o fundo `#262626`: **11.9:1** (Nível AAA, excelente legibilidade e feedback tátil).
