# Documentação de Negócio: Onboarding Quiz & Perfis de Usuário

## 1. Visão Geral
Este documento define as regras de negócio, arquitetura de personas e fluxo de onboarding pós-autenticação Google no Barber SaaS.

O objetivo é proporcionar uma experiência de entrada sem atritos para profissionais de beleza e donos de barbearia, eliminando questionários longos e direcionando o usuário diretamente para o cenário condizente com o seu modelo de trabalho.

---

## 2. Estrutura do Quiz de Onboarding (`OnboardingQuiz.jsx`)

Ao realizar o primeiro acesso através do botão **"Entrar com o Google"**, se o usuário for novo e ainda não possuir persona registrada no sistema, a aplicação exibe a tela do **Quiz de Onboarding**:

### 2.1 Identidade Visual e Textos Oficiais
- **Título**: `Olá seja bem-vindo ao barber saas`
- **Pergunta**: `Escolha um dos cenários abaixo que mais se encaixa com a sua realidade`
- **Componente de Escolha**: `Radio Button` com seleção única e acessível (`role="radiogroup"` / `role="radio"`).
- **Opção 1**: `sou o dono do meu negócio e tenho uma equipe que trabalha comigo`
  - *Público*: Donos e gestores de barbearias tradicionais ou estúdios com múltiplos profissionais.
  - *Funcionalidades liberadas*: Gestão de múltiplos barbeiros, rateio de comissões por serviço e produto, abertura e fechamento de comandas no PDV e relatórios financeiros consolidados.
- **Opção 2**: `sou profissional autônomo e trabalho sozinho`
  - *Público*: Barbeiros solo, profissionais autônomos ou donos de cadeira individual.
  - *Funcionalidades liberadas*: Configuração rápida de 1 cadeira, horários de atendimento próprios, chave PIX pessoal para recebimento direto e link exclusivo de agendamento online.

### 2.2 Botão de Ação
- **Rótulo**: `Continuar para configuração`
- **Comportamento**: Fica habilitado após a seleção de uma das opções. Ao clicar, persiste a escolha e direciona para a área de trabalho da barbearia.

---

## 3. Regras de Negócio e Persistência

### RN-01: Exibição Apenas no Primeiro Acesso
- O Quiz é apresentado exclusivamente no **primeiro login** do usuário Google (`isNewUser: true` ou ausência da chave `barber_saas_persona` no storage).
- A escolha é gravada no banco de dados (`profiles.user_metadata.persona` e `tenants`) e no storage local (`safeStorage.setItem("barber_saas_persona", scenario)`).
- Em acessos futuros, a plataforma detecta o perfil existente e redireciona automaticamente para o dashboard do negócio, sem reexibir o quiz.

### RN-02: Acesso do Cliente Final
- Clientes que desejam agendar cortes e serviços **não passam pelo quiz de onboarding**.
- O fluxo de agendamento é público e realizado diretamente pelo link de agendamento exclusivo de cada barbearia (ex: `/?screen=client-app&barbearia=vintage-club`), garantindo separação total entre quem gerencia o negócio e quem agenda o atendimento.

---

## 4. Acesso Master do Super Administrador (`atendmentor@gmail.com`)

### RN-03: Credenciais no Arquivo `.env`
As credenciais mestras do Super Administrador são configuradas no ambiente do sistema:
```env
SUPERADMIN_EMAIL="atendmentor@gmail.com"
SUPERADMIN_DEFAULT_PASSWORD="SuaSenhaSuperAdminSegura2026!"
VITE_SUPERADMIN_EMAIL="atendmentor@gmail.com"
```

### RN-04: Atalho Contextual na Barra Lateral (`Sidebar.jsx`)
- Quando o usuário autenticado for o e-mail oficial `atendmentor@gmail.com`:
  - A barra lateral (`Sidebar.jsx`) renderiza um link/botão dedicado para o **Painel Super Admin**.
  - **Localização Exata**: No rodapé da Sidebar, imediatamente acima da informação de versão da aplicação (`SaaS V1.5.2.0`).
  - **Estilo**: Ícone de Coroa (`Crown`), cor âmbar destacada e borda sutil.
  - Usuários comuns ou outros e-mails não visualizam este botão, garantindo discrição e segurança de interface.
