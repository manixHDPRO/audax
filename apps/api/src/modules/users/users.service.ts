import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PasswordTokenType, Prisma, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PasswordTokensService } from '../../common/password-tokens/password-tokens.service';
import {
  assertCallerCanAccessUser,
  assertRoleAssignable,
  hiddenSuperAdminUserFilter,
} from '../../common/super-admin-access';

const BCRYPT_ROUNDS = 12;

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  twoFactorEnabled: true,
  cabinetId: true,
  bureauId: true,
  cabinet: {
    select: { id: true, name: true }
  },
  bureau: {
    select: { id: true, name: true }
  },
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordTokens: PasswordTokensService,
  ) {}

  findAll(callerRole: UserRole) {
    return this.prisma.user.findMany({
      where: hiddenSuperAdminUserFilter(callerRole),
      select: userSelect,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string, callerRole: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    assertCallerCanAccessUser(callerRole, user.role);
    return user;
  }

  async create(dto: CreateUserDto, adminId: string, callerRole: UserRole) {
    assertRoleAssignable(dto.role);
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const placeholderHash = await bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: placeholderHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        cabinetId: dto.cabinetId,
        bureauId: dto.bureauId,
        isActive: false,
      },
      select: userSelect,
    });

    await this.passwordTokens.sendTokenEmail(user.id, PasswordTokenType.INVITE);

    await this.logAction(adminId, 'USER_CREATED', user.id, {
      email: user.email,
      role: user.role,
      invitationSent: true,
    });

    return { ...user, invitationSent: true };
  }

  async update(id: string, dto: UpdateUserDto, adminId: string, callerRole: UserRole) {
    await this.findOne(id, callerRole);
    if (dto.role) assertRoleAssignable(dto.role);

    if (id === adminId) {
      if (dto.isActive === false) {
        throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte');
      }
      if (dto.role) {
        throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: userSelect,
    });

    await this.logAction(adminId, 'USER_UPDATED', user.id, dto as Prisma.InputJsonValue);

    return user;
  }

  async sendPasswordLink(id: string, adminId: string, callerRole: UserRole) {
    await this.findOne(id, callerRole);
    const hasPassword = await this.hasPasswordSet(id);
    const type = hasPassword ? PasswordTokenType.RESET : PasswordTokenType.INVITE;

    await this.passwordTokens.sendTokenEmail(id, type);

    await this.logAction(adminId, 'USER_PASSWORD_LINK_SENT', id, { type });

    return { success: true, message: 'Un lien a été envoyé par e-mail' };
  }

  async toggleActive(id: string, adminId: string, callerRole: UserRole) {
    if (id === adminId) {
      throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte');
    }

    const current = await this.findOne(id, callerRole);

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: userSelect,
    });

    if (!user.isActive) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    await this.logAction(
      adminId,
      user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      user.id,
    );

    return user;
  }

  private async hasPasswordSet(id: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { passwordSetAt: true },
    });
    return !!user?.passwordSetAt;
  }

  private async logAction(
    adminId: string,
    action: string,
    entityId: string,
    afterData?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action,
        entity: 'User',
        entityId,
        afterData: afterData ?? undefined,
      },
    });
  }
}
