# Análise de UX & Design System: Estados das Abas do Componente Meu Perfil

## 1. Visão Geral

Este documento formaliza a padronização visual dos estados interativos (Default, Hover e Ativo) nas 4 abas centrais de navegação do **Componente Meu Perfil** (`UserProfileView.jsx`):
1. **Dados Pessoais** (`pessoal`)
2. **Contato & Endereço** (`contato`)
3. **Perfil & Chave PIX** (`profissional`)
4. **Segurança & Acesso** (`seguranca`)

---

## 2. Matriz de Estados Interativos

| Elemento | Estado Default | Estado Hover (Mouse sobre a aba) | Estado Ativo (Aba selecionada) |
| :--- | :--- | :--- | :--- |
| **TÍTULOS** | `#52525B` (Zinc escuro suave) | `#262626` (Preto carvão / Chumbo) | `#059669` (Verde Esmeralda) |
| **ÍCONES** | `#52525B` (Zinc escuro suave) | `#262626` (Preto carvão / Chumbo) | `#059669` (Verde Esmeralda) |
| **LINE (Borda inferior)** | `#52525B` (Zinc escuro suave) | `#059669` (Verde Esmeralda) | `#059669` (Verde Esmeralda) |

---

## 3. Comportamento e Detalhes de Implementação

1. **Estado Default (Em Repouso)**:
   - A aba não selecionada exibe o título em `#52525B`.
   - O ícone vetorial (`ProjectIcon`) herda `#52525B`.
   - A linha inferior indicadora possui 2px de espessura com borda na cor `#52525B`.

2. **Estado Hover (Ao passar o cursor)**:
   - O título transiciona para `#262626`.
   - O ícone transiciona para `#262626`.
   - A linha inferior indicadora transiciona para o verde `#059669`.

3. **Estado Ativo (Aba Clicada / Selecionada)**:
   - O título permanece destacado em `#262626` (com peso tipográfico `font-bold`).
   - O ícone é iluminado no tom de marca verde esmeralda `#059669`.
   - A linha inferior indicadora permanece em `#059669` sinalizando a ancoragem na aba atual.
   - Mesmo com o mouse sobre a aba ativa, o ícone e a linha continuam exibindo `#059669`.

---

## 4. Arquivos Envolvidos
- `src/pages/BarbershopAdmin/UserProfileView.jsx`
- `src/components/ui/Tabs.jsx`
- `src/components/ui/Tabs.styles.js`
- `src/index.css`
