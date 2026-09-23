import { useState } from "react";
// [Import: cliente Supabase para persistência real no banco de dados]
import { supabase } from "../../lib/supabase";
import { settingsStyles } from "./BarbershopSettingsView.styles";
import Tabs from "../../components/ui/Tabs";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Alert from "../../components/ui/Alert";
import Toggle from "../../components/ui/Toggle";

// [Função componente: recebe tenant real e callback de sincronização]
export default function BarbershopSettingsView({
  tenant,
  onUpdateTenant,
  onBack,
}) {
  // [Estado: inicia na aba principal padrão]
  const [activeTab, setActiveTab] = useState("estabelecimento");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ========================================================
  // ABA 1: ESTABELECIMENTO (Consome dados reais do tenant)
  // ========================================================
  // [Objeto: inicialização dinâmica a partir do tenant ou strings vazias sem mocks]
  const [businessData, setBusinessData] = useState({
    tradeName: tenant?.name || "",
    corporateName: tenant?.corporate_name || tenant?.corporateName || "",
    cnpj: tenant?.cnpj || "",
    phone: tenant?.phone || "",
    slug: tenant?.slug || "",
    logoUrl: tenant?.logo_url || tenant?.logoUrl || "",
    cep: tenant?.cep || "",
    street: tenant?.street || "",
    number: tenant?.number || "",
    complement: tenant?.complement || "",
    neighborhood: tenant?.neighborhood || "",
    city: tenant?.city || "",
    state: tenant?.state || "",
  });

  // ========================================================
  // ABA 2: REGRAS DE AGENDAMENTO
  // ========================================================
  const [bookingRules, setBookingRules] = useState({
    slotInterval: "30",
    cleaningBuffer: "10",
    delayTolerance: "10",
    minAdvanceNotice: "30",
    maxAdvanceDays: "30",
    allowOnlineCancellation: true,
    cancellationNoticeHours: "2",
    cancellationPolicyText:
      "Cancelamentos com menos de 2 horas de antecedência estão sujeitos a retenção da taxa de reserva.",
  });

  // ========================================================
  // ABA 3: HORÁRIOS DA UNIDADE
  // ========================================================
  const [storeHours, setStoreHours] = useState([
    {
      dayId: "seg",
      label: "Segunda-feira",
      isOpen: true,
      open: "08:00",
      close: "20:00",
    },
    {
      dayId: "ter",
      label: "Terça-feira",
      isOpen: true,
      open: "08:00",
      close: "20:00",
    },
    {
      dayId: "qua",
      label: "Quarta-feira",
      isOpen: true,
      open: "08:00",
      close: "20:00",
    },
    {
      dayId: "qui",
      label: "Quinta-feira",
      isOpen: true,
      open: "08:00",
      close: "20:00",
    },
    {
      dayId: "sex",
      label: "Sexta-feira",
      isOpen: true,
      open: "08:00",
      close: "20:00",
    },
    {
      dayId: "sab",
      label: "Sábado",
      isOpen: true,
      open: "08:00",
      close: "19:00",
    },
    {
      dayId: "dom",
      label: "Domingo",
      isOpen: false,
      open: "09:00",
      close: "14:00",
    },
  ]);

  const [holidaySettings, setHolidaySettings] = useState({
    autoCloseHolidays: true,
    customClosures: [
      { date: "2026-12-25", label: "Natal" },
      { date: "2026-01-01", label: "Ano Novo" },
    ],
  });

  // ========================================================
  // ABA 4: NOTIFICAÇÕES WHATSAPP
  // ========================================================
  const [whatsappSettings, setWhatsappSettings] = useState({
    notifyOnBooking: true,
    reminder24h: true,
    reminder2h: true,
    npsFeedback: false,
    birthdayGreeting: true,
    activeMessageType: "booking",

    // [Objeto templates: utiliza o nome dinâmico da barbearia cadastrada no sistema]
    templates: {
      booking:
        "Olá {cliente}! 👋 Seu agendamento de {servico} com {barbeiro} foi confirmado para {data} às {horario}h. Caso precise reagendar, acesse: {link_cancelar}",
      reminder2h:
        "Fala {cliente}, beleza? Passando para lembrar que seu corte é hoje às {horario}h com {barbeiro}. Te esperamos na cadeira! 💈",
      nps: "Olá {cliente}! O que achou do seu corte com {barbeiro}? Deixe sua avaliação de 1 a 5 estrelas aqui: {link_avaliar} ⭐",
      birthday:
        "Parabéns {cliente}! 🎉 Nossa equipe te deseja um feliz aniversário! Ganhe 15% de desconto no seu corte este mês com o cupom NIVER15.",
    },
  });

  // ========================================================
  // ABA 5: POLÍTICAS FINANCEIRAS & SINAL ANTI-NO-SHOW (NOVO!)
  // ========================================================
  const [financialPolicies, setFinancialPolicies] = useState({
    // 1. Sinal Anti-No-Show
    requireDeposit: true,
    depositPercentage: "50", // 30, 50 ou 100%
    depositTimeoutMinutes: "15", // tempo para pagar o PIX antes de cancelar a reserva

    // 2. Rateio de Taxas de Cartão
    feeDeductionPolicy: "split", // 'split' (rateia com barbeiro) | 'absorb' (salão assume tudo)
    debitFee: "1.8", // 1.8%
    creditFee: "3.5", // 3.5%

    // 3. Fiado / Conta Assinada
    allowCreditAccount: true,
    creditAccountLimit: "150.00",
    requireCpfForCredit: true,

    // 4. Métodos Aceitos no Salão
    acceptPix: true,
    acceptCreditCard: true,
    acceptDebitCard: true,
    acceptCash: true,
  });

  // [Função auxiliar assíncrona: persiste payload no Supabase na tabela barbershops]
  const saveSettingsToSupabase = async (payload, successMsg) => {
    setSuccessMessage("");
    setErrorMessage("");
    setIsSaving(true);

    try {
      if (tenant?.id) {
        const { error } = await supabase
          .from("barbershops")
          .update(payload)
          .eq("id", tenant.id);

        if (error) throw error;

        if (onUpdateTenant) {
          onUpdateTenant({ ...tenant, ...payload });
        }
      }
      setSuccessMessage(successMsg);
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      setErrorMessage(
        "Erro ao sincronizar com o banco de dados. Tente novamente.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // [Métodos de salvamento reais por aba conectadas à tabela do Supabase]
  const handleSaveTab1 = () => {
    saveSettingsToSupabase(
      {
        name: businessData.tradeName,
        corporate_name: businessData.corporateName,
        cnpj: businessData.cnpj,
        phone: businessData.phone,
        slug: businessData.slug,
        street: businessData.street,
        city: businessData.city,
        state: businessData.state,
      },
      "Dados do estabelecimento salvos com sucesso!",
    );
  };

  const handleSaveTab2 = () => {
    saveSettingsToSupabase(
      { booking_rules: bookingRules },
      "Regras de agendamento salvas com sucesso!",
    );
  };

  const handleSaveTab3 = () => {
    saveSettingsToSupabase(
      { store_hours: storeHours, holiday_settings: holidaySettings },
      "Horários de funcionamento salvos com sucesso!",
    );
  };

  const handleSaveTab4 = () => {
    saveSettingsToSupabase(
      { whatsapp_settings: whatsappSettings },
      "Automações do WhatsApp salvas com sucesso!",
    );
  };

  const handleSaveTab5 = () => {
    saveSettingsToSupabase(
      { financial_policies: financialPolicies },
      "Políticas financeiras, taxas e regras de sinal atualizadas com sucesso!",
    );
  };

  const settingsTabs = [
    { id: "estabelecimento", label: "Estabelecimento", icon: "🏢" },
    { id: "agendamento", label: "Regras de Agenda", icon: "⏰" },
    { id: "horarios", label: "Funcionamento", icon: "📅" },
    { id: "whatsapp", label: "Notificações WhatsApp", icon: "💬" },
    { id: "financeiro", label: "Políticas & Sinal", icon: "💳" },
  ];

  return (
    <div className={settingsStyles.container}>
      {/* CABEÇALHO */}
      <div className={settingsStyles.headerCard}>
        <div>
          <h1 className={settingsStyles.headerTitle}>
            <span>⚙️</span>
            <span>Configurações da Barbearia</span>
          </h1>
          <p className={settingsStyles.headerSubtitle}>
            Gerencie os dados institucionais, políticas de cancelamento,
            WhatsApp e regras financeiras da unidade.
          </p>
        </div>

        {onBack && (
          <Button
            variant="secondary"
            onClick={onBack}
            className="text-xs py-1.5 px-3 shrink-0"
          >
            ← Voltar ao Painel
          </Button>
        )}
      </div>

      {/* NAVEGAÇÃO ENTRE AS 5 ABAS */}
      <Tabs
        tabs={settingsTabs}
        activeTab={activeTab}
        onChange={(tabId) => {
          setActiveTab(tabId);
          setSuccessMessage("");
        }}
        variant="line"
      />

      {/* CONTEÚDO DA ABA ATIVA */}
      <div className={settingsStyles.tabContentCard}>
        {/* [Feedback nativo de sucesso ou erro do Supabase] */}
        {successMessage && (
          <Alert variant="success" title="Configurações Atualizadas!">
            {successMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error" title="Atenção">
            {errorMessage}
          </Alert>
        )}

        {/* ======================================================== */}
        {/* ABA 1: ESTABELECIMENTO                                   */}
        {/* ======================================================== */}
        {activeTab === "estabelecimento" && (
          <div className="space-y-6">
            <h3 className={settingsStyles.sectionTitle}>
              <span>🏢</span> Dados da Empresa
            </h3>
            <div className={settingsStyles.gridTwoCols}>
              <Input
                label="Nome Fantasia"
                value={businessData.tradeName}
                onChange={(e) =>
                  setBusinessData({
                    ...businessData,
                    tradeName: e.target.value,
                  })
                }
              />
              <Input
                label="Razão Social"
                value={businessData.corporateName}
                onChange={(e) =>
                  setBusinessData({
                    ...businessData,
                    corporateName: e.target.value,
                  })
                }
              />
            </div>
            <div className={settingsStyles.footerActions}>
              <Button
                variant="primary"
                isLoading={isSaving}
                onClick={handleSaveTab1}
                className="text-xs py-2.5 px-6 font-bold"
              >
                Salvar Estabelecimento
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: REGRAS DE AGENDAMENTO                             */}
        {/* ======================================================== */}
        {activeTab === "agendamento" && (
          <div className="space-y-6">
            <h3 className={settingsStyles.sectionTitle}>
              <span>⏰</span> Regras de Agenda
            </h3>
            <div className={settingsStyles.gridThreeCols}>
              <Select
                label="Passo da Grade"
                value={bookingRules.slotInterval}
                onChange={(e) =>
                  setBookingRules({
                    ...bookingRules,
                    slotInterval: e.target.value,
                  })
                }
                options={[{ value: "30", label: "A cada 30 min" }]}
              />
              <Select
                label="Buffer Higienização"
                value={bookingRules.cleaningBuffer}
                onChange={(e) =>
                  setBookingRules({
                    ...bookingRules,
                    cleaningBuffer: e.target.value,
                  })
                }
                options={[{ value: "10", label: "+ 10 min" }]}
              />
              <Select
                label="Tolerância de Atraso"
                value={bookingRules.delayTolerance}
                onChange={(e) =>
                  setBookingRules({
                    ...bookingRules,
                    delayTolerance: e.target.value,
                  })
                }
                options={[{ value: "10", label: "10 min" }]}
              />
            </div>
            <div className={settingsStyles.footerActions}>
              <Button
                variant="primary"
                isLoading={isSaving}
                onClick={handleSaveTab2}
                className="text-xs py-2.5 px-6 font-bold"
              >
                Salvar Regras de Agenda
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: FUNCIONAMENTO GERAL                               */}
        {/* ======================================================== */}
        {activeTab === "horarios" && (
          <div className="space-y-6">
            <h3 className={settingsStyles.sectionTitle}>
              <span>📅</span> Horário Oficial da Unidade
            </h3>
            <div className="space-y-2">
              {storeHours.map((d) => (
                <div
                  key={d.dayId}
                  className="p-3 bg-neutral-950 rounded-xl flex justify-between items-center text-xs"
                >
                  <span>{d.label}</span>
                  <span className="text-amber-400 font-bold">
                    {d.isOpen ? `${d.open} às ${d.close}` : "Fechado"}
                  </span>
                </div>
              ))}
            </div>
            <div className={settingsStyles.footerActions}>
              <Button
                variant="primary"
                isLoading={isSaving}
                onClick={handleSaveTab3}
                className="text-xs py-2.5 px-6 font-bold"
              >
                Salvar Horários
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 4: NOTIFICAÇÕES WHATSAPP                             */}
        {/* ======================================================== */}
        {activeTab === "whatsapp" && (
          <div className="space-y-6">
            <h3 className={settingsStyles.sectionTitle}>
              <span>💬</span> Automações de Mensagens via WhatsApp
            </h3>
            <div className="p-4 bg-neutral-950 rounded-2xl flex justify-between items-center text-xs">
              <span>📱 Confirmação Imediata de Agendamento</span>
              <Toggle
                checked={whatsappSettings.notifyOnBooking}
                onChange={(val) =>
                  setWhatsappSettings({
                    ...whatsappSettings,
                    notifyOnBooking: val,
                  })
                }
              />
            </div>
            <div className={settingsStyles.footerActions}>
              <Button
                variant="primary"
                isLoading={isSaving}
                onClick={handleSaveTab4}
                className="text-xs py-2.5 px-6 font-bold"
              >
                Salvar WhatsApp
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 5: POLÍTICAS FINANCEIRAS & SINAL ANTI-NO-SHOW (NOVO!)*/}
        {/* ======================================================== */}
        {activeTab === "financeiro" && (
          <div className="space-y-6">
            <div>
              <h3 className={settingsStyles.sectionTitle}>
                <span>💳</span> Políticas de Cobrança, Sinal & Taxas do PDV
              </h3>
              <p className={settingsStyles.sectionSubtitle}>
                Proteja o caixa da barbearia contra no-shows e defina o rateio
                de taxas de cartão com a equipe.
              </p>
            </div>

            {/* 1. EXIGÊNCIA DE SINAL DE RESERVA (ANTI-NO-SHOW) */}
            <div className="p-5 bg-neutral-950 border border-neutral-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🛡️</span> Exigir Sinal de Reserva Online (Anti-Falta)
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    O cliente paga uma entrada via PIX no ato do agendamento
                    para garantir a cadeira.
                  </p>
                </div>
                <Toggle
                  checked={financialPolicies.requireDeposit}
                  onChange={(val) =>
                    setFinancialPolicies({
                      ...financialPolicies,
                      requireDeposit: val,
                    })
                  }
                />
              </div>

              {financialPolicies.requireDeposit && (
                <div className="space-y-4 pt-1">
                  <div className={settingsStyles.gridTwoCols}>
                    <Select
                      label="Valor do Sinal Exigido"
                      value={financialPolicies.depositPercentage}
                      onChange={(e) =>
                        setFinancialPolicies({
                          ...financialPolicies,
                          depositPercentage: e.target.value,
                        })
                      }
                      options={[
                        { value: "30", label: "30% do valor do serviço" },
                        { value: "50", label: "50% do valor (Recomendado)" },
                        {
                          value: "100",
                          label: "100% (Pagamento integral antecipado)",
                        },
                      ]}
                      helperText="O restante é pago no balcão após o atendimento."
                    />

                    <Select
                      label="Tempo Limite para Pagar o PIX"
                      value={financialPolicies.depositTimeoutMinutes}
                      onChange={(e) =>
                        setFinancialPolicies({
                          ...financialPolicies,
                          depositTimeoutMinutes: e.target.value,
                        })
                      }
                      options={[
                        { value: "10", label: "10 minutos" },
                        { value: "15", label: "15 minutos (Padrão)" },
                        { value: "30", label: "30 minutos" },
                      ]}
                      helperText="Se não pagar dentro do prazo, a vaga é liberada na agenda."
                    />
                  </div>

                  {/* Simulador Visual do Sinal */}
                  <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-2xl text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                      💡 Exemplo Prático de Agendamento:
                    </span>
                    <p className="text-neutral-300">
                      Para um corte de <strong>R$ 60,00</strong> com sinal de{" "}
                      <strong>{financialPolicies.depositPercentage}%</strong>: O
                      cliente paga{" "}
                      <strong className="text-emerald-400 font-mono">
                        R${" "}
                        {(
                          60 *
                          (Number(financialPolicies.depositPercentage) / 100)
                        ).toFixed(2)}
                      </strong>{" "}
                      via PIX para confirmar e paga os{" "}
                      <strong className="text-white font-mono">
                        R${" "}
                        {(
                          60 *
                          (1 -
                            Number(financialPolicies.depositPercentage) / 100)
                        ).toFixed(2)}
                      </strong>{" "}
                      restantes na recepção após o corte.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. RATEIO DE TAXAS DA MAQUININHA DE CARTÃO */}
            <div className="p-5 bg-neutral-950 border border-neutral-800 rounded-3xl space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📊</span> Política de Taxas da Maquininha de Cartão
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Define se a barbearia assume 100% dos custos bancários ou se
                  desconta proporcionalmente na comissão do barbeiro.
                </p>
              </div>

              <div className={settingsStyles.gridThreeCols}>
                <Select
                  label="Modelo de Cobrança da Taxa"
                  value={financialPolicies.feeDeductionPolicy}
                  onChange={(e) =>
                    setFinancialPolicies({
                      ...financialPolicies,
                      feeDeductionPolicy: e.target.value,
                    })
                  }
                  options={[
                    {
                      value: "split",
                      label: "Ratear com o Barbeiro (Recomendado)",
                    },
                    {
                      value: "absorb",
                      label: "Barbearia absorve 100% da taxa",
                    },
                  ]}
                  helperText="Desconta a taxa antes de aplicar a % da comissão."
                />

                <Input
                  label="Taxa Média no Débito (%)"
                  placeholder="1.80"
                  value={financialPolicies.debitFee}
                  onChange={(e) =>
                    setFinancialPolicies({
                      ...financialPolicies,
                      debitFee: e.target.value,
                    })
                  }
                />

                <Input
                  label="Taxa Média no Crédito à Vista (%)"
                  placeholder="3.50"
                  value={financialPolicies.creditFee}
                  onChange={(e) =>
                    setFinancialPolicies({
                      ...financialPolicies,
                      creditFee: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* 3. POLÍTICA DE FIADO / CADERNETA DIGITAL (CONTA ASSINADA) */}
            <div className="p-5 bg-neutral-950 border border-neutral-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>📝</span> Permitir Fiado / Débito em Conta
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Autoriza a recepção a fechar a comanda lançando saldo
                    devedor no nome do cliente para acerto posterior.
                  </p>
                </div>
                <Toggle
                  checked={financialPolicies.allowCreditAccount}
                  onChange={(val) =>
                    setFinancialPolicies({
                      ...financialPolicies,
                      allowCreditAccount: val,
                    })
                  }
                />
              </div>

              {financialPolicies.allowCreditAccount && (
                <div className={settingsStyles.gridTwoCols}>
                  <Input
                    label="Limite Máximo de Fiado por Cliente (R$)"
                    placeholder="150.00"
                    value={financialPolicies.creditAccountLimit}
                    onChange={(e) =>
                      setFinancialPolicies({
                        ...financialPolicies,
                        creditAccountLimit: e.target.value,
                      })
                    }
                    helperText="Trava o lançamento se a dívida do cliente ultrapassar este teto."
                  />

                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">
                        Exigir CPF Obrigatório
                      </p>
                      <span className="text-[10px] text-neutral-500">
                        Impede fiado para clientes anônimos
                      </span>
                    </div>
                    <Toggle
                      checked={financialPolicies.requireCpfForCredit}
                      onChange={(val) =>
                        setFinancialPolicies({
                          ...financialPolicies,
                          requireCpfForCredit: val,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* BOTÃO SALVAR DA ABA 5 */}
            <div className={settingsStyles.footerActions}>
              <Button
                variant="primary"
                isLoading={isSaving}
                onClick={handleSaveTab5}
                className="text-xs py-2.5 px-6 font-bold shadow-md"
              >
                Salvar Políticas Financeiras
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
