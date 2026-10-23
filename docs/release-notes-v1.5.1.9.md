# Notas de Versão: SaaS V1.5.1.9

> **Data de Lançamento:** Outubro de 2026  
> **Status:** Produção Homologada & Git Sincronizado  
> **Versão Oficial:** `SaaS V1.5.1.9`

---

## 🎯 Resumo da Versão

A versão **V1.5.1.9** consolida correções críticas de segurança da informação (Zero-Hardcode Credentials Policy), aprimoramentos na experiência de autenticação do usuário, e a padronização visual da versão na barra lateral de navegação.

---

## 🔒 1. Segurança & Eliminação de Chaves Expostas (SecOps)

- **Sanitização de Stores de Configuração:**
  - Auditados e completamente limpos os arquivos `src/services/apiKeysConfigStore.ts` e `src/services/mercadoPagoConfigStore.ts`.
  - Removidas todas as chaves, tokens e segredos (tanto credenciais reais quanto placeholders/falsos) que se encontravam estaticamente gravados no código-fonte.
  - O sistema agora adota a resolução estritamente dinâmica em tempo de execução via variáveis de ambiente (`import.meta.env` / `process.env`), sincronização do `.env` ou storage local isolado.
- **Proteção Git e Bundle Leakage:**
  - Confirmação de que o arquivo `.env` está estritamente protegido pelo `.gitignore`.
  - Zero risco de vazamento de chaves privadas em builds de produção ou repositórios públicos.

---

## 🔑 2. Aprimoramentos na Tela de Login (`Login.jsx`)

- **Identidade Visual:**
  - Título do formulário atualizado para **"Barbearia SaaS"**.
- **Proteção Anti-Robô (Cloudflare Turnstile):**
  - O desafio de segurança agora exige **ativação por clique do mouse** do usuário, eliminando auto-verificações antecipadas em tela.
  - Validação obrigatória do token antes de permitir o envio das credenciais.
- **Hierarquia de Ações:**
  - Botão **"Entrar com o Google"** (OAuth Supabase) reposicionado imediatamente abaixo do botão primário **"Entrar na Plataforma"**.
  - Removido o botão de teste de desenvolvedor ("Testar como Dono da Barbearia") da interface pública de login.

---

## 🎨 3. Navegação & Sidebar (`Sidebar.jsx`)

- **Exibição Centralizada da Versão:**
  - O rodapé da barra lateral agora conta com um bloco dedicado para centralizar a versão ativa (`text-center` e `justify-center`), sincronizada diretamente com o `metadata.json` (`SaaS V1.5.1.9`).
  - Tanto no modo expandido quanto no modo recolhido (`V1.5.1.9`), a versão permanece perfeitamente alinhada e legível.

---

## 📋 Arquivos Modificados / Criados

- `metadata.json`: Atualizado para `"SaaS V1.5.1.9"`.
- `index.html`: Sincronizado com título e metadados OpenGraph `SaaS V1.5.1.9`.
- `src/components/ui/Sidebar.jsx`: Layout centralizado da versão no rodapé.
- `src/services/apiKeysConfigStore.ts`: Remoção completa de credenciais expostas.
- `src/services/mercadoPagoConfigStore.ts`: Remoção completa de credenciais expostas.
- `src/pages/Auth/Login.jsx`: Título, Turnstile por clique e layout de botões.
- `docs/00-project-context.md`: Atualizado para versão V1.5.1.9.
- `docs/module-sidebar-navigation.md`: Atualizado com documentação da versão centralizada.
- `docs/build-security-checklist.md`: Adicionado item de auditoria de stores zero-hardcode.
- `docs/release-notes-v1.5.1.9.md`: Documento de Release Notes da versão.
- `README.md`: Documentação principal atualizada.
