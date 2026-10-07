/**
 * src/components/payments/MercadoPagoCheckoutModal.tsx
 *
 * Modal de Checkout e Cobrança do Mercado Pago para o painel SuperAdmin e Barbearias.
 * Suporta Pix Instantâneo (QR Code + Copia-e-Cola), Checkout Pro (Cartão de Crédito)
 * e Disparo Oficial via WhatsApp com Link do Mercado Pago.
 */

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import ProjectIcon from "../ui/ProjectIcon";
import { createPreferenceEndpoint, createPixEndpoint } from "../../api/mercadoPagoEndpoints";
import type { PixPaymentResult, PreferenceResult } from "../../services/mercadoPagoService";

export interface MercadoPagoCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: {
    id: string;
    name: string;
    price: number;
    tag?: string;
    features?: string[];
  };
  appointment?: {
    id: string;
    clientName?: string;
    clientPhone?: string;
    serviceName?: string;
    barberName?: string;
    price?: number;
    startTime?: string;
    endTime?: string;
  };
  tenant?: {
    id: string;
    name: string;
    ownerName?: string;
    ownerEmail?: string;
    ownerPhone?: string;
  };
  onPaymentSuccess?: (paymentInfo: any) => void;
}

export default function MercadoPagoCheckoutModal({
  isOpen,
  onClose,
  plan,
  appointment,
  tenant,
  onPaymentSuccess,
}: MercadoPagoCheckoutModalProps) {
  const [activeTab, setActiveTab] = useState<"pix" | "checkout_pro" | "whatsapp">("pix");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Determina se o checkout é de um agendamento individual ou de plano SaaS
  const isAppointmentMode = Boolean(appointment);
  const targetId = isAppointmentMode ? (appointment?.id || "apt-unknown") : (plan?.id || "plan-unknown");
  const targetName = isAppointmentMode
    ? (appointment?.serviceName || "Serviço de Barbearia")
    : (plan?.name || "Plano BarberSaaS");
  const targetPrice = isAppointmentMode
    ? Number(appointment?.price || 0)
    : Number(plan?.price || 0);
  const targetClientName = isAppointmentMode
    ? (appointment?.clientName || "Cliente")
    : (tenant?.ownerName || "Gestor");
  const targetClientPhone = isAppointmentMode
    ? (appointment?.clientPhone || "")
    : (tenant?.ownerPhone || "");

  // Estados do Pix
  const [pixData, setPixData] = useState<PixPaymentResult | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [pixStatus, setPixStatus] = useState<"pending" | "approved">("pending");

  // Estados do Checkout Pro
  const [preferenceData, setPreferenceData] = useState<PreferenceResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Geração Automática ao abrir o modal
  useEffect(() => {
    if (!isOpen || (!plan && !appointment)) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);
    setPixStatus("pending");

    const defaultTenant = tenant || {
      id: "superadmin_checkout",
      name: "Barbearia em Ativação",
      ownerName: "Gestor",
      ownerEmail: "gestor@barbearia.com.br",
      ownerPhone: "11999998888",
    };

    const payerName = targetClientName;
    const payerEmail = defaultTenant.ownerEmail || "pagamento@barbearia.com.br";
    const payerFirstName = (payerName || "Cliente").split(" ")[0];
    const description = isAppointmentMode
      ? `Atendimento #${appointment?.id} (${appointment?.serviceName}) - BarberSaaS`
      : `Assinatura ${plan?.name} - BarberSaaS`;

    // 1. Gera Pix via API Mercado Pago
    createPixEndpoint({
      planId: targetId,
      amount: targetPrice,
      tenantId: defaultTenant.id,
      payerEmail,
      payerFirstName,
      description,
    }).then((res) => {
      if (isMounted) {
        if (res.success && res.data) {
          setPixData(res.data);
        } else {
          setErrorMsg(res.error || "Não foi possível gerar a cobrança Pix");
        }
      }
    });

    // 2. Gera Preferência Checkout Pro (Cartão de Crédito / Débito)
    createPreferenceEndpoint({
      planId: targetId as any,
      planName: targetName,
      price: targetPrice,
      tenantId: defaultTenant.id,
      tenantName: defaultTenant.name,
      payerEmail,
      payerName,
      payerPhone: targetClientPhone || defaultTenant.ownerPhone,
    }).then((res) => {
      if (isMounted) {
        if (res.success && res.data) {
          setPreferenceData(res.data);
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, plan, appointment, tenant, targetId, targetName, targetPrice, targetClientName, targetClientPhone, isAppointmentMode]);

  const handleCopyPix = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleCopyPreferenceLink = () => {
    const link = preferenceData?.initPoint || "";
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSimulatePaymentApproval = () => {
    setPixStatus("approved");
    if (onPaymentSuccess) {
      onPaymentSuccess({
        paymentId: pixData?.id || `sim_${Date.now()}`,
        status: "approved",
        appointmentId: appointment?.id,
        planId: plan?.id,
        amount: targetPrice,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const checkoutUrl = preferenceData?.initPoint || `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_${targetId}`;
  const ownerPhoneClean = (targetClientPhone || tenant?.ownerPhone || "11999998888").replace(/\D/g, "");
  const whatsappMessage = encodeURIComponent(
    isAppointmentMode
      ? `Olá ${targetClientName}! Segue o link oficial do Mercado Pago para quitação do seu atendimento #${appointment?.id} (${appointment?.serviceName} - R$ ${targetPrice.toFixed(2).replace(".", ",")}):\n\n${checkoutUrl}\n\nVocê pode pagar via PIX Instantâneo ou Cartão de Crédito/Débito no ambiente seguro da barbearia.`
      : `Olá ${tenant?.ownerName || "Gestor"}! Segue o link oficial do Mercado Pago para ativação/renovação do seu plano ${plan?.name} (R$ ${plan?.price?.toFixed(2)?.replace(".", ",")}):\n\n${checkoutUrl}\n\nVocê pode pagar via PIX Instantâneo ou Cartão de Crédito em até 12x no ambiente seguro do Mercado Pago.`
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isAppointmentMode
          ? `Pagamento Mercado Pago: Atendimento #${appointment?.id}`
          : `Pagamento via Mercado Pago: ${plan?.name}`
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
            <ProjectIcon name="ShieldCheck" size={14} className="text-emerald-400" />
            <span>Mercado Pago API v1 • Criptografia SSL 256-bit</span>
          </div>
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-left text-xs">
        {/* Resumo do Atendimento ou Plano Contratado */}
        <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase text-amber-500 tracking-wider">
              {isAppointmentMode ? "Atendimento Concluído" : "Plano Selecionado"}
            </span>
            <h4 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>{targetName}</span>
              {isAppointmentMode ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  #{appointment?.id}
                </span>
              ) : plan?.tag ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {plan.tag}
                </span>
              ) : null}
            </h4>
            <p className="text-neutral-400 text-[11px] mt-0.5">
              {isAppointmentMode ? (
                <>
                  Cliente: <strong className="text-neutral-200">{targetClientName}</strong>
                  {appointment?.barberName && (
                    <span> • Barbeiro: <strong className="text-amber-400">{appointment.barberName}</strong></span>
                  )}
                </>
              ) : (
                <>
                  Assinante: <strong className="text-neutral-200">{tenant?.name || "Barbearia Cliente"}</strong>
                </>
              )}
            </p>
          </div>
          <div className="sm:text-right">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              R$ {Number(targetPrice || 0).toFixed(2).replace(".", ",")}
            </span>
            <span className="text-neutral-500 block text-[10px]">
              {isAppointmentMode ? "total a pagar" : "/mês recorrente"}
            </span>
          </div>
        </div>

        {/* Seletor de Modo de Pagamento: Pix / Checkout Pro / WhatsApp */}
        <div className="flex rounded-xl p-1 bg-neutral-950 border border-neutral-800 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("pix")}
            className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "pix"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <ProjectIcon name="Zap" size={14} />
            <span>Pix Instantâneo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("checkout_pro")}
            className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "checkout_pro"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <ProjectIcon name="CreditCard" size={14} />
            <span>Cartão Crédito / Débito</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "whatsapp"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <ProjectIcon name="Smartphone" size={14} />
            <span>Link WhatsApp</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: PIX INSTANTÂNEO (MERCADO PAGO)                    */}
        {/* ======================================================== */}
        {activeTab === "pix" && (
          <div className="space-y-4">
            {pixStatus === "approved" ? (
              <div className="p-6 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                  <ProjectIcon name="CheckCircle2" size={24} />
                </div>
                <h4 className="text-base font-black text-white">
                  Pagamento Aprovado com Sucesso!
                </h4>
                <p className="text-neutral-300 text-xs max-w-sm mx-auto">
                  A transação do Mercado Pago foi confirmada. {isAppointmentMode ? "O atendimento " : "O plano "}
                  <strong className="text-emerald-400">{targetName}</strong> encontra-se quitado com sucesso.
                </p>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 inline-block">
                  TxID: {pixData?.id || "pay_mp_pix_confirmed"}
                </span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                {/* Visual QR Code SVG */}
                <div className="p-3 bg-white rounded-xl shadow-lg shrink-0 flex flex-col items-center">
                  {pixData?.qrCodeBase64 ? (
                    <img
                      src={pixData.qrCodeBase64}
                      alt="QR Code Pix Mercado Pago"
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-neutral-400 font-mono text-xs">
                      Gerando QR Code...
                    </div>
                  )}
                  <span className="text-[10px] text-neutral-900 font-mono font-bold mt-1">
                    PIX MERCADO PAGO
                  </span>
                </div>

                {/* Instruções e Copia-e-Cola */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white block">
                      Escaneie com o app do seu Banco
                    </span>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Abra o aplicativo onde você tem chave Pix cadastrada e aponte a câmera para o QR Code ao lado. A compensação é instantânea.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-300 block">
                      Ou utilize o Código Copia e Cola:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={pixData?.qrCode || "Gerando código PIX..."}
                        className="w-full bg-neutral-900 border border-neutral-700 text-neutral-300 text-[11px] font-mono p-2 rounded-lg outline-none select-all truncate"
                      />
                      <Button
                        variant="secondary"
                        onClick={handleCopyPix}
                        className="text-xs py-2 px-3 shrink-0 font-bold"
                      >
                        {copiedPix ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <ProjectIcon name="Check" size={12} />
                            <span>Copiado!</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <ProjectIcon name="Copy" size={12} />
                            <span>Copiar Pix</span>
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1 font-mono">
                      <ProjectIcon name="Clock" size={12} className="text-amber-400" />
                      <span>Expira em 30 minutos</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleSimulatePaymentApproval}
                      className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer text-[10px]"
                      title="Simular confirmação automática do Webhook para testes"
                    >
                      [Simular Confirmação Webhook]
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: CHECKOUT PRO / CARTÃO DE CRÉDITO                  */}
        {/* ======================================================== */}
        {activeTab === "checkout_pro" && (
          <div className="space-y-4 p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
            <div className="space-y-1.5">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <ProjectIcon name="ExternalLink" size={15} className="text-blue-400" />
                <span>Checkout Pro Oficial do Mercado Pago</span>
              </h4>
              <p className="text-neutral-400 text-xs leading-relaxed">
                O cliente é redirecionado para a tela oficial de pagamentos do Mercado Pago com suporte a Cartão de Crédito (até 12x), Cartão de Débito Virtual da Caixa, Saldo em Conta Mercado Pago e Linha de Crédito.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-300 block">
                Link Seguro de Pagamento (Preference URL):
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={checkoutUrl}
                  className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs font-mono p-2.5 rounded-xl outline-none"
                />
                <Button
                  variant="secondary"
                  onClick={handleCopyPreferenceLink}
                  className="text-xs py-2 px-3 shrink-0"
                >
                  {copiedLink ? "Copiado!" : "Copiar Link"}
                </Button>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => window.open(checkoutUrl, "_blank")}
              className="w-full text-xs py-3 bg-blue-600 hover:bg-blue-500 font-extrabold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ProjectIcon name="CreditCard" size={15} className="text-white" />
              <span>Abrir Checkout Pro no Mercado Pago</span>
            </Button>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: DISPARO AUTOMÁTICO VIA WHATSAPP                   */}
        {/* ======================================================== */}
        {activeTab === "whatsapp" && (
          <div className="space-y-4 p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <ProjectIcon name="Smartphone" size={15} className="text-emerald-400" />
                <span>Mensagem Pronta para WhatsApp</span>
              </h4>
              <p className="text-neutral-400 text-xs">
                Destinatário: <strong className="text-white">{tenant?.ownerName || "Gestor"}</strong> (
                {tenant?.ownerPhone || "Telefone não cadastrado"})
              </p>
            </div>

            <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 text-xs text-neutral-300 font-sans leading-relaxed">
              <p>
                Olá <strong>{tenant?.ownerName || "Gestor"}</strong>! Segue o link oficial do Mercado Pago para ativação/renovação do seu plano <strong>{plan?.name}</strong> (R$ {Number(plan?.price).toFixed(2).replace(".", ",")}):
              </p>
              <p className="font-mono text-blue-400 break-all bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                {checkoutUrl}
              </p>
              <p className="text-[11px] text-neutral-400">
                Você pode pagar via PIX Instantâneo ou Cartão de Crédito em até 12x no ambiente seguro do Mercado Pago.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => {
                window.open(`https://wa.me/55${ownerPhoneClean}?text=${whatsappMessage}`, "_blank");
              }}
              className="w-full text-xs py-2.5 bg-emerald-600 hover:bg-emerald-500 font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <ProjectIcon name="Smartphone" size={14} className="text-white" />
              <span>Abrir WhatsApp Web com Mensagem</span>
            </Button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <ProjectIcon name="AlertTriangle" size={14} className="text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
