/**
 * src/components/payments/MercadoPagoCheckoutModal.tsx
 *
 * Modal de Pagamento (Pix com QR Code Oficial do Banco Central / Chave Pix da Barbearia
 * e Envio de Chave/Cobrança via WhatsApp).
 *
 * NOTA: O pagamento com Cartão de Débito e Crédito é realizado presencialmente
 * na maquininha física do Caixa da barbearia, eliminando taxas de gateway online
 * e redirecionamentos externos para o cliente.
 */

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import ProjectIcon from "../ui/ProjectIcon";
import { createPixEndpoint } from "../../api/mercadoPagoEndpoints";
import type { PixPaymentResult } from "../../services/mercadoPagoService";
import { supabase } from "../../lib/supabase";
import {
  getRegisteredUserPixKey,
  saveRegisteredUserPixKey,
  generatePixBrCodePayload,
  generatePixQrCodeDataUrl,
  formatWhatsAppNumber,
} from "../../utils/pixQrCode";

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
    city?: string;
    pix_key?: string;
    pixKey?: string;
  };
  user?: any;
  onPaymentSuccess?: (paymentInfo: any) => void;
}

export default function MercadoPagoCheckoutModal({
  isOpen,
  onClose,
  plan,
  appointment,
  tenant,
  user,
  onPaymentSuccess,
}: MercadoPagoCheckoutModalProps) {
  const [activeTab, setActiveTab] = useState<"pix" | "whatsapp">("pix");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Determina se o checkout é de um agendamento individual ou de plano SaaS
  const isAppointmentMode = Boolean(appointment);
  const targetId = isAppointmentMode
    ? (appointment?.id || "apt-unknown")
    : (plan?.id || "plan-unknown");
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

  // Estados do Pix e QR Code real da Chave PIX da Barbearia
  const [pixData, setPixData] = useState<PixPaymentResult | null>(null);
  const [registeredPixKey, setRegisteredPixKey] = useState<string>(() =>
    getRegisteredUserPixKey(user, tenant)
  );
  const [realQrCodeDataUrl, setRealQrCodeDataUrl] = useState<string>("");
  const [realPixPayload, setRealPixPayload] = useState<string>("");
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [pixStatus, setPixStatus] = useState<"pending" | "approved">("pending");

  // Estados do Link e Mensagem Personalizada do WhatsApp
  const [customWhatsappMessage, setCustomWhatsappMessage] = useState<string>("");
  const [isEditingMessage, setIsEditingMessage] = useState<boolean>(false);

  // Geração Automática ao abrir o modal
  useEffect(() => {
    if (!isOpen || (!plan && !appointment)) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);
    setPixStatus("pending");
    setIsEditingMessage(false);
    setCustomWhatsappMessage("");

    const defaultTenant = tenant || {
      id: "superadmin_checkout",
      name: "Barbearia em Ativação",
      ownerName: "Gestor",
      ownerEmail: "gestor@barbearia.com.br",
      ownerPhone: "11999998888",
      city: "SAO PAULO",
    };

    const payerName = targetClientName;
    const payerEmail = defaultTenant.ownerEmail || "pagamento@barbearia.com.br";
    const payerFirstName = (payerName || "Cliente").split(" ")[0];
    const description = isAppointmentMode
      ? `Atendimento #${appointment?.id} (${appointment?.serviceName}) - BarberSaaS`
      : `Assinatura ${plan?.name} - BarberSaaS`;

    // Resolve a chave PIX cadastrada na barbearia
    async function resolveProfilePixAndGenerateQr() {
      let resolvedKey = getRegisteredUserPixKey(user, tenant);

      if (!resolvedKey) {
        try {
          const { data } = await supabase.auth.getUser();
          const metaKey =
            data?.user?.user_metadata?.pix_key ||
            data?.user?.user_metadata?.pixKey ||
            "";
          if (metaKey && String(metaKey).trim()) {
            resolvedKey = String(metaKey).trim();
            saveRegisteredUserPixKey(resolvedKey);
          }
        } catch {
          // ignore
        }
      }

      // Se ainda não houver chave explícita salva, usa email/telefone como contingência para gerar um BR Code real
      const effectiveKeyForQr =
        resolvedKey ||
        user?.email ||
        defaultTenant.ownerEmail ||
        defaultTenant.ownerPhone ||
        "";

      if (isMounted) {
        setRegisteredPixKey(resolvedKey || effectiveKeyForQr);
      }

      if (effectiveKeyForQr) {
        const brCode = generatePixBrCodePayload({
          pixKey: effectiveKeyForQr,
          merchantName: defaultTenant.name || "BARBEARIA",
          merchantCity: (defaultTenant as any).city || "SAO PAULO",
          amount: targetPrice,
          txid: `ATD${(appointment?.id || "000").slice(0, 10).toUpperCase()}`,
        });

        const qrDataUrl = await generatePixQrCodeDataUrl(brCode);
        if (isMounted) {
          setRealPixPayload(brCode);
          setRealQrCodeDataUrl(qrDataUrl);
        }
      }
    }

    resolveProfilePixAndGenerateQr();

    // Registra telemetria Pix via endpoint Mercado Pago
    createPixEndpoint({
      planId: targetId,
      amount: targetPrice,
      tenantId: defaultTenant.id,
      payerEmail,
      payerFirstName,
      description,
    } as any)
      .then((res) => {
        if (isMounted) {
          if (res.success && res.data) {
            setPixData(res.data);
          } else {
            // Não bloqueia o modal pois temos o gerador local EMV BR Code
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    plan,
    appointment,
    tenant,
    user,
    targetId,
    targetName,
    targetPrice,
    targetClientName,
    targetClientPhone,
    isAppointmentMode,
  ]);

  const activePixCode = realPixPayload || pixData?.qrCode || "";
  const activeQrImage = realQrCodeDataUrl || pixData?.qrCodeBase64 || "";

  const handleCopyPix = () => {
    const codeToCopy = activePixCode || registeredPixKey;
    if (!codeToCopy) return;
    navigator.clipboard.writeText(codeToCopy);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleCopyRawKey = () => {
    if (!registeredPixKey) return;
    navigator.clipboard.writeText(registeredPixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  // Telefone do cliente cadastrado para envio via WhatsApp
  const clientPhoneRaw = isAppointmentMode
    ? (appointment?.clientPhone || targetClientPhone || "")
    : (tenant?.ownerPhone || (tenant as any)?.phone || targetClientPhone || "");
  const recipientPhoneClean = formatWhatsAppNumber(clientPhoneRaw);

  // Mensagem Padrão contendo a Chave Pix e Instruções de Pagamento Presencial
  const defaultWhatsappMessage = isAppointmentMode
    ? `Olá ${targetClientName}! Segue a chave Pix da barbearia para quitação do seu atendimento #${appointment?.id} (${appointment?.serviceName || targetName} - R$ ${targetPrice.toFixed(2).replace(".", ",")}):

🔑 Chave Pix: ${registeredPixKey || "Consulte a chave no balcão"}

📋 Código Pix Copia e Cola:
${activePixCode || registeredPixKey || "Consulte na barbearia"}

💳 Pagamento com Cartão:
Caso prefira pagar com Cartão de Débito ou Crédito, o acerto pode ser realizado presencialmente na maquininha do caixa da barbearia.

Agradecemos a sua preferência!`
    : `Olá ${tenant?.ownerName || "Gestor"}! Segue a chave Pix para ativação/renovação do seu plano ${plan?.name} (R$ ${plan?.price?.toFixed(2)?.replace(".", ",")}):

🔑 Chave Pix: ${registeredPixKey || "Consulte a chave cadastrada"}

📋 Código Pix Copia e Cola:
${activePixCode || registeredPixKey || "Consulte no sistema"}

Obrigado por utilizar a plataforma BarberSaaS!`;

  const effectiveWhatsappMessage = customWhatsappMessage.trim()
    ? customWhatsappMessage
    : defaultWhatsappMessage;

  const whatsappMessage = encodeURIComponent(effectiveWhatsappMessage);

  const handleShareWhatsApp = () => {
    const targetPhone = recipientPhoneClean || "";
    const waUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${whatsappMessage}`
      : `https://wa.me/?text=${whatsappMessage}`;

    const link = document.createElement("a");
    link.href = waUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pagamento do Atendimento">
      <div className="space-y-4 text-left text-xs">
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
                    <span>
                      {" "}
                      • Barbeiro:{" "}
                      <strong className="text-white">{appointment.barberName}</strong>
                    </span>
                  )}
                </>
              ) : (
                <>
                  Assinante:{" "}
                  <strong className="text-neutral-200">
                    {tenant?.name || "Barbearia Cliente"}
                  </strong>
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

        {/* Seletores Pix e WhatsApp (Cartão online removido conforme especificação técnica) */}
        <div className="flex rounded-xl p-1 bg-neutral-950 border border-neutral-800 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("pix")}
            className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-white ${
              activeTab === "pix"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <ProjectIcon name="Zap" size={14} className="text-amber-300" />
            <span className="text-white">Pix (QR Code & Chave)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-white ${
              activeTab === "whatsapp"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <ProjectIcon name="Smartphone" size={14} className="text-emerald-300" />
            <span className="text-white">Enviar no WhatsApp</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: PIX (QR CODE OFICIAL BCB + CHAVE PIX DA BARBEARIA) */}
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
                  A transação foi confirmada.{" "}
                  {isAppointmentMode ? "O atendimento " : "O plano "}
                  <strong className="text-emerald-400">{targetName}</strong>{" "}
                  encontra-se quitado com sucesso.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                {/* Visual QR Code Real gerado no padrão BCB EMV */}
                <div className="p-3 bg-white rounded-xl shadow-lg shrink-0 flex flex-col items-center">
                  {activeQrImage ? (
                    <img
                      src={activeQrImage}
                      alt="QR Code PIX Oficial"
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-neutral-400 font-mono text-xs text-center">
                      Gerando QR Code...
                    </div>
                  )}
                  <span className="text-[10px] text-neutral-900 font-mono font-bold mt-1">
                    QR CODE PIX
                  </span>
                </div>

                {/* Instruções, Chave PIX e Copia-e-Cola */}
                <div className="space-y-3 flex-1 min-w-0 w-full">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white block">
                      Escaneie com o app do Banco
                    </span>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      O cliente aponta a câmera do aplicativo do banco para o QR Code para efetuar o pagamento instantâneo.
                    </p>
                    {registeredPixKey && (
                      <div className="flex items-center justify-between gap-2 p-2 bg-neutral-900 rounded-lg border border-neutral-800 mt-1">
                        <div className="truncate">
                          <span className="text-[10px] text-neutral-400 block">Chave Pix da Barbearia:</span>
                          <span className="text-white font-mono text-xs font-bold truncate">
                            {registeredPixKey}
                          </span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyRawKey}
                          className="shrink-0 text-[11px] py-1 px-2.5"
                        >
                          {copiedKey ? "Copiado!" : "Copiar Chave"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-300 block">
                      Código Pix Copia e Cola:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={activePixCode || "Gerando código PIX..."}
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
                            <span>Copiar</span>
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-neutral-900/70 border border-neutral-800 rounded-lg flex items-start gap-2 text-[11px] text-neutral-400">
                    <ProjectIcon name="CreditCard" size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-neutral-200">Pagamento no Cartão:</strong> Maquininha física presencial no Caixa da barbearia.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: ENVIAR CHAVE PIX E DADOS DIRETO NO WHATSAPP       */}
        {/* ======================================================== */}
        {activeTab === "whatsapp" && (
          <div className="space-y-4 p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
            <div className="flex items-start justify-between gap-2 border-b border-neutral-900 pb-3">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <ProjectIcon
                    name="Smartphone"
                    size={15}
                    className="text-emerald-400"
                  />
                  <span>Mensagem com Chave Pix para WhatsApp</span>
                </h4>
                <p className="text-neutral-400 text-xs">
                  Cliente: <strong className="text-white">{targetClientName}</strong>
                  {clientPhoneRaw && (
                    <span className="font-mono text-neutral-300"> ({clientPhoneRaw})</span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isEditingMessage && !customWhatsappMessage) {
                    setCustomWhatsappMessage(defaultWhatsappMessage);
                  }
                  setIsEditingMessage(!isEditingMessage);
                }}
                className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer shrink-0"
                title="Editar mensagem do WhatsApp"
              >
                {isEditingMessage ? "Cancelar Edição" : "Editar Mensagem"}
              </button>
            </div>

            {/* Visualização ou Edição da Mensagem */}
            {isEditingMessage ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                  <label className="text-neutral-300 font-medium">
                    Texto personalizado:
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomWhatsappMessage(defaultWhatsappMessage)}
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Restaurar padrão
                  </button>
                </div>
                <textarea
                  value={customWhatsappMessage || defaultWhatsappMessage}
                  onChange={(e) => setCustomWhatsappMessage(e.target.value)}
                  rows={7}
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-400 text-neutral-100 text-xs p-3 rounded-xl outline-none resize-y leading-relaxed font-sans placeholder-neutral-500 shadow-inner"
                  placeholder="Escreva a mensagem personalizada para enviar ao cliente..."
                />
                <div className="flex items-center justify-end text-xs px-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingMessage(false)}
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Concluir Edição
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 text-xs text-neutral-300 font-sans leading-relaxed">
                <div className="whitespace-pre-wrap text-neutral-200 font-mono text-[11px]">
                  {effectiveWhatsappMessage}
                </div>
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleShareWhatsApp}
              className="w-full text-xs py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <ProjectIcon
                name="Smartphone"
                size={14}
                colorVariant="white"
                className="text-white"
              />
              <span>Abrir WhatsApp e Enviar Chave Pix</span>
            </Button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <ProjectIcon
              name="AlertTriangle"
              size={14}
              className="text-rose-400 shrink-0"
            />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
