import { useState } from "react";
import { financialStyles } from "./FinancialDashboardView.styles";
import StatCard from "../../components/dashboard/StatCard";
import FinancialChart from "../../components/dashboard/FinancialChart";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";

export default function FinancialDashboardView({ onBack }) {
  const [selectedPeriod, setSelectedPeriod] = useState("month"); // 'month' | 'last_month' | 'year'
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // 1. Dados dos 5 Big Numbers (Setembro 2026)
  const financialData = {
    grossRevenue: 25850.0, // Faturamento Bruto
    commissionsPayable: 12925.0, // 50% em comissões
    netProfit: 10450.0, // Lucro Líquido da Barbearia (Casa)
    averageTicket: 78.5, // Ticket Médio
    occupancyRate: 78, // 78% de taxa de ocupação das cadeiras
  };

  // 2. Dados do Gráfico de Barras Empilhadas (Serviços vs Bar/Vitrine)
  const mockWeeklyRevenue = [
    { label: "Seg", fullLabel: "Segunda-feira", services: 420, products: 120 },
    { label: "Ter", fullLabel: "Terça-feira", services: 580, products: 160 },
    { label: "Qua", fullLabel: "Quarta-feira", services: 650, products: 180 },
    { label: "Qui", fullLabel: "Quinta-feira", services: 920, products: 280 },
    { label: "Sex", fullLabel: "Sexta-feira", services: 1450, products: 450 },
    { label: "Sáb", fullLabel: "Sábado", services: 1850, products: 550 },
    {
      label: "Dom",
      fullLabel: "Domingo (Folga)",
      services: 0,
      products: 0,
      isClosed: true,
    },
  ];

  const mockMonthlyRevenue = [
    {
      label: "Sem 1",
      fullLabel: "Semana 1 (01 a 07)",
      services: 4200,
      products: 1100,
    },
    {
      label: "Sem 2",
      fullLabel: "Semana 2 (08 a 14)",
      services: 5100,
      products: 1400,
    },
    {
      label: "Sem 3",
      fullLabel: "Semana 3 (15 a 21)",
      services: 4800,
      products: 1250,
    },
    {
      label: "Sem 4",
      fullLabel: "Semana 4 (22 a 31)",
      services: 6200,
      products: 1800,
    },
  ];

  const mockYearlyRevenue = [
    { label: "Jan", fullLabel: "Janeiro", services: 18000, products: 4200 },
    { label: "Fev", fullLabel: "Fevereiro", services: 21000, products: 5400 },
    { label: "Mar", fullLabel: "Março", services: 19500, products: 4800 },
    { label: "Abr", fullLabel: "Abril", services: 22000, products: 5900 },
    { label: "Mai", fullLabel: "Maio", services: 24500, products: 6800 },
    { label: "Jun", fullLabel: "Junho", services: 26000, products: 7200 },
  ];

  // 3. Resumo Individual de Comissões dos Barbeiros
  const barbersCommissions = [
    {
      id: "b1",
      name: "Carlos Silva",
      role: "Master Barber",
      totalServices: 84,
      grossGenerated: 4620.0,
      commissionPayable: 2310.0,
      status: "pending", // Pendente de repasse
    },
    {
      id: "b2",
      name: "Marcos Vinicius",
      role: "Especialista Degradê",
      totalServices: 62,
      grossGenerated: 3410.0,
      commissionPayable: 1705.0,
      status: "pending",
    },
    {
      id: "b3",
      name: "Tiago Santos",
      role: "Barba & Navalha",
      totalServices: 38,
      grossGenerated: 1950.0,
      commissionPayable: 877.5,
      status: "paid", // Já pago na quinzena
    },
  ];

  return (
    <div className={financialStyles.container}>
      {/* 1. CABEÇALHO COM CONTROLES */}
      <div className={financialStyles.headerCard}>
        <div className={financialStyles.titleWrapper}>
          <h1 className={financialStyles.title}>
            <span>📊</span>
            <span>Dashboard Financeiro & Big Numbers</span>
          </h1>
          <p className={financialStyles.subtitle}>
            Visão executiva em tempo real: faturamento bruto, rateio de
            comissões, lucro da casa e lucratividade.
          </p>
        </div>

        <div className={financialStyles.controlsRow}>
          {/* Seletor de Período */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={financialStyles.periodSelect}
            aria-label="Filtrar Período"
          >
            <option value="month">Este Mês (Setembro 2026)</option>
            <option value="last_month">Mês Anterior (Agosto 2026)</option>
            <option value="year">Ano Consolidado (2026)</option>
          </select>

          {/* Botão Modo Privacidade (Ocultar Valores) */}
          <Button
            variant={isPrivacyActive ? "primary" : "secondary"}
            onClick={() => setIsPrivacyActive((prev) => !prev)}
            className="text-xs py-2 px-3"
            title="Ocultar valores monetários na tela"
          >
            <span>{isPrivacyActive ? "👁️‍🗨️" : "👁️"}</span>
            <span className="hidden sm:inline">
              {isPrivacyActive ? "Revelar" : "Privacidade"}
            </span>
          </Button>

          {/* Botão Exportar DRE */}
          <Button
            variant="outline"
            onClick={() => setIsExportModalOpen(true)}
            className="text-xs py-2 px-3"
          >
            <span>📄</span>
            <span>Exportar Relatório</span>
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

      {/* 2. OS 5 BIG NUMBERS EM DESTAQUE */}
      <div className={financialStyles.kpiGrid}>
        {/* KPI 1: Faturamento Bruto */}
        <StatCard
          title="Faturamento Bruto"
          value={`R$ ${financialData.grossRevenue.toFixed(2).replace(".", ",")}`}
          icon="💰"
          theme="gold"
          isMasked={isPrivacyActive}
          delta={{
            value: "+14.2%",
            isPositive: true,
            comparisonText: "vs. mês anterior",
          }}
        />

        {/* KPI 2: Comissões da Equipe */}
        <StatCard
          title="Comissões a Pagar"
          value={`R$ ${financialData.commissionsPayable.toFixed(2).replace(".", ",")}`}
          icon="💈"
          theme="purple"
          isMasked={isPrivacyActive}
          delta={{
            value: "50%",
            isPositive: null,
            comparisonText: "do faturamento",
          }}
        />

        {/* KPI 3: Lucro Líquido da Casa */}
        <StatCard
          title="Lucro Líquido (Casa)"
          value={`R$ ${financialData.netProfit.toFixed(2).replace(".", ",")}`}
          icon="🏦"
          theme="green"
          isMasked={isPrivacyActive}
          delta={{
            value: "+18.5%",
            isPositive: true,
            comparisonText: "margem real limpa",
          }}
        />

        {/* KPI 4: Ticket Médio por Cliente */}
        <StatCard
          title="Ticket Médio"
          value={`R$ ${financialData.averageTicket.toFixed(2).replace(".", ",")}`}
          icon="📈"
          theme="blue"
          isMasked={isPrivacyActive}
          delta={{
            value: "+5.4%",
            isPositive: true,
            comparisonText: "meta: R$ 70,00",
          }}
        />

        {/* KPI 5: Ocupação das Cadeiras */}
        <StatCard
          title="Ocupação das Cadeiras"
          value={`${financialData.occupancyRate}%`}
          icon="🪑"
          theme="gold"
          isMasked={isPrivacyActive}
          delta={{
            value: "Alta demanda",
            isPositive: true,
            comparisonText: "capacidade ativa",
          }}
        />
      </div>

      {/* 3. GRÁFICO DE EVOLUÇÃO (SERVIÇOS VS BAR/VITRINE) */}
      <FinancialChart
        weeklyData={mockWeeklyRevenue}
        monthlyData={mockMonthlyRevenue}
        yearlyData={mockYearlyRevenue}
      />

      {/* 4. FECHAMENTO DE COMISSÕES POR BARBEIRO */}
      <div className={financialStyles.commissionSection}>
        <div className={financialStyles.sectionHeader}>
          <div>
            <h2 className={financialStyles.sectionTitle}>
              <span>💈</span> Fechamento de Comissões da Equipe
            </h2>
            <p className="text-xs text-neutral-400">
              Resumo individual de repasses acumulados para quitação semanal ou
              mensal.
            </p>
          </div>

          <span className="text-xs font-bold text-amber-500">
            Total a Repassar: R${" "}
            {financialData.commissionsPayable.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className={financialStyles.barbersGrid}>
          {barbersCommissions.map((barber) => (
            <div
              key={barber.id}
              className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {barber.name}
                  </h4>
                  <p className="text-xs text-neutral-400">{barber.role}</p>
                </div>

                <Badge
                  status={barber.status === "paid" ? "completed" : "waiting"}
                  label={barber.status === "paid" ? "Liquidado ✓" : "Pendente"}
                  size="sm"
                />
              </div>

              <div className="p-3 bg-neutral-900 border border-neutral-800/80 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                    Atendimentos:
                  </span>
                  <strong className="text-neutral-200">
                    {barber.totalServices} cortes
                  </strong>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                    Saldo de Comissão:
                  </span>
                  <strong className="font-mono font-black text-amber-400 text-sm">
                    {isPrivacyActive
                      ? "••••••"
                      : `R$ ${barber.commissionPayable.toFixed(2)}`}
                  </strong>
                </div>
              </div>

              <Button
                variant={barber.status === "paid" ? "outline" : "primary"}
                onClick={() =>
                  alert(
                    barber.status === "paid"
                      ? `Comprovante de repasse de ${barber.name} disponível no arquivo.`
                      : `💸 Quitando comissão de R$ ${barber.commissionPayable.toFixed(2)} via PIX para ${barber.name}!`,
                  )
                }
                className="w-full text-xs py-1.5"
              >
                {barber.status === "paid"
                  ? "Ver Comprovante"
                  : "Quitar Comissão (PIX)"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: EXPORTAÇÃO DE RELATÓRIO CONTÁBIL / DRE            */}
      {/* ======================================================== */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Exportar Relatório Financeiro & DRE"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsExportModalOpen(false)}
            >
              Fechar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                alert(
                  "📊 RELATÓRIO EXPORTADO COM SUCESSO!\n\nArquivo DRE_Setembro_2026.pdf gerado e baixado na sua máquina.",
                );
                setIsExportModalOpen(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold"
            >
              Baixar Relatório (PDF)
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-neutral-300 leading-relaxed">
            Selecione o formato para download da prestação de contas da
            barbearia:
          </p>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-950 cursor-pointer hover:border-neutral-700">
              <div className="flex items-center gap-2.5">
                <span>📄</span>
                <div>
                  <p className="text-xs font-bold text-white">
                    Demonstrativo DRE Completo (PDF)
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Ideal para contabilidade e sócios da barbearia.
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="exportFormat"
                defaultChecked
                className="accent-amber-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-950 cursor-pointer hover:border-neutral-700">
              <div className="flex items-center gap-2.5">
                <span>📊</span>
                <div>
                  <p className="text-xs font-bold text-white">
                    Planilha Detalhada de Vendas (Excel / CSV)
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Linha por linha de cada corte e cerveja vendida.
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="exportFormat"
                className="accent-amber-600"
              />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
