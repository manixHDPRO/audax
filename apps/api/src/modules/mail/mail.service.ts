import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService) {}

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    if (!host) return null;

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get('SMTP_PORT') ?? 587),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });

    return this.transporter;
  }

  async sendPasswordLink(params: {
    to: string;
    firstName: string;
    link: string;
    type: 'INVITE' | 'RESET';
  }): Promise<void> {
    const appName = this.config.get('NEXT_PUBLIC_APP_NAME') ?? 'AUDAX';
    const from = this.config.get('SMTP_FROM') ?? `noreply@${appName.toLowerCase()}.local`;

    const isInvite = params.type === 'INVITE';
    const subject = isInvite
      ? `${appName} — Activez votre compte`
      : `${appName} — Réinitialisation de votre mot de passe`;

    const intro = isInvite
      ? `Bonjour ${params.firstName},<br><br>Un compte ${appName} a été créé pour vous. Cliquez sur le lien ci-dessous pour définir votre mot de passe et activer votre accès.`
      : `Bonjour ${params.firstName},<br><br>Une réinitialisation de mot de passe a été demandée pour votre compte ${appName}. Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe.`;

    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <p>${intro}</p>
        <p style="margin: 24px 0;">
          <a href="${params.link}" style="display: inline-block; padding: 12px 24px; background: #2d5016; color: #f5f0e6; text-decoration: none; border-radius: 8px; font-weight: 600;">
            ${isInvite ? 'Activer mon compte' : 'Réinitialiser mon mot de passe'}
          </a>
        </p>
        <p style="font-size: 13px; color: #666;">Ce lien expire sous 48 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
        <p style="font-size: 12px; color: #999; word-break: break-all;">${params.link}</p>
      </div>
    `;

    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(
        `SMTP non configuré — lien ${params.type} pour ${params.to} : ${params.link}`,
      );
      return;
    }

    await transporter.sendMail({
      from,
      to: params.to,
      subject,
      html,
    });
  }
}
