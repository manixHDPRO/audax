import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/user.dto';

const BCRYPT_ROUNDS = 12;

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  twoFactorEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: userSelect,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async create(dto: CreateUserDto, adminId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
      },
      select: userSelect,
    });

    await this.logAction(adminId, 'USER_CREATED', user.id, {
      email: user.email,
      role: user.role,
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, adminId: string) {
    await this.findOne(id);

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

  async resetPassword(id: string, dto: ResetPasswordDto, adminId: string) {
    await this.findOne(id);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });

    await this.logAction(adminId, 'USER_PASSWORD_RESET', id);

    return { success: true };
  }

  async toggleActive(id: string, adminId: string) {
    if (id === adminId) {
      throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte');
    }

    const current = await this.findOne(id);

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
