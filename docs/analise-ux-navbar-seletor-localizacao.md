# Análise de UX e Refinamento Técnico: Seletor de Unidade na Navbar

## 1. Visão Geral do Refinamento
O seletor de unidade da barra de navegação superior (**Navbar**), identificado pelo ícone de seta/dropdown (**Chevron Down**), agora busca dinamicamente a **localização exata da barbearia** cadastrada pelo gestor em:
> **Meu Perfil** ➔ **Aba: Contato & Endereço** (`neighborhood`, `city`, `state`).

---

## 2. Regras de Formatação e Nomenclatura da Unidade
O utilitário centralizador `src/utils/unitLocation.js` implementa as seguintes regras de formatação:

1. **Bairro e Estado (UF) informados (Prioridade Máxima):**
   - Formato: `Unidade [Bairro] - [UF]`
   - Exemplo clássico do sistema: `Unidade Jardim - SP`, `Unidade Batel - PR`, `Unidade Savassi - MG`.
2. **Bairro e Cidade (quando sem UF):**
   - Formato: `Unidade [Bairro] - [Cidade]`
   - Exemplo: `Unidade Jardim - São Paulo`, `Unidade Centro - Maringá`.
3. **Apenas Bairro informado:**
   - Formato: `Unidade [Bairro]`
4. **Apenas Cidade e UF informados:**
   - Formato: `Unidade [Cidade] - [UF]`
   - Exemplo: `Unidade Curitiba - PR`.
5. **Fallback padrão (antes de qualquer cadastro de endereço):**
   - Rótulo amigável: `Unidade Jardim - SP` (ou nome fantasia cadastrado no tenant).

---

## 3. Hierarquia de Resolução de Dados (SSOT)
Para garantir resiliência e integridade em recarregamentos de página (F5) e trocas de rota:

1. **Objeto do Estabelecimento (`tenant`):** Dados ativos da tabela `public.tenants` no Supabase (`neighborhood`, `city`, `state`, `cep`, `street`, `number`).
2. **Metadados de Autenticação (`user.user_metadata`):** Dados de sessão do Supabase Auth gravados no momento do salvamento do perfil.
3. **Tabela Relacional `public.profiles`:** Consulta assíncrona dos campos de endereço atrelados ao ID do gestor.
4. **Cache Local Seguro (`safeStorage`):** Chaves `saas_active_tenant` e `saas_auth_user` para carregamento instantâneo com latência zero (Zero Layout Shift).

---

## 4. Reatividade em Tempo Real (Sem necessidade de recarregar a página)
Ao salvar alterações na aba **Contato & Endereço** do componente `UserProfileView.jsx`:
- O evento customizado `saas:tenant-address-updated` é disparado no `window`.
- A `Navbar.jsx` escuta o evento via `useEffect` e atualiza instantaneamente o estado `currentUnitName`.
- O cache do `safeStorage` é atualizado em paralelo.
- A função de callback do pai (`onUpdateTenant`) propaga o novo tenant para toda a árvore de componentes.

---

## 5. Acessibilidade e Estilo Visual (Chevron Down)
- O seletor utiliza o componente `ProjectIcon` com o ícone oficial `ChevronDown` posicionado à direita de forma harmoniosa com o design system neutro/dark.
- Suporte a navegação por teclado (`Tab`, setas para cima/baixo e `Enter`).
- Atributos `aria-label="Selecionar Filial ou Unidade"` e `title` informativo com o endereço atual.
