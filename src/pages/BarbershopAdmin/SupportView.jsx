import { useState } from "react";
import { supportStyles } from "./SupportView.styles";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Alert from "../../components/ui/Alert";

export default function SupportView({ onBack }) {
  // Estado do FAQ (qual item está aberto)
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Estados do Formulário de Abertura de Chamado
  const [ticketCategory, setTicketCategory] = useState("duvida");
  const [ticketUrgency, setTicketUrgency] = useState("baixa");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(null);

  // Dados do Tenant para alimentar o contexto do WhatsApp
  const tenantContext = {
    barbershopName: "Barbearia Vintage Club",
    tenantSlug: "vintage-club",
    ownerName: "Carlos Silva",
    ownerPhone: "(11) 98765-4321",
    plan: "Plano Pro",
  };

  // 1. DISPARO INTELIGENTE DE WHATSAPP COM CONTEXTO CODIFICADO
  const handleOpenWhatsAppSupport = () => {
    const supportNumber = "5511999998888"; // Número do suporte BarberSaaS
    const encodedText = encodeURIComponent(
      `Olá Suporte BarberSaaS! 👋\n\n` +
        `Sou ${tenantContext.ownerName} da ${tenantContext.barbershopName} (${tenantContext.plan} • ID: ${tenantContext.tenantSlug}).\n\n` +
        `Estou precisando de atendimento para:`,
    );

    window.open(`https://wa.me/${supportNumber}?text=${encodedText}`, "_blank");
  };

  // 2. DISPARO DO PLANTÃO DE EMERGÊNCIA (SALÃO TRAVADO)
  const handleOpenEmergencyHotline = () => {
    const supportNumber = "5511999998888";
    const emergencyText = encodeURIComponent(
      `🚨 [PLANTÃO DE EMERGÊNCIA - SALÃO TRAVADO]\n\n` +
        `• Estabelecimento: ${tenantContext.barbershopName} (ID: ${tenantContext.tenantSlug})\n` +
        `• Responsável: ${tenantContext.ownerName} (${tenantContext.ownerPhone})\n` +
        `• Urgência: Crítica (Operação de atendimento parada)\n\n` +
        `Preciso de suporte técnico imediato no sistema!`,
    );

    window.open(
      `https://wa.me/${supportNumber}?text=${emergencyText}`,
      "_blank",
    );
  };

  // 3. ENVIO DE CHAMADO / TICKET
  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      alert("Por favor, preencha o assunto e a descrição do chamado.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const generatedTicketId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
      setTicketSuccess({
        id: generatedTicketId,
        subject: ticketSubject,
        urgency: ticketUrgency,
      });

      setTicketSubject("");
      setTicketMessage("");
    }, 1200);
  };

  // FAQ com dúvidas reais de salão
  const faqList = [
    {
      question: "Como conectar o WhatsApp para disparar lembretes automáticos?",
      answer:
        "Acesse 'Configurações da Barbearia' ➔ aba 'Notificações WhatsApp'. Certifique-se de que a chave 'Confirmação Imediata' e 'Lembrete 2h' estejam ativas. O sistema utiliza a infraestrutura oficial da plataforma para enviar mensagens sem consumir o saldo do seu celular.",
    },
    {
      question: "Como funciona a divisão de comissões com os barbeiros?",
      answer:
        "No menu 'Serviços & Produtos', você define a porcentagem padrão de comissão para cada corte (ex: 50%) e cada produto (ex: 10%). Ao concluir a comanda no caixa, o sistema calcula na hora o saldo individual de cada profissional e desconta taxas de cartão automaticamente se a opção de rateio estiver ativada.",
    },
    {
      question:
        "Onde o barbeiro cadastra a chave PIX para receber as comissões?",
      answer:
        "O profissional pode acessar 'Meu Perfil' ➔ aba 'Perfil & Chave PIX' e cadastrar sua chave pessoal (CPF, E-mail ou Telefone). Na sexta-feira ou no fechamento da semana, o gestor clica em 'Quitar via PIX' e o sistema usa essa chave para a transferência.",
    },
    {
      question:
        "O que fazer se a internet da barbearia cair durante um atendimento?",
      answer:
        "Não se preocupe! O BarberSaaS possui armazenamento temporário local. Você pode continuar anotando o atendimento e, assim que a conexão de dados (Wi-Fi ou 4G) retornar, as comandas são sincronizadas com a nuvem automaticamente sem perda de dados.",
    },
  ];

  return (
    <div className={supportStyles.container}>
      {/* 1. CABEÇALHO COM STATUS DO PLANTÃO E BOTÃO DIRETO DE WHATSAPP */}
      <div className={supportStyles.headerCard}>
        <div className={supportStyles.headerInfo}>
          <div className="flex items-center gap-2.5">
            <span className={supportStyles.supportStatusBadge}>
              <span className={supportStyles.statusDot} />
              <span>Plantão Ativo • Resposta em minutos</span>
            </span>
          </div>
          <h1 className={supportStyles.headerTitle}>
            <span>Central de Ajuda & Suporte</span>
          </h1>
          <p className={supportStyles.headerSubtitle}>
            Tire dúvidas operacionais no FAQ rápido ou fale diretamente com
            nossos especialistas em gestão de barbearias.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {onBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="text-xs py-2 px-3 w-full sm:w-auto"
            >
              ← Voltar ao Painel
            </Button>
          )}

          {/* Botão de WhatsApp com Metadados */}
          <Button
            variant="primary"
            onClick={handleOpenWhatsAppSupport}
            className="text-xs py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 font-extrabold shadow-lg w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <span>💬</span>
            <span>Chamar Suporte no WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* 2. GRADE CENTRAL: FAQ + ABERTURA DE TICKET */}
      <div className={supportStyles.gridContent}>
        {/* COLUNA ESQUERDA: FAQ INTERATIVO */}
        <div className={supportStyles.faqColumn}>
          <div className={supportStyles.faqCard}>
            <div>
              <h2 className={supportStyles.sectionTitle}>
                <span>💡</span> Perguntas Frequentes (Autoatendimento)
              </h2>
              <p className={supportStyles.sectionSubtitle}>
                Clique na dúvida para ver a resolução rápida em 30 segundos.
              </p>
            </div>

            <div className="space-y-2.5">
              {faqList.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className={`
                      ${supportStyles.accordionItem}
                      ${isOpen ? supportStyles.accordionOpen : supportStyles.accordionClosed}
                    `}
                  >
                    <div
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className={supportStyles.accordionHeader}
                    >
                      <span>{faq.question}</span>
                      <span className="text-amber-500 text-sm ml-2">
                        {isOpen ? "−" : "+"}
                      </span>
                    </div>

                    {isOpen && (
                      <div className={supportStyles.accordionBody}>
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: FORMULÁRIO DE TICKET / CHAMADO */}
        <div className={supportStyles.ticketColumn}>
          <div className={supportStyles.ticketCard}>
            <div>
              <h2 className={supportStyles.sectionTitle}>
                <span>📝</span> Abrir Chamado Interno
              </h2>
              <p className={supportStyles.sectionSubtitle}>
                Envie uma solicitação formal para nossa equipe técnica.
              </p>
            </div>

            {ticketSuccess && (
              <Alert variant="success" title="Chamado Criado com Sucesso!">
                Protocolo: <strong>#{ticketSuccess.id}</strong>. Nossa equipe
                entrará em contato via e-mail e WhatsApp em até 2 horas úteis.
              </Alert>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-3.5">
              <Select
                label="Categoria do Chamado"
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                options={[
                  { value: "duvida", label: "Dúvida Operacional de Uso" },
                  {
                    value: "financeiro",
                    label: "Financeiro, Assinatura & Planos",
                  },
                  { value: "bug", label: "Problema Técnico ou Erro" },
                  {
                    value: "sugestao",
                    label: "Sugestão de Nova Funcionalidade",
                  },
                ]}
              />

              <Select
                label="Grau de Urgência"
                value={ticketUrgency}
                onChange={(e) => setTicketUrgency(e.target.value)}
                options={[
                  { value: "baixa", label: "🟢 Baixa - Dúvida simples" },
                  {
                    value: "media",
                    label: "🟡 Média - Ajuste de configuração",
                  },
                  {
                    value: "critica",
                    label: "🔴 Crítica - Salão travado / Não atende",
                  },
                ]}
              />

              {/* GATILHO DE EMERGÊNCIA: Se a urgência for crítica, aciona o socorro de sábado */}
              {ticketUrgency === "critica" && (
                <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-2xl text-xs space-y-2">
                  <p className="text-red-300 font-bold flex items-center gap-1.5">
                    <span>🚨</span> ATENÇÃO: OPERAÇÃO EM RISCO
                  </p>
                  <p className="text-neutral-300 text-[11px] leading-relaxed">
                    Para problemas que impedem o atendimento de clientes, não
                    espere o ticket. Acione o nosso{" "}
                    <strong>Plantão de Emergência</strong> diretamente pelo
                    WhatsApp!
                  </p>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleOpenEmergencyHotline}
                    className="w-full text-xs py-2 font-black shadow-md"
                  >
                    Acionar Plantão de Emergência (WhatsApp)
                  </Button>
                </div>
              )}

              <Input
                label="Assunto Resumido"
                placeholder="Ex: Erro ao fechar comanda de cartão"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
              />

              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-neutral-300">
                  Descreva o que está acontecendo
                </label>
                <textarea
                  rows={4}
                  placeholder="Explique detalhadamente o ocorrido para agilizar o suporte..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="w-full text-xs py-2.5 font-bold shadow-md"
              >
                Enviar Chamado para Análise →
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* 3. RODAPÉ COM VÍDEOS TUTORIAIS DE 1 MINUTO */}
      <div className={supportStyles.tutorialBanner}>
        <div className={supportStyles.tutorialItem}>
          <div className={supportStyles.tutorialIcon}>🎬</div>
          <div>
            <h4 className="font-bold text-white text-xs">
              Vídeos Tutoriais Rápidos (1 Minuto)
            </h4>
            <p className="text-[11px] text-neutral-400">
              Aprenda a fechar o caixa diário, configurar os horários da equipe
              e exportar relatórios de comissão.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            alert(
              "Abrir canal oficial com os vídeos de treinamento do BarberSaaS!",
            )
          }
          className="text-xs py-1.5 px-3 shrink-0"
        >
          Assistir Tutoriais ➔
        </Button>
      </div>
    </div>
  );
}
