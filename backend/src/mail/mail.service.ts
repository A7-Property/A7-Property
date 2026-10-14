import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport = process.env.MAIL_DRIVER === "smtp" ? nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2" },
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  }) : null;

  // --- Account lifecycle: these throw so the caller can tell the user delivery failed. ---

  async sendVerification(email: string, token: string) {
    const url = this.link("verify-email", token);
    return this.send(email, "Verify your A7 Property email", `Open this link to verify your email. It expires in 24 hours:\n${url}`);
  }

  async sendPasswordReset(email: string, token: string) {
    const url = this.link("reset-password", token);
    return this.send(email, "Reset your A7 Property password", `Open this link to reset your password. It expires in 30 minutes:\n${url}`);
  }

  // --- Security notices and activity notifications: best effort, never block a request. ---

  async notifyPasswordChanged(email: string) {
    return this.notify(email, "Your A7 Property password changed", `Your password was just changed and all other sessions were signed out.\n\nIf this was not you, reset your password immediately at ${this.appUrl("/forgot-password")}.`);
  }

  async notifyAccountLocked(email: string, minutes: number) {
    return this.notify(email, "A7 Property sign-in temporarily locked", `Too many failed sign-in attempts locked your account for ${minutes} minutes.\n\nIf this was not you, reset your password at ${this.appUrl("/forgot-password")} once the lock expires.`);
  }

  async notifyNewInquiry(listerEmail: string, input: { propertyTitle: string; subject: string; seekerName: string }) {
    return this.notify(
      listerEmail,
      `New inquiry: ${input.propertyTitle}`,
      `${input.seekerName} sent an inquiry about "${input.propertyTitle}".\n\nSubject: ${input.subject}\n\nOpen your dashboard to reply: ${this.appUrl("/owner")}`,
    );
  }

  async notifyViewingRequested(listerEmail: string, input: { propertyTitle: string; scheduledAt: Date; seekerName: string }) {
    return this.notify(
      listerEmail,
      `Viewing request: ${input.propertyTitle}`,
      `${input.seekerName} requested a viewing of "${input.propertyTitle}" on ${input.scheduledAt.toISOString()}.\n\nConfirm or decline it in your dashboard: ${this.appUrl("/owner")}`,
    );
  }

  async notifyViewingStatus(seekerEmail: string, input: { propertyTitle: string; status: string; scheduledAt: Date }) {
    return this.notify(
      seekerEmail,
      `Viewing ${input.status.toLowerCase()}: ${input.propertyTitle}`,
      `Your viewing request for "${input.propertyTitle}" on ${input.scheduledAt.toISOString()} is now ${input.status}.\n\nSee your viewings: ${this.appUrl("/dashboard")}`,
    );
  }

  async notifyVerificationDecision(ownerEmail: string, input: { propertyTitle: string; status: string; note?: string | null }) {
    return this.notify(
      ownerEmail,
      `Listing verification ${input.status.toLowerCase()}: ${input.propertyTitle}`,
      `The verification status of "${input.propertyTitle}" is now ${input.status}.${input.note ? `\n\nReviewer note: ${input.note}` : ""}\n\nOpen your listings: ${this.appUrl("/owner")}`,
    );
  }

  async notifyNewMessage(recipientEmail: string, input: { propertyTitle: string; senderName: string }) {
    return this.notify(
      recipientEmail,
      `New message about ${input.propertyTitle}`,
      `${input.senderName} sent you a message about "${input.propertyTitle}".\n\nOpen your messages: ${this.appUrl("/messages")}`,
    );
  }

  private appUrl(path: string) {
    const frontend = (process.env.FRONTEND_URL ?? "http://localhost:3000").split(",")[0].trim();
    return new URL(path, frontend).toString();
  }

  private link(path: string, token: string) {
    const url = new URL(this.appUrl(`/${path}`));
    url.searchParams.set("token", token);
    return url.toString();
  }

  /** Delivery failures here are logged and swallowed: a notification must not fail the user's action. */
  private async notify(to: string, subject: string, text: string) {
    try {
      await this.send(to, subject, text);
    } catch (error) {
      this.logger.error(`Notification "${subject}" to ${to} failed`, error instanceof Error ? error.stack : undefined);
    }
  }

  private async send(to: string, subject: string, text: string) {
    if (!this.transport) {
      this.logger.warn(`Development mail to ${to}: ${subject}\n${text}`);
      return;
    }
    await this.transport.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text,
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#101828"><p>${escapeHtml(text).replace(/\n/g, "<br>")}</p><p style="color:#667085;font-size:13px">A7 Property</p></div>`,
    });
  }
}
