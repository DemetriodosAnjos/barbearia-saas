# Análise de UX & Design System: Estados das Abas do Componente Configurações da Barbearia

## 1. Visão Geral

Este documento formaliza a padronização visual dos estados interativos (Default, Hover e Ativo) nas 4 abas centrais de navegação do **Componente Configurações da Barbearia** (`BarbershopSettingsView.jsx`):
1. **Estabelecimento** (`estabelecimento`)
2. **Regras de Agenda** (`agendamento`)
3. **Funcionamento** (`horarios`)
4. **Notificação WhatsApp** (`whatsapp`)

> **Observação Importante:** As regras cromáticas abaixo são aplicadas exclusivamente à **Versão Light** (`html:not(.dark)`). A **Versão Dark** (`html.dark`) mantém integralmente suas cores nativas (destaques em âmbar, textos neutros e bordas escuras).

---

## 2. Matriz de Estados Interativos (Versão Light)

| Elemento | Estado Default | Estado Hover (Mouse sobre a aba) | Estado Ativo (Aba selecionada) |
| :--- | :--- | :--- | :--- |
| **TÍTULOS** | `#52525B` (Zinc escuro suave) | `#262626` (Preto carvão / Chumbo) | `#059669` (Verde Esmeralda - Negrito) |
| **ÍCONES** | `#52525B` (Zinc escuro suave) | `#262626` (Preto carvão / Chumbo) | `#059669` (Verde Esmeralda) |
| **LINE (Borda inferior)** | `#52525B` (Zinc escuro suave) | `#059669` (Verde Esmeralda) | `#059669` (Verde Esmeralda) |

---

## 3. Ícones Oficiais (Biblioteca Lucide)

Cada aba agora integra diretamente os componentes de ícones da biblioteca `lucide-react`, eliminando qualquer exibição de nomes em texto puro:

- **Estabelecimento**: `<Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />`
- **Regras de Agenda**: `<Clock className="w-4 h-4 shrink-0" aria-hidden="true" />`
- **Funcionamento**: `<Calendar className="w-4 h-4 shrink-0" aria-hidden="true" />`
- **Notificação WhatsApp**: `<MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />`

---

## 4. Comportamento e Detalhes de Implementação

1. **Estado Default (Em Repouso na Versão Light)**:
   - Título na cor `#52525B`.
   - Ícone Lucide com stroke e cor em `#52525B`.
   - Linha inferior indicadora de 2px de espessura com borda na cor `#52525B`.

2. **Estado Hover (Ao passar o cursor na Versão Light)**:
   - Título transiciona para `#262626`.
   - Ícone Lucide transiciona para `#262626`.
   - Linha inferior indicadora transiciona para o verde esmeralda `#059669`.

3. **Estado Ativo (Aba Selecionada na Versão Light)**:
   - Título destacado em `#262626` com peso tipográfico `font-bold`.
   - Ícone Lucide iluminado no tom de marca verde esmeralda `#059669`.
   - Linha inferior indicadora permanece em `#059669`.
   - Mesmo com o mouse sobre a aba ativa, o ícone e a linha mantêm `#059669`.

4. **Versão Dark (Inalterada)**:
   - No tema escuro (`html.dark`), a aba ativa preserva o padrão âmbar (`text-amber-400`, `border-amber-500`), a aba inativa preserva `text-neutral-400` e a linha inativa preserva `border-transparent` / `hover:border-neutral-700`.

---

## 5. Arquivos Envolvidos
- `src/pages/BarbershopAdmin/BarbershopSettingsView.jsx`
- `src/components/ui/Tabs.jsx`
- `src/components/ui/Tabs.styles.js`
- `src/index.css`
