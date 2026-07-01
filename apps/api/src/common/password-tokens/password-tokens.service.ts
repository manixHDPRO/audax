import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordTokenType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../modules/mail/mail.service';

const TOKEN_BYTES = 32;
const INVITE_TTL_MS = 48 * 60 * 60 * 1000;
const RESET_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PasswordTokensService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  private buildSetPasswordUrl(token: string): string {
    const base = this.config.get<string>('APP_URL') ?? this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000';
    return `${base.replace(/\/$/, '')}/set-password?token=${token}`;
  }

  async sendTokenEmail(userId: string, type: PasswordTokenType): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');

    await this.prisma.passwordResetToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const ttl = type === PasswordTokenType.INVITE ? INVITE_TTL_MS : RESET_TTL_MS;

    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId,
        type,
        expiresAt: new Date(Date.now() + ttl),
      },
    });

    await this.mail.sendPasswordLink({
      to: user.email,
      firstName: user.firstName,
      link: this.buildSetPasswordUrl(token),
      type,
    });
  }

  async validateToken(token: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { email: true, firstName: true, isActive: true } } },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Lien invalide ou expiré');
    }

    if (!record.user.isActive && record.type !== PasswordTokenType.INVITE) {
      throw new BadRequestException('Compte désactivé');
    }

    return record;
  }

  async consumeToken(token: string, passwordHash: string): Promise<void> {
    const record = await this.validateToken(token);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          passwordSetAt: new Date(),
          failedAttempts: 0,
          lockedUntil: null,
          ...(record.type === PasswordTokenType.INVITE ? { isActive: true } : {}),
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);
  }
}
