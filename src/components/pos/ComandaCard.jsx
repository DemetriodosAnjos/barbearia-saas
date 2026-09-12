import { comandaStyles } from "./ComandaCard.styles";
import Button from "../ui/Button";

export default function ComandaCard({
  comanda = {
    id: "CMD-1042",
    clientName: "Rodrigo Faro",
    clientPhone: "(11) 98765-4321",
    barberName: "Carlos Silva",
    status: "open", // 'open' | 'pending_payment' | 'paid'
    openedAt: "14:15",
    services: [
      {
        id: "s1",
        name: "Corte Degradê Navalhado",
        price: 55,
        barberCommission: 27.5,
      },
      {
        id: "s2",
        name: "Barboterapia Tradicional",
        price: 45,
        barberCommission: 22.5,
      },
    ],
    products: [
      {
        id: "p1",
        name: "Cerveja IPA Artesanal",
        quantity: 2,
        unitPrice: 16,
        total: 32,
        sellerCommission: 3.2,
      },
      {
        id: "p2",
        name: "Pomada Matte (50g)",
        quantity: 1,
        unitPrice: 45,
        total: 45,
        sellerCommission: 4.5,
      },
    ],
  },
  onAddItem,
  onRemoveService,
  onRemoveProduct,
  onProceedToPayment,
  onStatusChange,
  className = "",
}) {
  // 1. Cálculos de Subtotais
  const totalServices = (comanda.services || []).reduce(
    (acc, s) => acc + Number(s.price),
    0,
  );
  const totalProducts = (comanda.products || []).reduce(
    (acc, p) => acc + Number(p.total),
    0,
  );
  const totalComanda = totalServices + totalProducts;

  // 2. Cálculo de Rateio de Comissões
  const totalBarberCommission =
    (comanda.services || []).reduce(
      (acc, s) => acc + Number(s.barberCommission || 0),
      0,
    ) +
    (comanda.products || []).reduce(
      (acc, p) => acc + Number(p.sellerCommission || 0),
      0,
    );

  const totalHouseNet = totalComanda - totalBarberCommission;

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
          <span className={comandaStyles.comandaBadge}>#{comanda.id}</span>
          <div>
            <h3 className={comandaStyles.clientName}>
              <span>{comanda.clientName}</span>
              {comanda.clientPhone && (
                <span className="text-xs text-neutral-400 font-normal">
                  ({comanda.clientPhone})
                </span>
              )}
            </h3>
            <p className={comandaStyles.barberMeta}>
              Barbeiro Responsável:{" "}
              <strong className="text-neutral-200">{comanda.barberName}</strong>{" "}
              • Aberta às {comanda.openedAt}
            </p>
          </div>
        </div>

        {/* Status da Comanda */}
        <div className={`${comandaStyles.statusBadge} ${currentStatus.style}`}>
          <span className={`w-2 h-2 rounded-full ${currentStatus.dot}`} />
          <span>{currentStatus.label}</span>
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
          <span>Comissão Total do Barbeiro ({comanda.barberName}):</span>
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
