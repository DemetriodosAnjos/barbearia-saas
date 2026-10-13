# Release Notes - Barbearia SaaS v1.5.3.3

**Data de Lançamento**: Outubro de 2026  
**Status**: Homologado & Ativo  
**Módulos**: Meu Perfil, Segurança & Acesso, Encerramento de Sessão e UX de Logout

---

## 🎯 Principais Atualizações da Versão 1.5.3.3

### 1. Desconexão de Sessões com Modal Oficial de Confirmação
- **Aba Segurança & Acesso**: Adicionado o link e botão **"Desconectar"** para o dispositivo atual (`Conectado Agora`) e para os dispositivos remotos conectados.
- **Modal "Encerrar Sessão"**: O clique em *"Desconectar"* aciona o modal oficial de encerramento de sessão já padronizado no projeto (título *"Encerrar Sessão"*, aviso claro sobre a necessidade de redigitar as credenciais, opções *"Cancelar"* e *"Sim, pode sair!"*).

### 2. Reset de Estado do Aparelho e Redirecionamento para Login
- **Dispositivo Local**: Ao confirmar a saída, o estado local é completamente sanitizado (`saas_auth_user`, `access_token`, `saas_jwt_access_token`, `saas_active_session_id`), o token no Supabase Auth é revogado e o usuário é redirecionado instantaneamente para a tela de login.
- **Dispositivos Remotos**: A revogação em banco (`is_active = false`) propaga evento em tempo real via Supabase Realtime e heartbeat em segundo plano. O aparelho desconectado remotamente identifica a revogação em menos de 1 segundo, limpa seu armazenamento e direciona o usuário à tela de login.

### 3. Sincronização de Metadados e Versionamento
- Atualização e alinhamento de versão para **v1.5.3.3** em `metadata.json`, `index.html` (`<title>` e `<meta property="og:title">`) e documentações do projeto.
