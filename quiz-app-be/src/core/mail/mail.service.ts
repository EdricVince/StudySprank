import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {}

  /** Build a transporter from SMTP_* env, or null if not configured. */
  private transporter(): nodemailer.Transporter | null {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) return null;

    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
      auth: { user, pass },
    });
  }

  /** Send a password-reset email. Falls back to logging the link when SMTP is not configured (dev). */
  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const transporter = this.transporter();
    if (!transporter) {
      this.logger.warn(
        `SMTP not configured — password reset link for ${to}:\n${resetUrl}`,
      );
      return;
    }

    const from =
      this.config.get<string>('SMTP_FROM') ||
      this.config.get<string>('SMTP_USER');
    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 8px">Reset your StudySpark password</h2>
        <p style="color:#475569;margin:0 0 20px">We received a request to reset your password. Click the button below to choose a new one. This link expires in 30 minutes.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px">Reset password</a>
        <p style="color:#94a3b8;font-size:13px;margin:24px 0 0">If the button doesn't work, copy this link:<br><a href="${resetUrl}" style="color:#4f46e5;word-break:break-all">${resetUrl}</a></p>
        <p style="color:#94a3b8;font-size:13px;margin:16px 0 0">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      </div>`;

    try {
      await transporter.sendMail({
        from: `StudySpark <${from}>`,
        to,
        subject: 'Reset your StudySpark password',
        text: `Reset your StudySpark password (expires in 30 minutes): ${resetUrl}`,
        html,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err) {
      // Log the link so the flow still works in dev even if SMTP delivery fails.
      this.logger.error(
        `Failed to send reset email to ${to}: ${(err as Error).message}. Link: ${resetUrl}`,
      );
      throw err;
    }
  }
}
