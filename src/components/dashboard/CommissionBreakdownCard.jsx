import { commissionStyles } from "./CommissionBreakdownCard.styles";
import Button from "../ui/Button";

export default function CommissionBreakdownCard({
  barber = {
    id: "barber-1",
    name: "Carlos Silva",
    role: "Master Barber",
    avatar: "CS",
  },
  period = "Semana Atual (01 a 07 de Setembro)",
  summary = {
    grossServices: 2400, // Total faturado em cortes
    serviceCommissionPercent: 50, // 50%
    servicesCommission: 1200, // 50% de 2400

    grossProducts: 380, // Total faturado em produtos
    productCommissionPercent: 10, // 10%
    productsCommission: 38, // 10% de 380

    paymentFeesDeduction: 32.5, // Taxas de cartão rateadas
    advances: 100, // Vales / Adiantamentos pegos

    netCommissionPayable: 1105.5, // Saldo líquido a pagar
    isSettled: false, // Se a folha já foi paga
  },
  onSettlePayment,
  onExportReport,
  className = "",
}) {
  const isSettled = summary.isSettled;

  return (
    <div className={`${commissionStyles.container} ${className}`}>
      {/* 1. CABEÇALHO: Barbeiro, Foto, Período e Status */}
      <div className={commissionStyles.header}>
        <div className={commissionStyles.profileGroup}>
          <div className={commissionStyles.avatar}>
            {barber.avatar || barber.name.slice(0, 2).toUpperCase()}
          </div>
          <div className={commissionStyles.nameWrapper}>
            <h4 className={commissionStyles.barberName}>{barber.name}</h4>
            <p className={commissionStyles.periodLabel}>{period}</p>
          </div>
        </div>

        {/* Badge de Status da Folha */}
        <div
          className={`
            ${commissionStyles.statusBadge}
            ${isSettled ? commissionStyles.statusPaid : commissionStyles.statusPending}
          `}
        >
          <span
            className={`w-2 h-2 rounded-full ${isSettled ? "bg-emerald-400" : "bg-amber-400"}`}
          />
          <span>{isSettled ? "Folha Liquidada ✓" : "Saldo a Pagar"}</span>
        </div>
      </div>

      {/* 2. MÉTRICAS BRUTAS GERADAS PELO PROFISSIONAL */}
      <div className={commissionStyles.metricsRow}>
        <div className={commissionStyles.metricBox}>
          <span className={commissionStyles.metricLabel}>
            Faturamento em Cortes
          </span>
          <span className={commissionStyles.metricValue}>
            R$ {Number(summary.grossServices).toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className={commissionStyles.metricBox}>
          <span className={commissionStyles.metricLabel}>
            Vendas de Bar & Vitrine
          </span>
          <span className={commissionStyles.metricValue}>
            R$ {Number(summary.grossProducts).toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      {/* 3. EXTRATO DETALHADO (CRÉDITOS E DÉBITOS) */}
      <div className={commissionStyles.breakdownList}>
        {/* Crédito: Serviços */}
        <div className={commissionStyles.breakdownRow}>
          <div className={commissionStyles.rowLabel}>
            <span>✂️</span>
            <span>
              Comissão de Serviços ({summary.serviceCommissionPercent}%):
            </span>
          </div>
          <span className={commissionStyles.creditValue}>
            + R${" "}
            {Number(summary.servicesCommission).toFixed(2).replace(".", ",")}
          </span>
        </div>

        {/* Crédito: Produtos */}
        <div className={commissionStyles.breakdownRow}>
          <div className={commissionStyles.rowLabel}>
            <span>🍺</span>
            <span>
              Comissão de Produtos ({summary.productCommissionPercent}%):
            </span>
          </div>
          <span className={commissionStyles.creditValue}>
            + R${" "}
            {Number(summary.productsCommission).toFixed(2).replace(".", ",")}
          </span>
        </div>

        {/* Débito: Taxas da Maquininha */}
        {summary.paymentFeesDeduction > 0 && (
          <div className={commissionStyles.breakdownRow}>
            <div className={commissionStyles.rowLabel}>
              <span>💳</span>
              <span>Dedução de Taxas de Cartão/PIX:</span>
            </div>
            <span className={commissionStyles.debitValue}>
              - R${" "}
              {Number(summary.paymentFeesDeduction)
                .toFixed(2)
                .replace(".", ",")}
            </span>
          </div>
        )}

        {/* Débito: Vales / Adiantamentos */}
        {summary.advances > 0 && (
          <div className={commissionStyles.breakdownRow}>
            <div className={commissionStyles.rowLabel}>
              <span>💵</span>
              <span>Vales & Adiantamentos Concedidos:</span>
            </div>
            <span className={commissionStyles.debitValue}>
              - R$ {Number(summary.advances).toFixed(2).replace(".", ",")}
            </span>
          </div>
        )}
      </div>

      {/* 4. SALDO LÍQUIDO FINAL A RECEBER / PAGO */}
      <div className={commissionStyles.netBox}>
        <div className={commissionStyles.netLabel}>
          <span className={commissionStyles.netTitle}>
            {isSettled
              ? "Comissão Paga ao Profissional"
              : "Saldo Líquido a Pagar"}
          </span>
          <span className={commissionStyles.netSubtitle}>
            {isSettled
              ? "Repasse confirmado no financeiro"
              : "Livre de taxas e adiantamentos"}
          </span>
        </div>

        <span
          className={
            isSettled
              ? commissionStyles.netAmountPaid
              : commissionStyles.netAmount
          }
        >
          R$ {Number(summary.netCommissionPayable).toFixed(2).replace(".", ",")}
        </span>
      </div>

      {/* 5. RODAPÉ DE AÇÕES DA FOLHA */}
      <div className={commissionStyles.footer}>
        <Button
          variant="secondary"
          onClick={onExportReport}
          className="text-xs py-2 px-3.5"
        >
          📄 Exportar Extrato (PDF)
        </Button>

        {!isSettled ? (
          <Button
            variant="primary"
            onClick={onSettlePayment}
            className="text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-500 font-extrabold shadow-md"
          >
            💸 Quitar e Pagar via PIX
          </Button>
        ) : (
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <span>✓</span> Folha Paga e Arquivada
          </span>
        )}
      </div>
    </div>
  );
}
