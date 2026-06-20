import nodemailer from "nodemailer";
import { logger } from "./logger.js";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    logger.info("SMTP transporter initialized");
  } else {
    logger.warn("SMTP not configured — emails will be logged to console only");
    transporter = null;
  }

  return transporter;
}

export async function sendPaymentNotification(params: {
  adminEmail: string;
  userEmail: string;
  userName: string;
  plan: string;
  amount: number;
  paymentId: string;
}): Promise<void> {
  const { adminEmail, userEmail, userName, plan, amount, paymentId } = params;
  const subject = `💰 New Payment Received — ₹${(amount / 100).toFixed(2)} for ${plan} Plan`;
  const text = [
    `A new payment has been received on RankLens.`,
    ``,
    `User: ${userName} (${userEmail})`,
    `Plan: ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
    `Amount: ₹${(amount / 100).toFixed(2)}`,
    `Payment ID: ${paymentId}`,
    ``,
    `Please review and approve or decline this payment in the admin dashboard:`,
    `${process.env.CLIENT_URL || "http://localhost:8081"}/admin`,
    ``,
    `If approved, the user's plan will be upgraded automatically.`,
    `If declined, the payment will be marked as failed.`,
  ].join("\n");

  const html = [
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">`,
    `<h2 style="color:#06b6d4;">💰 New Payment Received</h2>`,
    `<p>A new payment has been received on <strong>RankLens</strong>.</p>`,
    `<table style="width:100%;border-collapse:collapse;margin:16px 0;">`,
    `<tr><td style="padding:8px 12px;border:1px solid #333;color:#888;">User</td><td style="padding:8px 12px;border:1px solid #333;"><strong>${userName}</strong> (${userEmail})</td></tr>`,
    `<tr><td style="padding:8px 12px;border:1px solid #333;color:#888;">Plan</td><td style="padding:8px 12px;border:1px solid #333;"><strong>${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong></td></tr>`,
    `<tr><td style="padding:8px 12px;border:1px solid #333;color:#888;">Amount</td><td style="padding:8px 12px;border:1px solid #333;"><strong style="color:#10b981;">₹${(amount / 100).toFixed(2)}</strong></td></tr>`,
    `<tr><td style="padding:8px 12px;border:1px solid #333;color:#888;">Payment ID</td><td style="padding:8px 12px;border:1px solid #333;"><code style="font-size:12px;">${paymentId}</code></td></tr>`,
    `</table>`,
    `<p style="margin-top:16px;">`,
    `<a href="${process.env.CLIENT_URL || "http://localhost:8081"}/admin" style="display:inline-block;padding:12px 24px;background:#06b6d4;color:#000;text-decoration:none;font-weight:bold;border-radius:8px;">Review in Admin Dashboard</a>`,
    `</p>`,
    `<p style="color:#888;font-size:12px;margin-top:24px;">If approved, the user's plan will be upgraded automatically. If declined, the payment will be marked as failed.</p>`,
    `</div>`,
  ].join("\n");

  const t = getTransporter();

  if (t) {
    try {
      await t.sendMail({
        from: process.env.SMTP_FROM || `"RankLens" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject,
        text,
        html,
      });
      logger.info({ adminEmail, paymentId }, "Payment notification email sent");
    } catch (err: any) {
      logger.error({ error: err.message, paymentId }, "Failed to send payment notification email");
    }
  } else {
    logger.info(
      { subject, text },
      "Email not configured — payment notification logged (would have been sent)",
    );
  }
}
