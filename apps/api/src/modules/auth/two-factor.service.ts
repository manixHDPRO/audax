import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async setup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');
    if (user.twoFactorEnabled) throw new BadRequestException('2FA déjà activé');

    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const otpauth = authenticator.keyuri(user.email, 'AUDAX FARDC', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    return { secret, otpauth, qrCodeDataUrl };
  }

  async enable(userId: string, totpCode: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new BadRequestException('Configurez d\'abord la 2FA');

    const valid = authenticator.verify({ token: totpCode, secret: user.twoFactorSecret });
    if (!valid) throw new UnauthorizedException('Code 2FA invalide');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: '2FA_ENABLED', entity: 'Auth', entityId: user.email },
    });

    return { success: true, twoFactorEnabled: true };
  }

  async disable(userId: string, totpCode: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA non activé');
    }

    const valid = authenticator.verify({ token: totpCode, secret: user.twoFactorSecret });
    if (!valid) throw new UnauthorizedException('Code 2FA invalide');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: '2FA_DISABLED', entity: 'Auth', entityId: user.email },
    });

    return { success: true, twoFactorEnabled: false };
  }

  verifyCode(secret: string, totpCode: string): boolean {
    return authenticator.verify({ token: totpCode, secret });
  }

  createTempToken(userId: string, email: string): string {
    return this.jwt.sign(
      { sub: userId, email, purpose: '2fa' },
      {
        secret: this.config.get('JWT_SECRET') ?? 'dev-secret',
        expiresIn: '5m',
      },
    );
  }

  verifyTempToken(tempToken: string): { sub: string; email: string } {
    try {
      const payload = this.jwt.verify(tempToken, {
        secret: this.config.get('JWT_SECRET') ?? 'dev-secret',
      }) as { sub: string; email: string; purpose?: string };

      if (payload.purpose !== '2fa') throw new Error('Invalid purpose');
      return { sub: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('Session 2FA expirée, reconnectez-vous');
    }
  }
}
