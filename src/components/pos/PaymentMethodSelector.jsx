import { useState } from "react";
import { paymentStyles } from "./PaymentMethodSelector.styles";
import Button from "../ui/Button";
import Input from "../ui/Input";

export default function PaymentMethodSelector({
  totalAmount = 177, // Valor total da comanda
  client = {
    name: "Rodrigo Faro",
    cpf: "123.456.789-00",
    hasSubscription: true,
    subscriptionPlan: "Clube do Barba VIP",
  },
  onFinishPayment,
  onCancel,
  className = "",
}) {
  const [activeMethod, setActiveMethod] = useState("pix"); // pix | card | cash | subscription | credit_account (fiado)

  // Lista dos pagamentos adicionados (para suportar Split Payment)
  const [payments, setPayments] = useState([]);

  // Estados dos formulários de cada método
  const [amountInput, setAmountInput] = useState("");
  const [cashTendered, setCashTendered] = useState(""); // Valor em cédulas entregue pelo cliente
  const [cardType, setCardType] = useState("credit"); // credit | debit

  // 1. Cálculos de Saldo Restante
  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const remainingBalance = Math.max(0, totalAmount - totalPaid);
  const isFullyPaid = totalPaid >= totalAmount;

  // 2. Adicionar uma parcela de pagamento ao rateio
  const handleAddPayment = (methodName, amountToAdd, details = {}) => {
    const parsedAmount = Math.min(Number(amountToAdd), remainingBalance);

    if (parsedAmount <= 0 || isNaN(parsedAmount)) {
      alert("Por favor, insira um valor válido para lançar.");
      return;
    }

    setPayments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        method: methodName,
        amount: parsedAmount,
        ...details,
      },
    ]);

    setAmountInput("");
    setCashTendered("");
  };

  // 3. Remover uma parcela de pagamento lançada
  const handleRemovePayment = (id) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  // 4. Preenche o valor restante no input automaticamente
  const handleFillRemaining = () => {
    setAmountInput(remainingBalance.toFixed(2));
  };

  // 5. Cálculo do Troco em Dinheiro
  const changeDue =
    activeMethod === "cash" && Number(cashTendered) > Number(amountInput)
      ? Number(cashTendered) - Number(amountInput)
      : 0;

  return (
    <div className={`${paymentStyles.container} ${className}`}>
      {/* 1. CABEÇALHO COM VALORES DO CAIXA */}
      <div className={paymentStyles.header}>
        <div className={paymentStyles.totalBox}>
          <span className={paymentStyles.totalLabel}>Total da Comanda</span>
          <span className={paymentStyles.totalAmount}>
            R$ {totalAmount.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className={paymentStyles.balanceBadge}>
          <span className={paymentStyles.totalLabel}>Status da Liquidação</span>
          {isFullyPaid ? (
            <span className={paymentStyles.balancePaid}>
              ✓ TOTAL QUITADO (100%)
            </span>
          ) : (
            <span className={paymentStyles.balancePending}>
              Falta quitar: R$ {remainingBalance.toFixed(2).replace(".", ",")}
            </span>
          )}
        </div>
      </div>

      {/* 2. SELETOR DE FORMAS DE PAGAMENTO */}
      <div className={paymentStyles.methodsGrid}>
        <button
          type="button"
          onClick={() => {
            setActiveMethod("pix");
            handleFillRemaining();
          }}
          className={`${paymentStyles.methodButton} ${activeMethod === "pix" ? paymentStyles.methodActive : paymentStyles.methodInactive}`}
        >
          <span className="text-base">📱</span>
          <span className="text-[11px] font-bold">PIX</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMethod("card");
            handleFillRemaining();
          }}
          className={`${paymentStyles.methodButton} ${activeMethod === "card" ? paymentStyles.methodActive : paymentStyles.methodInactive}`}
        >
          <span className="text-base">💳</span>
          <span className="text-[11px] font-bold">Cartão</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMethod("cash");
            handleFillRemaining();
          }}
          className={`${paymentStyles.methodButton} ${activeMethod === "cash" ? paymentStyles.methodActive : paymentStyles.methodInactive}`}
        >
          <span className="text-base">💵</span>
          <span className="text-[11px] font-bold">Dinheiro</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMethod("subscription");
            handleFillRemaining();
          }}
          className={`${paymentStyles.methodButton} ${activeMethod === "subscription" ? paymentStyles.methodActive : paymentStyles.methodInactive}`}
        >
          <span className="text-base">👑</span>
          <span className="text-[11px] font-bold">Clube VIP</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMethod("credit_account");
            handleFillRemaining();
          }}
          className={`${paymentStyles.methodButton} ${activeMethod === "credit_account" ? paymentStyles.methodActive : paymentStyles.methodInactive}`}
        >
          <span className="text-base">📝</span>
          <span className="text-[11px] font-bold">Fiado</span>
        </button>
      </div>

      {/* 3. PAINEL ESPECÍFICO DO MÉTODO ATIVO */}
      {!isFullyPaid && (
        <div className={paymentStyles.methodPanel}>
          {/* PIX */}
          {activeMethod === "pix" && (
            <div className="space-y-3">
              <div className={paymentStyles.panelTitle}>
                <span>📱 Pagamento Instantâneo via PIX</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                {/* QR Code Simulado */}
                <div className="w-24 h-24 bg-white p-2 rounded-xl flex items-center justify-center shrink-0">
                  <div className="w-full h-full bg-neutral-950 flex items-center justify-center text-[9px] text-white font-mono text-center">
                    [QR CODE PIX DINÂMICO]
                  </div>
                </div>
                <div className="space-y-1.5 text-left flex-1">
                  <p className="text-xs text-neutral-300 font-medium">
                    Aponte a câmera do aplicativo do banco ou use a chave copia
                    e cola.
                  </p>
                  <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Aguardando confirmação bancária...
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      placeholder="Valor a lançar"
                      type="number"
                      value={amountInput || remainingBalance}
                      onChange={(e) => setAmountInput(e.target.value)}
                    />
                    <Button
                      variant="primary"
                      onClick={() =>
                        handleAddPayment("PIX", amountInput || remainingBalance)
                      }
                      className="text-xs py-2 px-3 shrink-0"
                    >
                      + Confirmar PIX
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CARTÃO */}
          {activeMethod === "card" && (
            <div className="space-y-3">
              <div className={paymentStyles.panelTitle}>
                <span>💳 Maquininha de Cartão</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCardType("credit")}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-bold ${cardType === "credit" ? "bg-amber-600 border-amber-500 text-white" : "bg-neutral-900 border-neutral-800 text-neutral-400"}`}
                >
                  Crédito
                </button>
                <button
                  type="button"
                  onClick={() => setCardType("debit")}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-bold ${cardType === "debit" ? "bg-amber-600 border-amber-500 text-white" : "bg-neutral-900 border-neutral-800 text-neutral-400"}`}
                >
                  Débito
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Input
                  label="Valor a passar no Cartão (R$)"
                  type="number"
                  value={amountInput || remainingBalance}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
                <Button
                  variant="primary"
                  onClick={() =>
                    handleAddPayment(
                      `Cartão (${cardType === "credit" ? "Crédito" : "Débito"})`,
                      amountInput || remainingBalance,
                    )
                  }
                  className="text-xs py-2 px-3 mt-5 shrink-0"
                >
                  + Lançar Cartão
                </Button>
              </div>
            </div>
          )}

          {/* DINHEIRO COM TROCO */}
          {activeMethod === "cash" && (
            <div className="space-y-3">
              <div className={paymentStyles.panelTitle}>
                <span>💵 Pagamento em Dinheiro Físico</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Valor Cobrado (R$)"
                  type="number"
                  value={amountInput || remainingBalance}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
                <Input
                  label="Valor Entregue pelo Cliente (R$)"
                  placeholder="Ex: 200,00"
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  helperText="O sistema calcula o troco automaticamente."
                />
              </div>

              {changeDue > 0 && (
                <div className={paymentStyles.changeBox}>
                  <span>Troco a Devolver:</span>
                  <span className="text-base font-black font-mono">
                    R$ {changeDue.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}

              <Button
                variant="primary"
                onClick={() =>
                  handleAddPayment(
                    "Dinheiro",
                    amountInput || remainingBalance,
                    { troco: changeDue },
                  )
                }
                className="w-full text-xs py-2"
              >
                + Lançar Dinheiro{" "}
                {changeDue > 0 && `(Troco: R$ ${changeDue.toFixed(2)})`}
              </Button>
            </div>
          )}

          {/* CLUBE DE ASSINATURA */}
          {activeMethod === "subscription" && (
            <div className="space-y-3">
              <div className={paymentStyles.panelTitle}>
                <span>👑 Benefício do Plano de Assinatura</span>
              </div>
              {client.hasSubscription ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <p className="text-xs text-amber-300 font-bold">
                    Plano Ativo: {client.subscriptionPlan}
                  </p>
                  <p className="text-[11px] text-neutral-300">
                    O cliente possui direito a cortes ilimitados. Deseja abater
                    o valor do corte na comanda?
                  </p>
                  <Button
                    variant="primary"
                    onClick={() =>
                      handleAddPayment("Crédito Clube VIP", remainingBalance)
                    }
                    className="text-xs py-1.5 px-3"
                  >
                    Abater Crédito de Assinatura
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-neutral-400">
                  Este cliente não possui plano de assinatura ativo.
                </p>
              )}
            </div>
          )}

          {/* FIADO / CONTA ASSINADA */}
          {activeMethod === "credit_account" && (
            <div className="space-y-3">
              <div className={paymentStyles.panelTitle}>
                <span>📝 Fiado / Débito em Conta</span>
              </div>
              <div className="p-3 bg-red-950/20 border border-red-800/40 rounded-xl space-y-2">
                <p className="text-xs text-red-300 font-bold">
                  Lançar Saldo Devedor para o Cliente
                </p>
                <p className="text-[11px] text-neutral-400">
                  Cliente: <strong className="text-white">{client.name}</strong>{" "}
                  • CPF: {client.cpf}
                </p>
                <p className="text-[10px] text-neutral-500">
                  O valor pendente será lançado no histórico do cliente para
                  cobrança no final do mês.
                </p>
                <Button
                  variant="danger"
                  onClick={() =>
                    handleAddPayment("Fiado (Conta Assinada)", remainingBalance)
                  }
                  className="text-xs py-1.5 px-3"
                >
                  Confirmar Lançamento no Fiado
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. LISTA DE PAGAMENTOS PARCIAIS LANÇADOS (SPLIT PAYMENT) */}
      {payments.length > 0 && (
        <div className={paymentStyles.paymentsList}>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
            Valores Lançados no Caixa ({payments.length}):
          </span>

          {payments.map((p) => (
            <div key={p.id} className={paymentStyles.paymentItem}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-200">{p.method}</span>
                {p.troco > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    (Troco: R$ {p.troco.toFixed(2)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <span className="font-black text-amber-500 font-mono">
                  R$ {p.amount.toFixed(2).replace(".", ",")}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemovePayment(p.id)}
                  className={paymentStyles.removePaymentBtn}
                  title="Estornar lançamento"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. RODAPÉ DE FINALIZAÇÃO */}
      <div className={paymentStyles.footer}>
        <Button
          variant="secondary"
          onClick={onCancel}
          className="text-xs py-2 px-4"
        >
          Cancelar
        </Button>

        {/* Só habilita se 100% da comanda estiver coberta! */}
        <Button
          variant="primary"
          disabled={!isFullyPaid}
          onClick={() => onFinishPayment && onFinishPayment(payments)}
          className={`text-xs py-2.5 px-6 font-extrabold shadow-lg ${isFullyPaid ? "bg-emerald-600 hover:bg-emerald-500" : ""}`}
        >
          {isFullyPaid
            ? "✓ Liquidar e Fechar Comanda"
            : "Aguardando Cobertura Total"}
        </Button>
      </div>
    </div>
  );
}
