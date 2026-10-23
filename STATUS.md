# STATUS & HISTÓRICO DE MANUTENÇÃO DO SISTEMA

## [2026-10-18] Correção de ReferenceError (TDZ / Circular Dependency) no Diretório de Clientes durante Login E-mail/Senha

### 1. Resumo da Alteração
- **Problema**: O login via Google OAuth funcionava, mas o login por **E-mail e Senha** causava exceção `ReferenceError: Cannot access 'f' before initialization` no Error Boundary de 'Diretório de Clientes'.
- **Causa Raiz**:
  1. Acesso prematuro ao estado de sessão e dados do usuário antes da resolução assíncrona do Supabase Auth no fluxo de e-mail/senha.
  2. Declarações de estado (`useState`) dispersas ao longo do componente `ClientsDirectoryView`, gerando TDZ (Temporal Dead Zone) durante a inicialização minificada.
  3. Falta de loading guards no hook `useClientsCount` e na renderização principal do `ClientsDirectoryView`.
- **Solução**:
  1. Implementação de Loading Guard estrito no `AuthContext` e hidratação imediata via `safeStorage` e evento customizado `saas:auth-state-changed`.
  2. Adição de guarda de carregamento no hook `useClientsCount` aguardando a hidratação completa de `user` e `tenant_id`.
  3. Unificação de todos os hooks `useState` no topo de `ClientsDirectoryView` e inserção de Loading Guard bloqueante antes de cálculos derivados.

---

### 2. Arquivos Modificados
- `src/context/AuthContext.tsx`
  - Hidratação defensiva inicial do estado (`accessToken` e `user`) via `safeStorage`.
  - Inclusão de escuta aos eventos `saas:auth-state-changed` e `storage` para sincronização reativa imediata.
  - Suporte ao método `setAuthUser` no contexto.
  - Fallback síncrono no hook `useAuth()` para leitura imediata de `saas_auth_user` em transições rápidas de tela.
- `src/hooks/useClientsCount.ts`
  - Checagem estrita de carregamento em `fetchCountFromSupabase`: bloqueio de chamadas à API enquanto `options.loading` for verdadeiro ou `options.user` estiver indefinido sem tenant resolvido.
  - Efeitos de montagem e canal Realtime protegidos contra execução prematura.
  - Indicador `isLoading` refletindo fielmente a pendência de autenticação do usuário.
- `src/pages/BarbershopAdmin/ClientsDirectoryView.jsx`
  - Agrupamento de todas as declarações de estado (`useState`) no topo do componente, respeitando as regras do React e eliminando TDZ.
  - Inserção de Loading Guard logo após a declaração dos hooks (`if (isAuthHydrating) return <LoadingSpinner />`), prevenindo erros ao acessar métodos secundários.
  - Remoção de verificação tardia redundante.
- `src/security/authSecurityService.js`
  - Disparo de evento `saas:auth-state-changed` após persistência da sessão no `safeStorage` no login por e-mail/senha.
- `src/App.jsx`
  - Disparo de evento `saas:auth-state-changed` no callback `onLoginSuccess`.
- `src/services/api.ts`
  - Acesso seguro via optional chaining a `import.meta.env?.VITE_API_URL` com fallback para `'/api'` evitando `TypeError` em ambientes isolados de teste.

---

### 3. Novas Dependências ou Tipos Adicionados
- **Novas Dependências npm**: Nenhuma (zero dependências adicionais).
- **Tipos Adicionados / Expandidos**:
  - `AuthContextType` (`src/context/AuthContext.tsx`):
    - Adicionado método opcional: `setAuthUser?: (user: AuthUser | null) => void;`

---

### 4. Assinaturas de Funções Alteradas
- Nenhuma assinatura pública existente foi alterada de maneira que quebrasse compatibilidade retroativa:
  - `useClientsCount(tenantOrId?: string | { id?: string } | null, initialClients?: any[], options?: UseClientsCountOptions): UseClientsCountResult` manteve a mesma assinatura, com comportamento interno seguro com guards adicionais.
  - `ClientsDirectoryView` manteve todas as props originais (`clientsList`, `onUpdateClients`, `onUpdateClient`, `onNavigateToBooking`, `onBack`, `tenant`, `barbers`, `appointments`, `onUpdateAppointments`).
  - `useAuth(): AuthContextType` manteve o contrato original com o novo helper `setAuthUser`.

---

### 5. Validação e Testes
- Compilação via Vite e TypeScript (`npm run lint` / `tsc --noEmit`): **SUCESSO (0 erros)**
- Build de produção (`npm run build`): **SUCESSO (dist gerado)**
- Verificação de compilação da plataforma (`compile_applet`): **SUCESSO**
