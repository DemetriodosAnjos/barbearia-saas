# Release Notes - Barbearia SaaS v1.5.4.5

**Data de Lançamento**: Outubro de 2026  
**Status**: Homologado & Ativo  
**Módulos**: Componente Navbar (`src/components/ui/Navbar.jsx`, `src/components/ui/Navbar.styles.js`), Seletor de Tema (`src/components/ui/ThemeToggle.jsx`, `src/components/ui/ThemeToggle.styles.js`), Folha de Estilos Global (`src/index.css`), Metadados do Applet (`metadata.json`, `index.html`), Documentação Técnica (`docs/analise-ux-navbar-theme-dark-mobile.md`)

---

## 🎯 Principais Atualizações da Versão 1.5.4.5

### 1. Refinamento de UI: Versão Mobile First (Dark Theme) na Navbar
* **Seletor Theme Toggle no Modo Escuro**:
  * Substituído o indicador ativo de verde para **Âmbar Nobre (`#d97706` / `dark:bg-amber-600`)**.
  * Ícone da **Lua configurado na cor branca pura (`#ffffff`)** com stroke forçado em alta especificidade.
  * Otimizada a visibilidade do componente para dispositivos móveis (`inline-flex`).
* **Preservação Integral da Versão Light**:
  * No modo claro (`html:not(.dark)`), o seletor Theme Toggle preserva a **elipse verde esmeralda (`#059669`)** e o ícone do Sol em branco (`#ffffff`), sem qualquer interferência da paleta âmbar no tema claro.

### 2. Avatar da Navbar: Miniatura do Header de "Meu Perfil"
* **Conformidade de Design no Dark Theme**:
  * O avatar do usuário na barra superior da versão dark (`hidden dark:flex`) passa a renderizar a mesma miniatura do **Header de "Meu Perfil"** (`<Avatar />` tamanho `sm`, `w-8 h-8`):
    * Suporte automático para imagem personalizada carregada pelo usuário (`avatarSrc`) ou fallback determinístico de iniciais estilizado.
    * Indicador de presença suave (`showStatusRing={false}`, elipse verde sem anel de corte preto).
* **Versão Light Intacta**:
  * No modo claro (`dark:hidden`), a Navbar mantém seu avatar original (`navbarStyles.avatar`, `rounded-lg`, fundo `#F4F4F5` e borda `#D4D4D8`).

### 3. Sincronização de Metadados e Documentação
* Atualizado `metadata.json` e `<title>` / `<meta property="og:title">` em `index.html` para `SaaS V1.5.4.5`.
* Criada documentação técnica detalhada em `docs/analise-ux-navbar-theme-dark-mobile.md`.
