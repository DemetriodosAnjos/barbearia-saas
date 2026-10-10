/**
 * src/services/emailService.ts
 *
 * Serviço de Envio de E-mails Transacionais com SMTP Oficial (Gmail / Google Workspace).
 * Suporta templates profissionais para:
 * - Confirmação de Agendamento
 * - Recuperação de Senha / Código de Verificação
 * - Boas-vindas / Suporte ao Cliente
 */

import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
  previewUrl?: string;
}

// Configuração segura com fallback e tolerância
function getSmtpConfig() {
  // Lê do .env em tempo real se não estiver no process.env
  let fileSmtpPass = "";
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(/SMTP_PASS=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) fileSmtpPass = match[1];
    }
  } catch {
    // fallback
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER || "atendmentor@gmail.com";
  const pass = (process.env.SMTP_PASS || fileSmtpPass || "").replace(/\s+/g, "");
  const from = process.env.EMAIL_FROM || "atendmentor@gmail.com";
  const fromName = process.env.EMAIL_FROM_NAME || "Barbearia SaaS - Suporte & Agendamentos";

  return { host, port, user, pass, from, fromName };
}

export function createSmtpTransporter() {
  const { host, port, user, pass } = getSmtpConfig();

  if (!pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // SSL para 465
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
}

/**
 * Dispara e-mail seguro via SMTP
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  fromName,
}: SendEmailOptions): Promise<EmailDispatchResult> {
  try {
    const config = getSmtpConfig();
    const transporter = createSmtpTransporter();

    if (!transporter) {
      console.warn("[EmailService] SMTP_PASS não configurada. E-mail simulado com sucesso.");
      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
        previewUrl: "simulated-in-dev-mode",
      };
    }

    const senderDisplay = `"${fromName || config.fromName}" <${config.from}>`;

    const info = await transporter.sendMail({
      from: senderDisplay,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error("[EmailService] Erro ao disparar e-mail:", error?.message);
    return {
      success: false,
      error: error?.message || "Falha no envio do e-mail via SMTP.",
    };
  }
}

/**
 * Template de Confirmação de Agendamento
 */
export function buildBookingEmailTemplate({
  clientName,
  barberName,
  serviceName,
  dateFormatted,
  timeFormatted,
  priceFormatted,
  barbershopName,
}: {
  clientName: string;
  barberName: string;
  serviceName: string;
  dateFormatted: string;
  timeFormatted: string;
  priceFormatted: string;
  barbershopName: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #171717; color: #f5f5f5; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
      <div style="background: linear-gradient(135deg, #d97706, #b45309); padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: bold;">Agendamento Confirmado! ✂️</h1>
        <p style="margin: 6px 0 0; color: #fef3c7; font-size: 14px;">${barbershopName || "Barbearia SaaS"}</p>
      </div>

      <div style="padding: 24px;">
        <p style="font-size: 16px; color: #e5e5e5; margin-top: 0;">Olá, <strong>${clientName}</strong>!</p>
        <p style="font-size: 14px; color: #a3a3a3; line-height: 1.5;">Seu horário foi agendado com sucesso em nosso sistema. Confira os detalhes abaixo:</p>

        <div style="background-color: #262626; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #404040;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #9ca3af;">Serviço:</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: bold; text-align: right;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af;">Profissional:</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: bold; text-align: right;">${barberName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af;">Data & Horário:</td>
              <td style="padding: 8px 0; color: #fbbf24; font-weight: bold; text-align: right;">${dateFormatted} às ${timeFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af;">Valor:</td>
              <td style="padding: 8px 0; color: #34d399; font-weight: bold; text-align: right;">${priceFormatted}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #737373; text-align: center; margin-top: 24px; border-top: 1px solid #262626; padding-top: 16px;">
          Dúvidas ou cancelamentos? Entre em contato pelo e-mail de suporte:<br/>
          <strong style="color: #fbbf24;">atendmentor@gmail.com</strong>
        </p>
      </div>
    </div>
  `;
}

/**
 * Template de Código de Recuperação de Senha
 */
export function buildRecoveryEmailTemplate({
  userName,
  verificationCode,
}: {
  userName: string;
  verificationCode: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #171717; color: #f5f5f5; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
      <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">Recuperação de Acesso 🔐</h1>
        <p style="margin: 6px 0 0; color: #bfdbfe; font-size: 13px;">Barbearia SaaS - Suporte de Segurança</p>
      </div>

      <div style="padding: 24px; text-align: center;">
        <p style="font-size: 15px; color: #e5e5e5; margin-top: 0; text-align: left;">Olá, <strong>${userName || "Usuário"}</strong>,</p>
        <p style="font-size: 14px; color: #a3a3a3; line-height: 1.5; text-align: left;">Recebemos uma solicitação para redefinir sua senha de acesso. Use o código de verificação abaixo para confirmar sua identidade:</p>

        <div style="margin: 24px 0; background-color: #262626; border: 2px dashed #3b82f6; border-radius: 8px; padding: 16px; display: inline-block;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #60a5fa; font-family: monospace;">${verificationCode}</span>
        </div>

        <p style="font-size: 13px; color: #ef4444; margin-bottom: 20px;">Este código expira em 15 minutos. Se você não solicitou a alteração, ignore este e-mail.</p>

        <div style="font-size: 12px; color: #737373; border-top: 1px solid #262626; padding-top: 14px;">
          Suporte: <strong>atendmentor@gmail.com</strong>
        </div>
      </div>
    </div>
  `;
}
