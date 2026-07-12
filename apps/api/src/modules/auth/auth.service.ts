import { Injectable, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/profile.dto';
import { UnlockSessionDto } from './dto/unlock-session.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { TwoFactorService } from './two-factor.service';
import { PermissionsService } from '../../common/permissions/permissions.service';
import { PasswordTokensService } from '../../common/password-tokens/password-tokens.service';
import { UserRole } from '@prisma/client';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

const meSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  twoFactorEnabled: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private twoFactor: TwoFactorService,
    private permissionsService: PermissionsService,
    private passwordTokens: PasswordTokensService,
  ) {}

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      await this.logAttempt(null, dto.email, ip, false);
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!user.passwordSetAt) {
      await this.logAttempt(user.id, dto.email, ip, false);
      throw new ForbiddenException('Activez votre compte via le lien reçu par e-mail');
    }

    if (!user.isActive) {
      await this.logAttempt(user.id, dto.email, ip, false);
      throw new ForbiddenException('Compte désactivé');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Compte temporairement verrouillé');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) {
      const attempts = user.failedAttempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: attempts,
          lockedUntil: attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null,
        },
      });
      await this.logAttempt(user.id, dto.email, ip, false);
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!dto.totpCode) {
        const tempToken = this.twoFactor.createTempToken(user.id, user.email);
        return {
          requires2FA: true,
          tempToken,
          message: 'Code 2FA requis',
        };
      }

      if (!this.twoFactor.verifyCode(user.twoFactorSecret, dto.totpCode)) {
        await this.logAttempt(user.id, dto.email, ip, false);
        throw new UnauthorizedException('Code 2FA invalide');
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await this.logAttempt(user.id, dto.email, ip, true);

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.cabinetId, user.bureauId);

    return {
      requires2FA: false,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        cabinetId: user.cabinetId,
        bureauId: user.bureauId,
      },
      ...tokens,
    };
  }

  async verify2FA(tempToken: string, totpCode: string, ip?: string) {
    const { sub: userId } = this.twoFactor.verifyTempToken(tempToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.isActive || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('Utilisateur invalide');
    }

    if (!this.twoFactor.verifyCode(user.twoFactorSecret, totpCode)) {
      await this.logAttempt(user.id, user.email, ip, false);
      throw new UnauthorizedException('Code 2FA invalide');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logAttempt(user.id, user.email, ip, true);

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.cabinetId, user.bureauId);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        cabinetId: user.cabinetId,
        bureauId: user.bureauId,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      stored.user.cabinetId,
      stored.user.bureauId,
    );
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: meSelect,
    });
    if (!user?.isActive) throw new NotFoundException('Utilisateur introuvable');

    const permissions = await this.resolvePermissions(user.role);

    return { ...user, permissions };
  }

  async resolvePermissions(role: UserRole): Promise<string[]> {
    if (role === UserRole.SUPER_ADMIN) {
      return this.permissionsService.getPermissionKeys();
    }

    const matrix = await this.permissionsService.getMatrix();
    return Object.entries(matrix)
      .filter(([, roles]) => roles.includes(role))
      .map(([key]) => key);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new NotFoundException('Utilisateur introuvable');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect');

    if (dto.currentPassword === dto.newPassword) {
      throw new ForbiddenException('Le nouveau mot de passe doit être différent');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGED',
        entity: 'Auth',
        entityId: userId,
      },
    });

    return { success: true };
  }

  async unlockSession(userId: string, dto: UnlockSessionDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new NotFoundException('Utilisateur introuvable');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    if (user.twoFactorEnabled) {
      if (!user.twoFactorSecret) {
        throw new UnauthorizedException('Configuration 2FA incomplète');
      }
      if (!dto.totpCode || !this.twoFactor.verifyCode(user.twoFactorSecret, dto.totpCode)) {
        throw new UnauthorizedException('Code 2FA invalide');
      }
    }

    return { success: true };
  }

  async validatePasswordToken(token: string) {
    const record = await this.passwordTokens.validateToken(token);
    return {
      valid: true,
      email: record.user.email,
      type: record.type,
    };
  }

  async setPassword(dto: SetPasswordDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const record = await this.passwordTokens.validateToken(dto.token);

    await this.passwordTokens.consumeToken(dto.token, passwordHash);

    await this.prisma.auditLog.create({
      data: {
        userId: record.userId,
        action: record.type === 'INVITE' ? 'PASSWORD_SET_INVITE' : 'PASSWORD_SET_RESET',
        entity: 'Auth',
        entityId: record.userId,
      },
    });

    return { success: true };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    cabinetId?: string | null,
    bureauId?: string | null,
  ) {
    const payload = { sub: userId, email, role, cabinetId, bureauId };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN') ?? '15m',
    });

    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpires = this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const expiresMs = refreshExpires.endsWith('d')
      ? parseInt(refreshExpires) * 86400000
      : 7 * 86400000;

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + expiresMs),
      },
    });

    return { accessToken, refreshToken };
  }

  private async logAttempt(userId: string | null, email: string, ip?: string, success?: boolean) {
    await this.prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        entity: 'Auth',
        entityId: email,
        ipAddress: ip,
      },
    });
  }
}
