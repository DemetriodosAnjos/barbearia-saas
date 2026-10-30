# Motor Preditivo de Retorno e Central de Notificações

## 1. Visão Geral
Este documento define o funcionamento das notificações preditivas de retorno de clientes na **Navbar do Barbeiro/Gestor** e na **Navbar do App do Cliente**.

A funcionalidade calcula dinamicamente a contagem regressiva até a data estimada do próximo corte do cliente, alertando o barbeiro e o cliente para garantir a recorrência e retenção no salão.

---

## 2. Regra Matemática Preditiva (Opção A - Inteligência Dinâmica)

1. **Frequência Habitual (`frequency_days`):**
   - Obtida do cadastro do cliente (`client.frequency_days` ou `client.frequencyDays`).
   - Valor padrão de referência: **18 dias** (caso não esteja explicitamente configurado no prontuário).

2. **Data da Última Visita (`last_visit`):**
   - Obtida do campo `client.last_visit` ou do agendamento concluído mais recente no histórico.

3. **Cálculo dos Dias Restantes:**
   $$\text{Dias Desde o Último Corte} = \text{Data Atual} - \text{Data da Última Visita}$$
   $$\text{Dias Restantes} = \text{Frequência Habitual} - \text{Dias Desde o Último Corte}$$

---

## 3. Janela de Alerta

| Dias Restantes | Rótulo do Alerta | Urgência | Exibição no Sino |
|---|---|---|---|
| **3 dias** | *"Faltam 3 dias para [Nome] cortar o cabelo"* | Média | Badge ativo |
| **2 dias** | *"Faltam 2 dias para [Nome] cortar o cabelo"* | Média | Badge ativo |
| **1 dia** | *"Falta 1 dia para [Nome] cortar o cabelo"* | Alta | Badge ativo |
| **0 dias (Hoje)** | *"Hoje [Nome] tem que cortar o cabelo"* | Crítica / D-Day | Badge ativo |
| **Negativo (Atrasado)** | *"[Nome] deveria ter retornado há X dias"* | Atrasado | Badge ativo |

---

## 4. Experiência nas Interfaces

### 4.1. Navbar da Barbearia (`BarbershopDashboard.jsx`)
- **Badge Numérico:** O sino de notificações na barra superior recebe `notificationsCount = predictiveRecallReminders.length`.
- **Painel de Notificações (`PredictiveRecallNotificationsModal.jsx`):**
  - Ao clicar no sino, abre um modal listando os clientes que entraram na janela de retorno.
  - Cada item exibe a contagem regressiva, a frequência habitual e o barbeiro de preferência.
  - **Ação Direta:** Botão *"Lembrar"* que gera automaticamente a mensagem personalizada com o link da barbearia e abre diretamente o WhatsApp do cliente.

### 4.2. App do Cliente (`ClientBookingView.jsx`)
- **Badge no Sino:** Se o cliente possuir histórico e estiver na janela habitual de retorno ($\le 3$ dias), o sino na barra do cliente exibe o badge vermelho `1`.
- **Aviso Reativo:** Ao clicar no sino, o cliente visualiza:
  - *"Faltam X dias para o seu retorno habitual de corte! Reserve já o seu horário."* ou
  - *"Hoje é o dia do seu retorno habitual de corte! Que tal agendar seu horário agora?"*

---

## 5. Arquivos e Componentes
- `src/utils/predictiveRecallEngine.js`: Motor de cálculo matemático puro.
- `src/components/notifications/PredictiveRecallNotificationsModal.jsx`: Modal de alertas da Navbar da Barbearia.
- `src/pages/BarbershopAdmin/BarbershopDashboard.jsx`: Integração com a Navbar do dono e cálculo com `useMemo`.
- `src/pages/ClientBooking/ClientBookingView.jsx`: Integração com a Navbar do cliente.
