# LOG DE ALTERAÇÕES E MANUTENÇÃO

Consulte o arquivo [`STATUS.md`](./STATUS.md) para o histórico completo e detalhado das manutenções, tipos adicionados e arquivos modificados.

## Registro Resumido da Última Atualização (2026-10-18)
- **Tarefa**: [Bug/Auth] Corrigir ReferenceError (TDZ/Circular Dependency) no componente Diretório de Clientes durante o login por E-mail/Senha.
- **Arquivos Alterados**:
  - `src/context/AuthContext.tsx`
  - `src/hooks/useClientsCount.ts`
  - `src/pages/BarbershopAdmin/ClientsDirectoryView.jsx`
  - `src/security/authSecurityService.js`
  - `src/App.jsx`
  - `src/services/api.ts`
  - `STATUS.md`
- **Tipos Adicionados**:
  - `setAuthUser?: (user: AuthUser | null) => void;` adicionado à interface `AuthContextType`.
- **Status do Build**: Compilação e tipagem validadas com 100% de sucesso.
