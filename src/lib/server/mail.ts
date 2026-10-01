import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";
import { HttpError } from "./http";

let transport: Transporter | null = null;

export const mailConfigured = () => !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

function transporter() {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transport;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string, cta: { label: string; url: string }, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:#0a0b0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#eceef1">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#111317;border:1px solid #252a31;border-radius:20px;padding:32px">
<tr><td>
<div style="display:inline-block;background:#c6f432;color:#0a0b0d;font-weight:700;border-radius:10px;padding:6px 10px;font-size:14px">mikon</div>
<h1 style="font-size:22px;margin:24px 0 8px;color:#eceef1">${title}</h1>
<p style="font-size:15px;line-height:1.6;color:#8a919c;margin:0 0 24px">${body}</p>
<a href="${cta.url}" style="display:inline-block;background:#c6f432;color:#0a0b0d;text-decoration:none;font-weight:600;font-size:15px;border-radius:12px;padding:12px 22px">${cta.label}</a>
<p style="font-size:12px;line-height:1.6;color:#5b626c;margin:24px 0 0">${footer}</p>
<p style="font-size:12px;line-height:1.6;color:#5b626c;margin:12px 0 0;word-break:break-all">${cta.url}</p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function sendResetEmail(to: string, name: string, url: string) {
  const subject = "Reset your Mikon password";
  const text = `Hi ${name},\n\nWe got a request to reset your Mikon password. Open this link within 30 minutes to choose a new one:\n\n${url}\n\nIf you didn't ask for this, you can ignore this email. Your password won't change.`;
  if (!mailConfigured()) {
    if (process.env.NODE_ENV !== "production") return console.info(`[mail] ${subject} for ${to}: ${url}`);
    throw new HttpError(503, "Email isn't set up on this server yet");
  }
  await transporter().sendMail({
    from: env.MAIL_FROM ?? `Mikon <${env.SMTP_USER}>`,
    to,
    subject,
    text,
    html: layout(
      "Reset your password",
      `Hi ${escape(name)}, we got a request to reset your Mikon password. The link below works once and expires in 30 minutes.`,
      { label: "Choose a new password", url },
      "If you didn't ask for this, you can ignore this email. Your password won't change.",
    ),
  });
}
