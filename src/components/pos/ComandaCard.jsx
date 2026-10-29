import { useState } from "react";
import { comandaStyles } from "./ComandaCard.styles";
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Plus,
  Pencil,
  QrCode,
  Scissors,
  Beer,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function ComandaCard({
  comanda = {},
  onAddItem,
  onEditComanda,
  onRemoveService,
  onRemoveProduct,
  onProceedToPayment,
  onPayMercadoPago,
  onStatusChange,
  className = "",
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Normalização defensiva dos serviços e produtos
  const servicesList = Array.isArray(comanda?.services) ? comanda.services : [];
  const productsList = Array.isArray(comanda?.products) ? comanda.products : [];

  const clientName =
    comanda?.clientName || comanda?.client_name || "Cliente sem Identificação";
  const clientPhone = comanda?.clientPhone || comanda?.client_phone || "";
  const barberName =
    comanda?.barberName || comanda?.barber_name || "Barbeiro da Casa";
  const openedAt = comanda?.openedAt || comanda?.opened_at || "Recém-aberta";
  const comandaId = comanda?.id || "NOVA";

  // Cálculos financeiros defensivos
  const totalServices = servicesList.reduce(
    (acc, s) => acc + Number(s.price || 0),
    0,
  );

  const totalProducts = productsList.reduce(
    (acc, p) =>
      acc +
      Number(
        p.total ||
          Number(p.quantity || 1) * Number(p.unitPrice || p.price || 0),
      ),
    0,
  );

  const totalComanda = totalServices + totalProducts;

  // Rateio de comissão
  const totalBarberCommission =
    servicesList.reduce(
      (acc, s) =>
        acc +
        Number(
          s.barberCommission ||
            s.barber_commission ||
            Number(s.price || 0) * 0.5,
        ),
      0,
    ) +
    productsList.reduce(
      (acc, p) =>
        acc +
        Number(
          p.sellerCommission ||
            p.seller_commission ||
            Number(p.total || 0) * 0.1,
        ),
      0,
    );

  const totalHouseNet = Math.max(0, totalComanda - totalBarberCommission);

  // Status de cancelamento e paleta
  const isCancelled =
    comanda.status === "cancelled" || comanda.status === "cancelado";
  const isPaid = comanda.status === "paid" || Boolean(comanda.isPaid);

  const statusConfig = {
    open: {
      label: "Na Cadeira (Aberta)",
      dot: "bg-emerald-400",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
    },
    pending_payment: {
      label: "Pendente (Aguardando)",
      dot: "bg-amber-400 animate-pulse",
      border: "border-amber-500/30",
      text: "text-amber-400",
    },
    paid: {
      label: "Pago (Liquidado)",
      dot: "bg-emerald-500",
      border: "border-emerald-600/40",
      text: "text-emerald-300",
    },
    cancelled: {
      label: "Cancelado",
      dot: "bg-red-500",
      border: "border-red-500/40",
      text: "text-red-400",
    },
  };

  const currentStatus = isCancelled
    ? statusConfig.cancelled
    : statusConfig[comanda.status] || statusConfig.open;

  return (
    <div
      className={`${comandaStyles.container} ${
        isCancelled
          ? "opacity-75 border-red-950/50 bg-neutral-950/40"
          : isPaid
          ? "border-neutral-800/80 bg-neutral-900/60"
          : "border-neutral-800 bg-neutral-900/90"
      } ${className}`}
    >
      {/* ======================================================== */}
      {/* LINHA VISÍVEL PRINCIPAL: ELEMENTOS EM GRID ALINHADO     */}
      {/* ======================================================== */}
      <div className={comandaStyles.rowVisible}>
        {/* 1. NOME DO CLIENTE (Alinhado à esquerda; Tag amarela ocultada) */}
        <div className={comandaStyles.clientColumn}>
          <div className={comandaStyles.clientInfo}>
            <h3
              className={`${comandaStyles.clientName} ${
                isCancelled ? "line-through opacity-60 text-neutral-400" : ""
              }`}
            >
              <span>{clientName}</span>
            </h3>
            {clientPhone && (
              <span className={comandaStyles.clientPhone}>{clientPhone}</span>
            )}
          </div>
        </div>

        {/* 2. PROFISSIONAL RESPONSÁVEL (Alinhado à esquerda) */}
        <div className={comandaStyles.barberColumn}>
          <span className={comandaStyles.barberLabel}>Profissional Responsável</span>
          <span className={comandaStyles.barberName}>{barberName}</span>
          <span className={comandaStyles.barberMeta}>Aberta às {openedAt}</span>
        </div>

        {/* 3. TOTAL DOS SERVIÇOS (Centralizado) */}
        <div className={comandaStyles.priceColumn}>
          <span className={comandaStyles.priceLabel}>Total dos Serviços</span>
          <span
            className={`${comandaStyles.priceValue} ${
              isPaid ? "text-emerald-400" : isCancelled ? "text-neutral-500 line-through" : "text-amber-400"
            }`}
          >
            R$ {totalComanda.toFixed(2).replace(".", ",")}
          </span>
          <span className={comandaStyles.priceSub}>
            {servicesList.length} serviço(s) {productsList.length > 0 ? `· ${productsList.length} prod.` : ""}
          </span>
        </div>

        {/* 4. STATUS COM OPÇÃO EXPANSÍVEL (Centralizado) */}
        <div className={comandaStyles.statusColumn}>
          <div className={comandaStyles.statusWrapper}>
            <span className={`${comandaStyles.statusDot} ${currentStatus.dot}`} />
            <select
              value={comanda.status || "pending_payment"}
              onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
              className={comandaStyles.statusSelect}
              aria-label={`Alterar status da comanda #${comandaId}`}
            >
              <option value="pending_payment">Pendente</option>
              <option value="open">Na Cadeira</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        {/* 5. AÇÕES (Centralizado com botões apenas ícones + tooltip no hover + Chevron) */}
        <div className={comandaStyles.actionsGroup}>
          {/* AÇÃO 1: PAGAR COM PIX (Apenas ícone com tooltip no hover) */}
          {!isPaid && !isCancelled && (
            <div className={comandaStyles.actionTooltipWrapper}>
              <button
                type="button"
                onClick={() => onPayMercadoPago && onPayMercadoPago(comanda)}
                className={comandaStyles.btnPix}
                aria-label="Pagar com Pix"
                title="Pagar com Pix"
              >
                <QrCode className="w-4 h-4" />
              </button>
              <div className={comandaStyles.actionTooltip}>
                <span>Pagar com Pix</span>
                <div className={comandaStyles.actionTooltipArrow} />
              </div>
            </div>
          )}

          {/* AÇÃO 2: QUITAR NO CAIXA (Apenas ícone com tooltip no hover) */}
          {!isPaid && !isCancelled ? (
            <div className={comandaStyles.actionTooltipWrapper}>
              <button
                type="button"
                onClick={() => onProceedToPayment && onProceedToPayment(comanda)}
                className={comandaStyles.btnCashier}
                aria-label="Quitar no Caixa"
                title="Quitar no Caixa"
              >
                <DollarSign className="w-4 h-4" />
              </button>
              <div className={comandaStyles.actionTooltip}>
                <span>Quitar no Caixa</span>
                <div className={comandaStyles.actionTooltipArrow} />
              </div>
            </div>
          ) : isPaid ? (
            <div className={comandaStyles.actionTooltipWrapper}>
              <div
                className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center cursor-default shrink-0"
                aria-label="Liquidada"
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className={comandaStyles.actionTooltip}>
                <span>Liquidada</span>
                <div className={comandaStyles.actionTooltipArrow} />
              </div>
            </div>
          ) : (
            <div className={comandaStyles.actionTooltipWrapper}>
              <div
                className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center cursor-default shrink-0"
                aria-label="Cancelada"
              >
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className={comandaStyles.actionTooltip}>
                <span>Cancelada</span>
                <div className={comandaStyles.actionTooltipArrow} />
              </div>
            </div>
          )}

          {/* AÇÃO 3: ADICIONAR ITEM (Apenas ícone com tooltip no hover) */}
          {!isPaid && !isCancelled && (
            <div className={comandaStyles.actionTooltipWrapper}>
              <button
                type="button"
                onClick={() => onAddItem && onAddItem(comanda)}
                className={comandaStyles.btnAddItem}
                aria-label="Adicionar Item"
                title="Adicionar Item"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className={comandaStyles.actionTooltip}>
                <span>Adicionar Item</span>
                <div className={comandaStyles.actionTooltipArrow} />
              </div>
            </div>
          )}

          {/* AÇÃO 4: EDITAR DADOS (Apenas ícone com tooltip no hover) */}
          <div className={comandaStyles.actionTooltipWrapper}>
            <button
              type="button"
              onClick={() => onEditComanda && onEditComanda(comanda)}
              className={comandaStyles.btnEdit}
              aria-label="Editar Dados"
              title="Editar Dados"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <div className={comandaStyles.actionTooltip}>
              <span>Editar Dados</span>
              <div className={comandaStyles.actionTooltipArrow} />
            </div>
          </div>

          {/* BOTÃO DE EXPANSÃO (CHEVRON DOWN / UP) LOCALIZADO NA EXTREMA DIREITA */}
          <div className={comandaStyles.actionTooltipWrapper}>
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className={comandaStyles.expandBtn}
              title={isExpanded ? "Recolher detalhes da comanda" : "Expandir detalhes da comanda"}
              aria-label={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-amber-400 transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400 hover:text-amber-400 transition-transform" />
              )}
            </button>
            <div className={comandaStyles.actionTooltipRight}>
              <span>{isExpanded ? "Recolher Detalhes" : "Expandir Detalhes"}</span>
              <div className={comandaStyles.actionTooltipArrowRight} />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DETALHAMENTO EXPANDIDO (REVELADO AO CLICAR NO CHEVRON)   */}
      {/* ======================================================== */}
      {isExpanded && (
        <div className={comandaStyles.expandedBody}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SERVIÇOS EXECUTADOS */}
            <div className={comandaStyles.section}>
              <div className={comandaStyles.sectionTitle}>
                <span className="flex items-center gap-1.5 text-neutral-300 font-bold">
                  <Scissors className="w-3.5 h-3.5 text-amber-500" />
                  <span>Serviços Executados ({servicesList.length})</span>
                </span>
                <span className="text-neutral-200 font-mono font-bold">
                  R$ {totalServices.toFixed(2).replace(".", ",")}
                </span>
              </div>

              <div className="space-y-1.5">
                {servicesList.map((serv) => (
                  <div key={serv.id} className={comandaStyles.itemRow}>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className={comandaStyles.itemName}>{serv.name}</p>
                      <span className={comandaStyles.itemCommission}>
                        Comissão do barbeiro (50%): R${" "}
                        {Number(
                          serv.barberCommission ||
                            Number(serv.price || 0) * 0.5,
                        )
                          .toFixed(2)
                          .replace(".", ",")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={comandaStyles.itemPrice}>
                        R$ {Number(serv.price || 0).toFixed(2).replace(".", ",")}
                      </span>
                      {!isPaid && onRemoveService && (
                        <button
                          type="button"
                          onClick={() => onRemoveService(serv.id)}
                          className={comandaStyles.itemDeleteBtn}
                          title="Remover serviço"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {servicesList.length === 0 && (
                  <p className="text-xs text-neutral-500 italic p-2 bg-neutral-950/40 rounded-xl">
                    Nenhum serviço lançado nesta comanda.
                  </p>
                )}
              </div>
            </div>

            {/* PRODUTOS CONSUMIDOS (BAR & VITRINE) */}
            <div className={comandaStyles.section}>
              <div className={comandaStyles.sectionTitle}>
                <span className="flex items-center gap-1.5 text-neutral-300 font-bold">
                  <Beer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Consumo de Bar & Vitrine ({productsList.length})</span>
                </span>
                <span className="text-neutral-200 font-mono font-bold">
                  R$ {totalProducts.toFixed(2).replace(".", ",")}
                </span>
              </div>

              <div className="space-y-1.5">
                {productsList.map((prod) => (
                  <div key={prod.id} className={comandaStyles.itemRow}>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className={comandaStyles.itemName}>
                        {prod.quantity}x {prod.name}
                      </p>
                      <span className={comandaStyles.itemCommission}>
                        Comissão de venda: R${" "}
                        {Number(prod.sellerCommission || 0)
                          .toFixed(2)
                          .replace(".", ",")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={comandaStyles.itemPrice}>
                        R${" "}
                        {Number(
                          prod.total ||
                            Number(prod.quantity || 1) *
                              Number(prod.unitPrice || prod.price || 0),
                        )
                          .toFixed(2)
                          .replace(".", ",")}
                      </span>
                      {!isPaid && onRemoveProduct && (
                        <button
                          type="button"
                          onClick={() => onRemoveProduct(prod.id)}
                          className={comandaStyles.itemDeleteBtn}
                          title="Remover produto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {productsList.length === 0 && (
                  <p className="text-xs text-neutral-500 italic p-2 bg-neutral-950/40 rounded-xl">
                    Nenhum produto consumido até o momento.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* RATEIO FINANCEIRO DE COMISSÕES */}
          <div className={comandaStyles.commissionBox}>
            <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 pb-1 border-b border-neutral-800/80">
              <span>Rateio Financeiro da Comanda</span>
              <span>Cálculo Automático em Tempo Real</span>
            </div>

            <div className={comandaStyles.commissionRow}>
              <span>Comissão do Barbeiro ({barberName}):</span>
              <span className={comandaStyles.commissionBarber}>
                + R$ {totalBarberCommission.toFixed(2).replace(".", ",")}
              </span>
            </div>

            <div className={comandaStyles.commissionRow}>
              <span>Líquido da Barbearia (Casa):</span>
              <span className={comandaStyles.commissionHouse}>
                R$ {totalHouseNet.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
