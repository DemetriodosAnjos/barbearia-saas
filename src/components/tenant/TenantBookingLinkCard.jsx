import { useState, useEffect } from "react";
import QRCode from "qrcode";
import ProjectIcon from "../ui/ProjectIcon";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import {
  buildClientBookingUrl,
  buildWhatsAppInviteMessage,
  buildWhatsAppUrl,
} from "../../utils/publicBookingUrl";

export default function TenantBookingLinkCard({
  tenant,
  onOpenSettings,
  onClose,
  className = "",
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  const tenantSlug = tenant?.slug || "";
  const tenantId = tenant?.id || "";
  const barbershopName = tenant?.name || "Minha Barbearia";

  // Constrói a URL pública oficial associada à barbearia
  const clientBookingUrl = buildClientBookingUrl({
    slug: tenantSlug,
    tenantId: tenantId,
  });

  // Mensagem de convite pronta para divulgação
  const inviteMessage = buildWhatsAppInviteMessage({
    barbershopName,
    bookingUrl: clientBookingUrl,
  });

  const whatsAppShareUrl = buildWhatsAppUrl("", inviteMessage);

  // Gera o QR Code quando abrir o modal
  useEffect(() => {
    if (isQrModalOpen && clientBookingUrl) {
      QRCode.toDataURL(clientBookingUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.warn("Erro ao gerar QR Code do balcão:", err));
    }
  }, [isQrModalOpen, clientBookingUrl]);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(clientBookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement("a");
    a.href = qrCodeDataUrl;
    a.download = `qrcode-agendamento-${tenantSlug || "barbearia"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`w-full max-w-full overflow-hidden p-3.5 sm:p-5 bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/20 border border-amber-500/30 rounded-2xl sm:rounded-3xl shadow-xl space-y-3 text-left min-w-0 ${className}`}
      style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
    >
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-800 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ProjectIcon name="Scissors" size={16} colorVariant="amber" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                Link do Cliente
              </span>
              {tenantSlug && (
                <span className="text-[11px] font-mono text-neutral-400 truncate max-w-[120px] sm:max-w-[200px]">
                  @{tenantSlug}
                </span>
              )}
            </div>
            <h3 className="text-xs sm:text-sm font-black text-white mt-0.5 truncate">
              Link de Agendamento da Barbearia
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-[11px] font-semibold text-neutral-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors p-1"
              title="Personalizar Slug"
            >
              <ProjectIcon name="Settings" size={13} colorVariant="inherit" />
              <span className="hidden sm:inline">Personalizar Slug</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar link de agendamento"
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <ProjectIcon name="X" size={16} colorVariant="inherit" />
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-300 leading-relaxed">
        Envie este link para seus clientes pelo WhatsApp ou Instagram. Eles escolhem o serviço, o barbeiro e o horário com confirmação direta.
      </p>

      {/* Caixa de exibição do link com quebra em duas linhas para caber perfeitamente no mobile (máximo 280px) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full max-w-[280px] mx-auto min-w-0">
        <div className="w-full max-w-[280px] min-w-0 bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 sm:px-3 py-2 flex items-start gap-2 text-xs font-mono text-neutral-200 overflow-hidden shadow-inner">
          <ProjectIcon name="Link" size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <span className="break-all select-all text-[11px] sm:text-xs leading-snug line-clamp-2 min-w-0 flex-1 text-neutral-300">
            {clientBookingUrl}
          </span>
        </div>

        <Button
          variant={copiedLink ? "success" : "primary"}
          onClick={handleCopyLink}
          className="text-xs py-2 px-3.5 font-bold cursor-pointer shrink-0 w-full sm:w-auto whitespace-nowrap"
          title={copiedLink ? "Link Copiado!" : "Copiar Link"}
        >
          <span className="flex items-center justify-center gap-1.5">
            <ProjectIcon name={copiedLink ? "Check" : "Copy"} size={13} colorVariant="inherit" />
            <span>{copiedLink ? "Link Copiado!" : "Copiar Link"}</span>
          </span>
        </Button>
      </div>

      {/* Ações Rápidas de Divulgação: Ícones simplificados centralizados */}
      <div className="flex items-center justify-center gap-3 pt-2 w-full">
        {/* 1. Botão divulgar no WhatsApp */}
        <a
          href={whatsAppShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white transition-all flex items-center justify-center shadow-md shadow-emerald-950/30 cursor-pointer shrink-0"
          title="Divulgar no WhatsApp"
          aria-label="Divulgar no WhatsApp"
        >
          <ProjectIcon name="MessageSquare" size={18} colorVariant="inherit" />
        </a>

        {/* 2. Botão QR code do balcão */}
        <button
          type="button"
          onClick={() => setIsQrModalOpen(true)}
          className="w-10 h-10 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-xs shrink-0"
          title="QR Code do Balcão"
          aria-label="QR Code do Balcão"
        >
          <ProjectIcon name="QrCode" size={18} colorVariant="inherit" />
        </button>

        {/* 3. Botão testar como cliente */}
        <a
          href={clientBookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-xs shrink-0"
          title="Testar como Cliente"
          aria-label="Testar como Cliente"
        >
          <ProjectIcon name="Eye" size={18} colorVariant="inherit" />
        </a>
      </div>

      {/* Modal de QR Code do Balcão */}
      {isQrModalOpen && (
        <Modal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          title="QR Code de Agendamento no Balcão"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-center p-2">
            <p className="text-xs text-neutral-300">
              Imprima este QR Code ou exiba-o no balcão e mesas da barbearia. O cliente aponta a câmera do celular e abre o agendamento imediatamente.
            </p>

            <div className="flex justify-center py-3">
              <div className="p-4 bg-white rounded-3xl shadow-2xl inline-block border-4 border-amber-500/30">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code da Barbearia"
                    className="w-56 h-56 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-neutral-400 text-xs">
                    Gerando QR Code...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800 text-xs text-left font-mono">
              <span className="text-[10px] text-neutral-500 block mb-0.5 font-sans font-bold uppercase">
                Destino do QR Code:
              </span>
              <span className="text-amber-400 break-all select-all">
                {clientBookingUrl}
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                onClick={handleDownloadQr}
                className="flex-1 text-xs py-2.5 font-bold cursor-pointer"
              >
                <span className="flex items-center justify-center gap-2">
                  <ProjectIcon name="Download" size={14} colorVariant="inherit" />
                  <span>Baixar Imagem PNG</span>
                </span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsQrModalOpen(false)}
                className="text-xs py-2.5 px-4 font-semibold cursor-pointer"
              >
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
