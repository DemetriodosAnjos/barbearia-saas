import { useState } from "react";
import { clientsStyles } from "./ClientsDirectoryView.styles";
import StatCard from "../../components/dashboard/StatCard";
import Table from "../../components/ui/Table";
import SearchInput from "../../components/ui/SearchInput";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Alert from "../../components/ui/Alert";
import ClientHistoryTimeline from "../../components/loyalty/ClientHistoryTimeline";

// Base de Clientes com parametrização de frequência de retorno
const initialClientsList = [
  {
    id: "cli-1",
    name: "Rodrigo Faro",
    phone: "(11) 98765-4321",
    cpf: "123.456.789-00",
    birthDate: "1983-10-20",
    isVip: true,
    status: "active",
    lastVisitDate: "28/08/2026",
    daysSinceLastVisit: 15, // Cortou há 15 dias
    frequencyDays: 18, // Frequência de 18 dias -> FALTAM 3 DIAS! (JANELA PERFEITA)
    totalVisits: 14,
    totalSpent: 1180.0,
    preferredBarber: "Carlos Silva",
    technicalNotes: {
      cutSpecs:
        "Lateral disfarçada no pente 1, tesoura no topo, risco fino na sobrancelha esquerda.",
      beardSpecs:
        "Barba alinhada com toalha quente, desenhada na navalha sem diminuir o queixo.",
      allergyAlert:
        "Sensibilidade a lâmina no pescoço (usar pós-barba sem álcool).",
    },
    historyEvents: [
      {
        id: "ev-1",
        date: "28/08/2026",
        type: "service",
        title: "Corte Degradê Navalhado + Barboterapia",
        barberName: "Carlos Silva",
        totalPrice: 100,
        notes: "Pente 1 disfarçado nas laterais, tesoura no topo.",
      },
      {
        id: "ev-2",
        date: "10/08/2026",
        type: "product",
        title: "Compra no Balcão: 1x Pomada Matte (50g)",
        totalPrice: 45,
      },
    ],
  },
  {
    id: "cli-2",
    name: "Guilherme Boulos",
    phone: "(11) 97654-3210",
    cpf: "234.567.890-11",
    birthDate: "1982-06-19",
    isVip: false,
    status: "active",
    lastVisitDate: "10/09/2026",
    daysSinceLastVisit: 4,
    frequencyDays: 25,
    totalVisits: 8,
    totalSpent: 420.0,
    preferredBarber: "Marcos Vinicius",
    technicalNotes: {
      cutSpecs: "Corte tradicional clássico totalmente na tesoura.",
      beardSpecs: "Barba cheia alinhada apenas na tesoura.",
      allergyAlert: "",
    },
    historyEvents: [],
  },
  {
    id: "cli-3",
    name: "Thiago Ventura",
    phone: "(11) 99887-7665",
    cpf: "345.678.901-22",
    birthDate: "1990-04-05",
    isVip: true,
    status: "active",
    lastVisitDate: "02/09/2026",
    daysSinceLastVisit: 12, // Cortou há 12 dias
    frequencyDays: 15, // Frequência de 15 dias -> FALTAM 3 DIAS! (JANELA PERFEITA)
    totalVisits: 22,
    totalSpent: 1980.0,
    preferredBarber: "Carlos Silva",
    technicalNotes: {
      cutSpecs: "Degradê navalhado alto, pigmentação suave na barba.",
      beardSpecs: "Barba quadrada desenhada.",
      allergyAlert: "Prefere café sem açúcar antes do corte.",
    },
    historyEvents: [],
  },
  {
    id: "cli-4",
    name: "Matheus Pereira",
    phone: "(11) 91122-3344",
    cpf: "456.789.012-33",
    birthDate: "1997-12-14",
    isVip: false,
    status: "at_risk", // Ausente > 40 dias
    lastVisitDate: "20/07/2026",
    daysSinceLastVisit: 54,
    frequencyDays: 20,
    totalVisits: 5,
    totalSpent: 260.0,
    preferredBarber: "Tiago Santos",
    technicalNotes: {
      cutSpecs: "Corte militar baixo.",
      beardSpecs: "Apenas raspado completo.",
      allergyAlert: "",
    },
    historyEvents: [],
  },
];

export default function ClientsDirectoryView({ onNavigateToBooking, onBack }) {
  const [clients, setClients] = useState(initialClientsList);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal de Prontuário Técnico
  const [selectedClientForRecord, setSelectedClientForRecord] = useState(null);

  // Modal de Cadastro de Novo Cliente
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    phone: "",
    cpf: "",
    birthDate: "",
    frequencyDays: "18", // Padrão 18 dias
    notes: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // ========================================================
  // ESTADOS DO LEMBRETE PREDITIVO DE RETORNO (NOVO!)
  // ========================================================
  const [recallModalClient, setRecallModalClient] = useState(null);
  const [customMessage, setCustomMessage] = useState("");

  // 1. Identifica os clientes na janela de ouro de retorno (faltam 3 dias ou menos)
  const recallDueClients = clients.filter((c) => {
    if (c.status === "at_risk") return false;
    const daysRemaining = c.frequencyDays - (c.daysSinceLastVisit || 0);
    return daysRemaining <= 3 && daysRemaining >= 0;
  });

  // 2. Abre o Modal de Lembrete Preditivo montando a mensagem personalizada do Barbeiro
  const handleOpenRecallModal = (client) => {
    setRecallModalClient(client);

    const barberFirstName =
      client.preferredBarber.split(" ")[0] || "Seu Barbeiro";
    const clientFirstName = client.name.split(" ")[0];
    const daysRemaining = Math.max(
      1,
      client.frequencyDays - (client.daysSinceLastVisit || 0),
    );

    // 👇 LINK DINÂMICO: Usa localhost no seu PC e o domínio real em produção!
    const origin = window.location.origin;
    const customLink = `${origin}/?screen=client-app&barbeiro=carlos&cliente=${encodeURIComponent(client.name)}&telefone=${encodeURIComponent(client.phone)}`;

    // Mensagem humanizada pronta com o link funcional
    const prebuiltMsg =
      `Fala ${clientFirstName}, aqui é o ${barberFirstName}! Tudo bem por aí? 💈\n\n` +
      `Vi aqui na minha agenda que faltam apenas ${daysRemaining} dias para fechar seu prazo habitual de ${client.frequencyDays} dias de corte e barba.\n\n` +
      `O que acha de já deixar seu horário garantido na minha cadeira para não ficar sem vaga?\n\n` +
      `👉 Escolha seu horário aqui: ${customLink}\n\n` +
      `Te espero na cadeira!`;

    setCustomMessage(prebuiltMsg);
  };

  // 3. Atualizar a Frequência Habitual do Cliente
  const handleUpdateClientFrequency = (clientId, newFrequency) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId ? { ...c, frequencyDays: Number(newFrequency) } : c,
      ),
    );
    if (recallModalClient && recallModalClient.id === clientId) {
      setRecallModalClient((prev) => ({
        ...prev,
        frequencyDays: Number(newFrequency),
      }));
    }
  };

  // 4. Disparo Direto no WhatsApp
  const handleSendWhatsAppRecall = () => {
    if (!recallModalClient) return;

    const phoneClean = recallModalClient.phone.replace(/\D/g, "");
    const encodedMsg = encodeURIComponent(customMessage);

    window.open(`https://wa.me/55${phoneClean}?text=${encodedMsg}`, "_blank");
    setRecallModalClient(null);
  };

  // 5. Salvar Novo Cliente (Limpa a busca e reseta os filtros para exibir o cliente no topo!)
  const handleSaveNewClient = () => {
    const errs = {};
    if (!newClientForm.name.trim()) errs.name = "Informe o nome completo.";
    if (!newClientForm.phone || newClientForm.phone.length < 14) {
      errs.phone = "Informe o WhatsApp com DDD.";
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    const created = {
      id: `cli-${Date.now()}`,
      name: newClientForm.name.trim(),
      phone: newClientForm.phone,
      cpf: newClientForm.cpf || "Não informado",
      birthDate: newClientForm.birthDate || "",
      isVip: false,
      status: "active",
      lastVisitDate: "Hoje (Cadastrado)",
      daysSinceLastVisit: 0,
      frequencyDays: Number(newClientForm.frequencyDays || 18),
      totalVisits: 1,
      totalSpent: 0.0,
      preferredBarber: "Carlos Silva",
      technicalNotes: {
        cutSpecs: newClientForm.notes || "Primeiro atendimento na barbearia.",
        beardSpecs: "",
        allergyAlert: "",
      },
      historyEvents: [],
    };

    // Insere o cliente no início da lista
    setClients((prev) => [created, ...prev]);
    setIsNewClientModalOpen(false);

    // 👇 CORREÇÃO: Limpa a busca e os filtros para que a tabela mostre o cliente na hora!
    setSearchTerm("");
    setStatusFilter("all");

    setNewClientForm({
      name: "",
      phone: "",
      cpf: "",
      birthDate: "",
      frequencyDays: "18",
      notes: "",
    });
    setFormErrors({});
  };

  // Filtros
  const totalClients = clients.length;
  const vipClientsCount = clients.filter((c) => c.isVip).length;
  const atRiskCount = clients.filter((c) => c.status === "at_risk").length;
  const averageTicketGlobal =
    clients.reduce((acc, c) => acc + c.totalSpent / (c.totalVisits || 1), 0) /
    (totalClients || 1);

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.cpf.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "vip"
          ? client.isVip
          : statusFilter === "at_risk"
            ? client.status === "at_risk"
            : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className={clientsStyles.container}>
      {/* 1. CABEÇALHO */}
      <div className={clientsStyles.headerCard}>
        <div className={clientsStyles.titleWrapper}>
          <h1 className={clientsStyles.title}>
            <span>👥</span>
            <span>Clientes & Prontuários Técnicos</span>
          </h1>
          <p className={clientsStyles.subtitle}>
            Base ativa de clientes, inteligência preditiva de retorno, alerta de
            alergias e retenção no WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Button
            variant="primary"
            onClick={() => setIsNewClientModalOpen(true)}
            className="text-xs py-2.5 px-4 font-bold shadow-md bg-amber-600 hover:bg-amber-500 shrink-0"
          >
            <span>+</span> Novo Cliente
          </Button>

          {onBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="text-xs py-2 px-3"
            >
              ← Voltar
            </Button>
          )}
        </div>
      </div>

      {/* 2. O ALERTA PREDITIVO DE RETORNO NO TOPO */}
      {recallDueClients.length > 0 && (
        <Alert
          variant="warning"
          title={`🔔 Oportunidade de Receita: ${recallDueClients.length} clientes na janela ideal de retorno!`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
            <span className="text-xs text-neutral-300">
              Os clientes{" "}
              <strong>{recallDueClients.map((c) => c.name).join(" e ")}</strong>{" "}
              costumam cortar cabelo a cada 15-18 dias e faltam apenas 3 dias
              para a volta ideal!
            </span>
            <Button
              variant="primary"
              onClick={() => handleOpenRecallModal(recallDueClients[0])}
              className="text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold shrink-0 self-start sm:self-auto"
            >
              Disparar Lembrete WhatsApp
            </Button>
          </div>
        </Alert>
      )}

      {/* 3. OS 4 KPIS DA CARTEIRA */}
      <div className={clientsStyles.kpiGrid}>
        <StatCard
          title="Base de Clientes"
          value={`${totalClients} cadastrados`}
          icon="👥"
          theme="blue"
          delta={{
            value: "+12 este mês",
            isPositive: true,
            comparisonText: "crescimento da base",
          }}
        />

        <StatCard
          title="Clientes VIP / Recorrentes"
          value={`${vipClientsCount} fiéis`}
          icon="👑"
          theme="gold"
          delta={{
            value: "Voltam < 20 dias",
            isPositive: true,
            comparisonText: "receita garantida",
          }}
        />

        <StatCard
          title="Ticket Médio da Carteira"
          value={`R$ ${averageTicketGlobal.toFixed(2).replace(".", ",")}`}
          icon="💰"
          theme="green"
          delta={{
            value: "Por atendimento",
            isPositive: null,
            comparisonText: "gasto médio por visita",
          }}
        />

        <StatCard
          title="Em Risco de Perda (Churn)"
          value={`${atRiskCount} ausentes`}
          icon="⚠️"
          theme="purple"
          delta={{
            value: "> 40 dias sem vir",
            isPositive: false,
            comparisonText: "precisa de contato",
          }}
        />
      </div>

      {/* 4. TABELA DE CLIENTES */}
      <div className={clientsStyles.tableSection}>
        <div className={clientsStyles.filterBar}>
          <div className="max-w-md w-full">
            <SearchInput
              placeholder="Buscar cliente por nome, telefone ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-500 font-bold hidden sm:inline">
              Filtrar:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Todos os Clientes</option>
              <option value="vip">Apenas Clientes VIP (★)</option>
              <option value="at_risk">Em Risco de Perda (&gt; 40 dias)</option>
            </select>
          </div>
        </div>

        <Table
          data={filteredClients}
          keyField="id"
          selectable={false}
          columns={[
            {
              key: "name",
              label: "Cliente",
              sortable: true,
              render: (row) => {
                const daysRemaining =
                  row.frequencyDays - (row.daysSinceLastVisit || 0);
                const isDueRecall = daysRemaining <= 3 && daysRemaining >= 0;

                return (
                  <div className="flex items-center gap-3">
                    <Avatar name={row.name} size="sm" isVip={row.isVip} />
                    <div>
                      <p className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>{row.name}</span>
                        {row.isVip && (
                          <span className="text-amber-400 text-[10px]">
                            ★ VIP
                          </span>
                        )}
                        {isDueRecall && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            Faltam {daysRemaining}d
                          </span>
                        )}
                      </p>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {row.phone}
                      </span>
                    </div>
                  </div>
                );
              },
            },
            {
              key: "lastVisitDate",
              label: "Última Visita",
              sortable: true,
              render: (row) => (
                <div className="flex flex-col">
                  <span className="font-mono text-xs text-neutral-200">
                    {row.lastVisitDate}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    há {row.daysSinceLastVisit} dias
                  </span>
                </div>
              ),
            },
            {
              key: "frequencyDays",
              label: "Frequência Habitual",
              render: (row) => (
                <span className="text-xs text-neutral-300 font-medium">
                  A cada{" "}
                  <strong className="text-amber-400 font-bold">
                    {row.frequencyDays} dias
                  </strong>
                </span>
              ),
            },
            {
              key: "preferredBarber",
              label: "Barbeiro",
              render: (row) => (
                <span className="text-xs text-neutral-200 font-medium flex items-center gap-1">
                  <span>💈</span>
                  <span>{row.preferredBarber}</span>
                </span>
              ),
            },
            {
              key: "totalSpent",
              label: "Total Gasto",
              sortable: true,
              render: (row) => (
                <span className="font-mono font-bold text-emerald-400 text-xs">
                  R$ {Number(row.totalSpent).toFixed(2).replace(".", ",")}
                </span>
              ),
            },
          ]}
          actions={[
            // 👇 NOVO: AÇÃO DE LEMBRETE PREDITIVO (SINO)
            {
              label: "Disparar Lembrete Preditivo de Retorno",
              icon: "🔔",
              onClick: (row) => handleOpenRecallModal(row),
            },
            {
              label: "Abrir Prontuário & Ficha Técnica",
              icon: "📜",
              onClick: (row) => setSelectedClientForRecord(row),
            },
            {
              label: "Agendar Horário na Agenda",
              icon: "📅",
              onClick: (row) => {
                if (onNavigateToBooking) onNavigateToBooking(row);
                else
                  alert(
                    `Abrindo a Agenda com o cliente "${row.name}" pré-selecionado!`,
                  );
              },
            },
          ]}
        />
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: DISPARO DO LEMBRETE PREDITIVO (WHATSAPP DO BARBEIRO) */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!recallModalClient}
        size="lg"
        onClose={() => setRecallModalClient(null)}
        title={`🔔 Lembrete Preditivo de Retorno: ${recallModalClient?.name}`}
        footer={
          <div className="w-full flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => setRecallModalClient(null)}
            >
              Cancelar
            </Button>

            <Button
              variant="primary"
              onClick={handleSendWhatsAppRecall}
              className="text-xs py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 font-extrabold shadow-lg flex items-center gap-2"
            >
              <span>📲</span>
              <span>Enviar no WhatsApp do Cliente</span>
            </Button>
          </div>
        }
      >
        {recallModalClient && (
          <div className="space-y-4 text-left">
            {/* Resumo da Frequência e Janela */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-neutral-950 border border-neutral-800 rounded-2xl text-xs">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                  Último Corte:
                </span>
                <strong className="text-white text-sm">
                  {recallModalClient.lastVisitDate}
                </strong>
                <span className="text-[10px] text-neutral-400 block">
                  há {recallModalClient.daysSinceLastVisit} dias
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                  Frequência Habitual:
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <select
                    value={recallModalClient.frequencyDays}
                    onChange={(e) =>
                      handleUpdateClientFrequency(
                        recallModalClient.id,
                        e.target.value,
                      )
                    }
                    className="bg-neutral-900 border border-neutral-700 text-amber-400 font-bold text-xs p-1 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="15">A cada 15 dias</option>
                    <option value="18">A cada 18 dias</option>
                    <option value="20">A cada 20 dias</option>
                    <option value="25">A cada 25 dias</option>
                    <option value="30">A cada 30 dias</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                  Barbeiro Designado:
                </span>
                <strong className="text-amber-400 text-sm flex items-center gap-1 mt-0.5">
                  <span>💈</span>
                  <span>{recallModalClient.preferredBarber}</span>
                </strong>
              </div>
            </div>

            {/* Editor da Mensagem Humanizada */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                <span>Mensagem Pessoal Pronta (Em nome do Barbeiro):</span>
                <span className="text-[10px] text-neutral-500">
                  Você pode personalizar o texto antes de enviar
                </span>
              </label>
              <textarea
                rows={6}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
              />
            </div>

            <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <span>💡</span>
              <span>
                O link anexado na mensagem já abre a agenda com o barbeiro{" "}
                <strong>{recallModalClient.preferredBarber}</strong>{" "}
                selecionado!
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: PRONTUÁRIO TÉCNICO COMPLETO */}
      <Modal
        isOpen={!!selectedClientForRecord}
        size="xl"
        onClose={() => setSelectedClientForRecord(null)}
        title={`Prontuário & Ficha Técnica: ${selectedClientForRecord?.name}`}
        footer={
          <div className="w-full flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-400">
              Cliente cadastrado • {selectedClientForRecord?.totalVisits}{" "}
              atendimentos registrados
            </span>
            <Button
              variant="secondary"
              onClick={() => setSelectedClientForRecord(null)}
            >
              Fechar Prontuário
            </Button>
          </div>
        }
      >
        {selectedClientForRecord && (
          <div className="space-y-4">
            <ClientHistoryTimeline
              metrics={{
                totalVisits: selectedClientForRecord.totalVisits,
                averageTicket:
                  selectedClientForRecord.totalSpent /
                  (selectedClientForRecord.totalVisits || 1),
                frequencyDays: selectedClientForRecord.frequencyDays,
                preferredBarber: selectedClientForRecord.preferredBarber,
              }}
              technicalNotes={selectedClientForRecord.technicalNotes}
              events={selectedClientForRecord.historyEvents}
              onAddTechnicalNote={() =>
                alert(
                  `📝 Adicionar nota técnica para ${selectedClientForRecord.name}`,
                )
              }
            />
          </div>
        )}
      </Modal>

      {/* MODAL 3: CADASTRAR NOVO CLIENTE */}
      <Modal
        isOpen={isNewClientModalOpen}
        size="md"
        onClose={() => setIsNewClientModalOpen(false)}
        title="👤 Cadastrar Novo Cliente"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsNewClientModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveNewClient}>
              Salvar Cliente na Base
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <Input
            label="Nome Completo do Cliente *"
            placeholder="Ex: Matheus Oliveira"
            value={newClientForm.name}
            onChange={(e) => {
              setNewClientForm({ ...newClientForm, name: e.target.value });
              if (formErrors.name) setFormErrors({ ...formErrors, name: null });
            }}
            error={formErrors.name}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="WhatsApp / Celular *"
              mask="phone"
              placeholder="(11) 99999-9999"
              value={newClientForm.phone}
              onChange={(e) => {
                setNewClientForm({ ...newClientForm, phone: e.target.value });
                if (formErrors.phone)
                  setFormErrors({ ...formErrors, phone: null });
              }}
              error={formErrors.phone}
            />

            {/* 👇 NOVO: PARAMETRIZAÇÃO DA FREQUÊNCIA NO CADASTRO */}
            <Select
              label="Frequência Habitual de Retorno"
              value={newClientForm.frequencyDays}
              onChange={(e) =>
                setNewClientForm({
                  ...newClientForm,
                  frequencyDays: e.target.value,
                })
              }
              options={[
                { value: "15", label: "A cada 15 dias (Barba & Corte)" },
                { value: "18", label: "A cada 18 dias (Padrão)" },
                { value: "20", label: "A cada 20 dias" },
                { value: "25", label: "A cada 25 dias" },
                { value: "30", label: "A cada 30 dias (Mensal)" },
              ]}
              helperText="Usado para o disparo do lembrete automático."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="CPF (Opcional)"
              mask="cpf"
              placeholder="000.000.000-00"
              value={newClientForm.cpf}
              onChange={(e) =>
                setNewClientForm({ ...newClientForm, cpf: e.target.value })
              }
            />

            <Input
              label="Data de Nascimento"
              type="date"
              value={newClientForm.birthDate}
              onChange={(e) =>
                setNewClientForm({
                  ...newClientForm,
                  birthDate: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-neutral-300">
              Preferências Iniciais de Corte (Ficha Técnica)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Prefere degradê navalhado médio, tem sensibilidade a lâmina..."
              value={newClientForm.notes}
              onChange={(e) =>
                setNewClientForm({ ...newClientForm, notes: e.target.value })
              }
              className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
