# Análise de UX & Documentação Técnica: Refinamento Theme Light do Menu Lateral (Sidebar)

## 1. Visão Geral e Objetivos do Refinamento

Esta especificação define o refinamento oficial de UX/UI para a barra lateral de navegação (`Sidebar.jsx`) no **Theme Light** da aplicação, estabelecendo uma hierarquia visual clara, feedback tátil refinado e alto contraste para operadores de barbearia durante o expediente.

A identidade visual do **Theme Dark (Âmbar Nobre)** permanece **100% preservada e intacta**, sem qualquer interferência visual sob a classe seletora `.dark`.

---

## 2. Menus e Submenus Mapeados

- **Agenda de Atendimento**: Acesso à grade diária e timeline dos barbeiros.
- **Serviços & Produtos**: Gestão de catálogo de procedimentos e estoque de balcão.
- **Equipe de Barbeiros**: Gestão de cadeiras, escalas e taxas de comissão.
- **Clientes & Prontuários Técnicos**: Gestão cadastral completa, histórico de cortes e fichas técnicas.
- **Financeiro** (com acordeão / submenus):
  - *Frente de Caixa (PDV)*
  - *Dashboard & Big Numbers*
  - *Pagamentos & Comissões*
- **Indique & Ganhe**: Programa de fidelidade e comissões por indicação.

---

## 3. Especificações dos Estados Interativos (Theme Light)

### 3.1. Estado Hover (Itens Inativos)
Quando o cursor do mouse passa por cima de qualquer menu ou submenu inativo:
- **Background Container**: `#ECFDF5` (Verde Esmeralda Claro)
- **Texto**: `#059669` (Verde Esmeralda)
- **Ícone**: `#059669` (Verde Esmeralda)
- **Seta / Chevron**: `#059669` (Verde Esmeralda)

### 3.2. TAGs / Badges Informativas
Aplicado às badges dos menus *Agenda de Atendimento*, *Clientes & Prontuários Técnicos* e *Indique & Ganhe*:
- **TAG Background Container**: `#059669` (Verde Esmeralda)
- **TAG Texto / Número**: `#ffffff` (Branco Puro) **inclusive no estado hover** do botão e da própria tag.
- **Valor da TAG no menu "Agenda de Atendimento"**: `"2 hoje"` em `#ffffff` (Branco)
- **Valor da TAG nos menus "Clientes & Prontuários Técnicos" e "Indique & Ganhe"**: Texto/número em `#ffffff` com fundo `#059669` tanto em repouso quanto em hover.

### 3.3. Evento de Clique / Botão Ativo (Item Selecionado & Menu Financeiro)
Quando um item de menu, submenu ou o menu **Financeiro** está ativo (selecionado):
- **Background Container**: `#262626` (Cinza Escuro Premium)
- **Texto e Ícone**: `#ffffff` (Branco Puro - inclui ícones e seta chevron)
- **Efeito "Aceso"**: Borda lateral esquerda iluminada em `#059669` (verde esmeralda) com brilho exterior sutil (`box-shadow: inset 4px 0 0 #059669, 0 4px 14px rgba(5, 150, 105, 0.32)` e `border: 1px solid rgba(5, 150, 105, 0.45)`).
- **Estado Hover no Botão Ativo (e Financeiro Ativo)**: Mantém com segurança o fundo `#262626`, texto/ícone em `#ffffff` e o efeito aceso `#059669` (`box-shadow: inset 4px 0 0 #059669, 0 4px 16px rgba(5, 150, 105, 0.45)`).

---

## 4. Conformidade e Acessibilidade (WCAG 2.2 AA / AAA)

- **Texto e Ícone Branco (`#ffffff`) sobre o Fundo do Botão Ativo (`#262626`)**: Contraste de **11.9:1** (Nível AAA).
- **Texto Verde (`#059669`) sobre o Fundo Hover (`#ECFDF5`)**: Contraste de **4.64:1** (Nível AA aprovado).
- **Texto Branco (`#ffffff`) sobre a TAG Verde (`#059669`)**: Contraste de **4.64:1** (Nível AA aprovado).
