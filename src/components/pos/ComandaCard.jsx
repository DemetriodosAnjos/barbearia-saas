import { comandaStyles } from "./ComandaCard.styles";
import Button from "../ui/Button";

export default function ComandaCard({
  // [Remoção do mock estático de Rodrigo Faro / Cerveja e suporte a objeto real ou vazio]
  comanda = {},
  onAddItem,
  onRemoveService,
  onRemoveProduct,
  onProceedToPayment,
  onStatusChange,
  className = "",
}) {
  // [Proteção defensiva e normalização de chaves do Supabase (snake_case e camelCase)]
  const servicesList = Array.isArray(comanda?.services) ? comanda.services : [];
  const productsList = Array.isArray(comanda?.products) ? comanda.products : [];

  const clientName =
    comanda?.clientName || comanda?.client_name || "Cliente sem Identificação";
  const clientPhone = comanda?.clientPhone || comanda?.client_phone || "";
  const barberName =
    comanda?.barberName || comanda?.barber_name || "Barbeiro da Casa";
  const openedAt = comanda?.openedAt || comanda?.opened_at || "Recém-aberta";
  const comandaId = comanda?.id || "NOVA";

  // [Método reduce: cálculo defensivo de subtotais de serviços e produtos reais]
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

  // [Método reduce: cálculo em tempo real das comissões de profissionais]
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

  // 3. Estilos de Status
  const statusConfig = {
    open: {
      label: "Na Cadeira (Aberta)",
      style: comandaStyles.statusOpen,
      dot: "bg-emerald-400",
    },
    pending_payment: {
      label: "Aguardando Pagamento",
      style: comandaStyles.statusPending,
      dot: "bg-amber-400",
    },
    paid: {
      label: "Paga e Finalizada",
      style: comandaStyles.statusPaid,
      dot: "bg-neutral-500",
    },
  };

  const currentStatus = statusConfig[comanda.status] || statusConfig.open;

  return (
    <div className={`${comandaStyles.container} ${className}`}>
      {/* 1. CABEÇALHO DA COMANDA */}
      <div className={comandaStyles.header}>
        <div className={comandaStyles.identityWrapper}>
          {/* [Exibição do identificador real da comanda] */}
          <span className={comandaStyles.comandaBadge}>#{comandaId}</span>
          <div>
            <h3 className={comandaStyles.clientName}>
              {/* [Nome e telefone reais vinculados ao cliente da comanda] */}
              <span>{clientName}</span>
              {clientPhone && (
                <span className="text-xs text-neutral-400 font-normal">
                  ({clientPhone})
                </span>
              )}
            </h3>
            <p className={comandaStyles.barberMeta}>
              {/* [Barbeiro e horário real de abertura da comanda] */}
              Barbeiro Responsável:{" "}
              <strong className="text-neutral-200">{barberName}</strong> •
              Aberta às {openedAt}
            </p>
          </div>
        </div>
      </div>

      {/* 2. LISTAGEM DE SERVIÇOS EXECUTADOS */}
      <div className={comandaStyles.section}>
        <div className={comandaStyles.sectionTitle}>
          <span>✂️ Serviços Executados ({comanda.services.length})</span>
          <span className="text-neutral-200 font-mono">
            R$ {totalServices.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className="space-y-1.5">
          {comanda.services.map((serv) => (
            <div key={serv.id} className={comandaStyles.itemRow}>
              <div>
                <p className={comandaStyles.itemName}>{serv.name}</p>
                <span className={comandaStyles.itemCommission}>
                  Comissão do barbeiro (50%): R${" "}
                  {Number(serv.barberCommission).toFixed(2).replace(".", ",")}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={comandaStyles.itemPrice}>
                  R$ {Number(serv.price).toFixed(2).replace(".", ",")}
                </span>
                {comanda.status !== "paid" && onRemoveService && (
                  <button
                    type="button"
                    onClick={() => onRemoveService(serv.id)}
                    className={comandaStyles.itemDeleteBtn}
                    title="Remover serviço"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LISTAGEM DE PRODUTOS CONSUMIDOS (BAR & VITRINE) */}
      <div className={comandaStyles.section}>
        <div className={comandaStyles.sectionTitle}>
          <span>🍺 Consumo de Bar & Vitrine ({comanda.products.length})</span>
          <span className="text-neutral-200 font-mono">
            R$ {totalProducts.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className="space-y-1.5">
          {comanda.products.map((prod) => (
            <div key={prod.id} className={comandaStyles.itemRow}>
              <div>
                <p className={comandaStyles.itemName}>
                  {prod.quantity}x {prod.name}
                </p>
                <span className={comandaStyles.itemCommission}>
                  Comissão de venda: R${" "}
                  {Number(prod.sellerCommission).toFixed(2).replace(".", ",")}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={comandaStyles.itemPrice}>
                  R$ {Number(prod.total).toFixed(2).replace(".", ",")}
                </span>
                {comanda.status !== "paid" && onRemoveProduct && (
                  <button
                    type="button"
                    onClick={() => onRemoveProduct(prod.id)}
                    className={comandaStyles.itemDeleteBtn}
                    title="Remover produto"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. TRANSPARÊNCIA: RATEIO DE COMISSÕES */}
      <div className={comandaStyles.commissionBox}>
        <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 pb-1 border-b border-neutral-800/80">
          <span>Rateio Financeiro da Comanda</span>
          <span>Cálculo em Tempo Real</span>
        </div>

        <div className={comandaStyles.commissionRow}>
          {/* [Exibição do barbeiro real que receberá o repasse] */}
          <span>Comissão Total do Barbeiro ({barberName}):</span>
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

      {/* 5. RESUMO DE TOTAIS E BOTÃO DE PAGAMENTO */}
      <div className={comandaStyles.summaryFooter}>
        <div className={comandaStyles.totalRow}>
          <span className={comandaStyles.totalLabel}>Total a Pagar</span>
          <span className={comandaStyles.totalValue}>
            R$ {totalComanda.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className={comandaStyles.actionsRow}>
          {comanda.status !== "paid" && (
            <Button
              variant="secondary"
              onClick={onAddItem}
              className="text-xs py-2 px-3.5"
            >
              + Adicionar Item
            </Button>
          )}

          {comanda.status === "open" && (
            <Button
              variant="outline"
              onClick={() =>
                onStatusChange && onStatusChange("pending_payment")
              }
              className="text-xs py-2 px-3.5"
            >
              Enviar ao Caixa
            </Button>
          )}

          {comanda.status !== "paid" ? (
            <Button
              variant="primary"
              onClick={() => onProceedToPayment && onProceedToPayment(comanda)}
              className="text-xs py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 font-extrabold shadow-md"
            >
              💳 Ir para Pagamento
            </Button>
          ) : (
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> Comanda Liquidada no Caixa
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
