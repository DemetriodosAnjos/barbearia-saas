# Release Notes - Barbearia SaaS v1.5.3.4

**Data de Lançamento**: Outubro de 2026  
**Status**: Homologado & Ativo  
**Módulos**: Agenda de Atendimentos (`module-agenda.md`), Linha do Tempo de Barbeiros (`BarberTimelineColumn.jsx`), Visão de Calendário (`CalendarView.jsx`)

---

## 🎯 Principais Atualizações da Versão 1.5.3.4

### 1. Eliminação de Duplicação de Horário de Almoço na Agenda do Dia
- **Diagnóstico da Causa Raiz**: O componente `BarberTimelineColumn.jsx`, ao não encontrar pausas estáticas no campo `barber.breaks`, acionava um fallback para extrair os intervalos de almoço da escala semanal `barber.schedule`. Esse fallback executava um loop `.forEach()` varrendo todos os 7 dias da semana indistintamente, inserindo até 6 blocos idênticos de almoço (ex: 12:00 às 13:00) para um mesmo dia.
- **Isolamento de Dia por Data Ativa**: O componente pai `CalendarView.jsx` agora propaga a prop `currentDate` diretamente para a coluna da linha do tempo. O componente calcula o dia da semana ativo (`dom`, `seg`, `ter`, `qua`, `qui`, `sex`, `sab`) e extrai exclusivamente o almoço configurado para aquele dia da semana.
- **Filtro de Deduplicação com Set**: Implementada validação defensiva que indexa os intervalos por chave única de horário (`${startTime}-${endTime}`), impedindo terminantemente que mais de um bloco de intervalo idêntico seja renderizado no mesmo slot de horário.

### 2. Validação Consistente de Conflito em Drag & Drop
- **ScheduleView.jsx**: O manipulador de reagendamento por arraste e solte (`handleDropAppointment`) foi atualizado para extrair o intervalo de almoço do profissional estritamente a partir da data de destino do agendamento, prevenindo falsos positivos de conflito de almoço originados por escalas de outros dias da semana.

### 3. Sincronização de Metadados e Versionamento
- **Alinhamento Global**: Atualização de versão para **v1.5.3.4** em `metadata.json`, `index.html` (`<title>` e `<meta property="og:title">`) e documentação oficial em `docs/module-agenda.md`.
