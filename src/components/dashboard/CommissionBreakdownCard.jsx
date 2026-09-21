import { commissionStyles } from "./CommissionBreakdownCard.styles";
import Button from "../ui/Button";

export default function CommissionBreakdownCard({
  barber,
  period = "Período Atual",
  summary = {},
  onSettlePayment,
  onExportReport,
  className = "",
}) {
  // 1. Defesa: se não houver dados do barbeiro, não renderiza o card
  if (!barber) return null;

  // 2. Normalização Segura: valores reais ou zero (sem números fictícios)
  const grossServices = Number(
    summary.grossServices || summary.gross_services || 0,
  );
  const serviceCommissionPercent = Number(
    summary.serviceCommissionPercent ||
      summary.service_commission_percent ||
      barber.commission_percentage ||
      50,
  );
  const servicesCommission = Number(
    summary.servicesCommission || summary.services_commission || 0,
  );

  const grossProducts = Number(
    summary.grossProducts || summary.gross_products || 0,
  );
  const productCommissionPercent = Number(
    summary.productCommissionPercent ||
      summary.product_commission_percent ||
      10,
  );
  const productsCommission = Number(
    summary.productsCommission || summary.products_commission || 0,
  );

  const paymentFeesDeduction = Number(
    summary.paymentFeesDeduction || summary.payment_fees_deduction || 0,
  );
  const advances = Number(summary.advances || 0);
  const netCommissionPayable = Number(
    summary.netCommissionPayable || summary.net_commission_payable || 0,
  );
  const isSettled = Boolean(summary.isSettled ?? summary.is_settled);

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
            R$ {grossServices.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className={commissionStyles.metricBox}>
          <span className={commissionStyles.metricLabel}>
            Vendas de Bar & Vitrine
          </span>
          <span className={commissionStyles.metricValue}>
            R$ {grossProducts.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      {/* 3. EXTRATO DETALHADO (CRÉDITOS E DÉBITOS) */}
      <div className={commissionStyles.breakdownList}>
        {/* Crédito: Serviços */}
        <div className={commissionStyles.breakdownRow}>
          <div className={commissionStyles.rowLabel}>
            <span>✂️</span>
            <span>Comissão de Serviços ({serviceCommissionPercent}%):</span>
          </div>
          <span className={commissionStyles.creditValue}>
            + R$ {servicesCommission.toFixed(2).replace(".", ",")}
          </span>
        </div>

        {/* Crédito: Produtos */}
        <div className={commissionStyles.breakdownRow}>
          <div className={commissionStyles.rowLabel}>
            <span>🍺</span>
            <span>Comissão de Produtos ({productCommissionPercent}%):</span>
          </div>
          <span className={commissionStyles.creditValue}>
            + R$ {productsCommission.toFixed(2).replace(".", ",")}
          </span>
        </div>

        {/* Débito: Taxas da Maquininha */}
        {paymentFeesDeduction > 0 && (
          <div className={commissionStyles.breakdownRow}>
            <div className={commissionStyles.rowLabel}>
              <span>💳</span>
              <span>Dedução de Taxas de Cartão/PIX:</span>
            </div>
            <span className={commissionStyles.debitValue}>
              - R$ {paymentFeesDeduction.toFixed(2).replace(".", ",")}
            </span>
          </div>
        )}

        {/* Débito: Vales / Adiantamentos */}
        {advances > 0 && (
          <div className={commissionStyles.breakdownRow}>
            <div className={commissionStyles.rowLabel}>
              <span>💵</span>
              <span>Vales & Adiantamentos Concedidos:</span>
            </div>
            <span className={commissionStyles.debitValue}>
              - R$ {advances.toFixed(2).replace(".", ",")}
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
          R$ {netCommissionPayable.toFixed(2).replace(".", ",")}
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
