import { useState } from "react";
import { chartStyles } from "./FinancialChart.styles";

export default function FinancialChart({
  weeklyData = [],
  monthlyData = [],
  yearlyData = [],
  className = "",
}) {
  const [activePeriod, setActivePeriod] = useState("week"); // 'week' | 'month' | 'year'

  // Seleciona o dataset ativo conforme o período escolhido
  const currentData =
    activePeriod === "week"
      ? weeklyData
      : activePeriod === "month"
        ? monthlyData
        : yearlyData;

  // 1. Cálculos de Faturamento Total e Maior Valor do Gráfico
  const totalRevenue = currentData.reduce(
    (acc, item) => acc + (item.services || 0) + (item.products || 0),
    0,
  );

  const totalServices = currentData.reduce(
    (acc, item) => acc + (item.services || 0),
    0,
  );
  const totalProducts = currentData.reduce(
    (acc, item) => acc + (item.products || 0),
    0,
  );

  // Descobre o maior total para calibrar a escala das alturas em 100%
  const maxDayTotal = Math.max(
    ...currentData.map((d) => (d.services || 0) + (d.products || 0)),
    100,
  );

  return (
    <div className={`${chartStyles.container} ${className}`}>
      {/* 1. CABEÇALHO DO GRÁFICO */}
      <div className={chartStyles.header}>
        <div className={chartStyles.titleWrapper}>
          <h3 className={chartStyles.title}>
            <span>📈</span>
            <span>Evolução de Faturamento & Vendas</span>
          </h3>
          <p className={chartStyles.subtitle}>
            Receita detalhada por período dividida entre serviços de cadeira e
            vendas de produtos.
          </p>
        </div>

        {/* Alternador de Período (Semana | Mês | Ano) */}
        <div className={chartStyles.periodToggle}>
          <button
            type="button"
            onClick={() => setActivePeriod("week")}
            className={`${chartStyles.periodBtn} ${activePeriod === "week" ? chartStyles.periodActive : chartStyles.periodInactive}`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setActivePeriod("month")}
            className={`${chartStyles.periodBtn} ${activePeriod === "month" ? chartStyles.periodActive : chartStyles.periodInactive}`}
          >
            Mês
          </button>
          <button
            type="button"
            onClick={() => setActivePeriod("year")}
            className={`${chartStyles.periodBtn} ${activePeriod === "year" ? chartStyles.periodActive : chartStyles.periodInactive}`}
          >
            Ano
          </button>
        </div>
      </div>

      {/* 2. RESUMO DE VALORES E LEGENDA */}
      <div className={chartStyles.summaryRow}>
        <div className={chartStyles.totalFaturadoBox}>
          <span className={chartStyles.totalLabel}>Receita do Período</span>
          <span className={chartStyles.totalValue}>
            R$ {totalRevenue.toFixed(2).replace(".", ",")}
          </span>
        </div>

        {/* Legenda das Cores */}
        <div className={chartStyles.legendWrapper}>
          <div className={chartStyles.legendItem}>
            <span className={chartStyles.legendDotServices} />
            <span>Serviços (R$ {totalServices.toFixed(0)})</span>
          </div>

          <div className={chartStyles.legendItem}>
            <span className={chartStyles.legendDotProducts} />
            <span>Bar & Vitrine (R$ {totalProducts.toFixed(0)})</span>
          </div>
        </div>
      </div>

      {/* 3. ÁREA DAS BARRAS EMPILHADAS (CANVAS) */}
      <div className={chartStyles.chartArea}>
        {/* Linhas de Grade de Fundo (25%, 50%, 75%, 100%) */}
        <div className={chartStyles.gridLinesWrapper}>
          <div className={chartStyles.gridLine}>
            <span>R$ {maxDayTotal.toFixed(0)}</span>
          </div>
          <div className={chartStyles.gridLine}>
            <span>R$ {(maxDayTotal * 0.66).toFixed(0)}</span>
          </div>
          <div className={chartStyles.gridLine}>
            <span>R$ {(maxDayTotal * 0.33).toFixed(0)}</span>
          </div>
          <div className={chartStyles.gridLine}>
            <span>R$ 0</span>
          </div>
        </div>

        {/* Colunas do Gráfico */}
        {currentData.map((item, idx) => {
          const itemTotal = (item.services || 0) + (item.products || 0);
          const totalHeightPercent = (itemTotal / maxDayTotal) * 100;
          const isClosed = item.isClosed || itemTotal === 0;

          // Proporção interna do empilhamento
          const servicesHeightPercent =
            itemTotal > 0 ? (item.services / itemTotal) * 100 : 0;
          const productsHeightPercent =
            itemTotal > 0 ? (item.products / itemTotal) * 100 : 0;

          return (
            <div key={idx} className={chartStyles.barColumn}>
              {/* Tooltip Flutuante no Hover */}
              {!isClosed && (
                <div className={chartStyles.tooltip}>
                  <strong className="text-white border-b border-neutral-800 pb-1 mb-1">
                    {item.fullLabel || item.label}
                  </strong>
                  <div className="flex justify-between text-amber-400">
                    <span>✂️ Serviços:</span>
                    <strong className="font-mono">R$ {item.services}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>🍺 Produtos:</span>
                    <strong className="font-mono">R$ {item.products}</strong>
                  </div>
                  <div className="flex justify-between text-white font-extrabold border-t border-neutral-800 pt-1 mt-1">
                    <span>Total:</span>
                    <span className="font-mono">R$ {itemTotal}</span>
                  </div>
                </div>
              )}

              {/* Barra Empilhada (Stacked Bar) */}
              {isClosed ? (
                <div
                  style={{ height: "18px" }}
                  className={chartStyles.barClosed}
                  title="Dia Fechado"
                />
              ) : (
                <div
                  style={{ height: `${Math.max(totalHeightPercent, 6)}%` }}
                  className={chartStyles.stackedBar}
                >
                  {/* Topo da barra: Produtos */}
                  {item.products > 0 && (
                    <div
                      style={{ height: `${productsHeightPercent}%` }}
                      className={chartStyles.barProducts}
                    />
                  )}
                  {/* Base da barra: Serviços */}
                  {item.services > 0 && (
                    <div
                      style={{ height: `${servicesHeightPercent}%` }}
                      className={chartStyles.barServices}
                    />
                  )}
                </div>
              )}

              {/* Rótulo do Eixo X (Seg, Ter, Qua...) */}
              <span className={chartStyles.xLabel}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
