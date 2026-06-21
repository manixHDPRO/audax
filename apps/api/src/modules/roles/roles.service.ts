import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS } from '../../common/permissions';
import { PERMISSION_LABELS, PERMISSION_GROUPS, ROLE_DESCRIPTIONS } from '../../common/permission-labels';
import { PermissionsService } from '../../common/permissions/permissions.service';
import { SYSTEM_ROLE_ORDER } from '../../common/role-order';
import { CreateCustomRoleDto, UpdateCustomRoleDto, UpdateRoleMatrixDto, UpdateSystemRoleDto } from './dto/role.dto';

const CUSTOM_ROLES_KEY = 'custom_roles';
const ROLE_LABELS_KEY = 'role_labels';
const ROLE_DESCRIPTIONS_KEY = 'role_descriptions';

export interface CustomRole {
  id: string;
  code: string;
  label: string;
  description?: string;
  permissions: string[];
  createdAt: string;
}

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private permissionsService: PermissionsService,
  ) {}

  async getMatrix() {
    const [matrix, customRolesSetting, roleLabels, roleDescriptions] = await Promise.all([
      this.permissionsService.getMatrix(),
      this.prisma.systemSetting.findUnique({ where: { key: CUSTOM_ROLES_KEY } }),
      this.loadRoleLabels(),
      this.loadRoleDescriptions(),
    ]);

    const customRoles: CustomRole[] = customRolesSetting
      ? JSON.parse(customRolesSetting.value)
      : [];

    return {
      systemRoles: SYSTEM_ROLE_ORDER,
      permissionKeys: this.permissionsService.getPermissionKeys(),
      permissionLabels: PERMISSION_LABELS,
      permissionGroups: PERMISSION_GROUPS,
      roleLabels,
      roleDescriptions,
      matrix,
      customRoles,
    };
  }

  async updateMatrix(dto: UpdateRoleMatrixDto, adminId: string) {
    const validKeys = new Set(Object.keys(PERMISSIONS));
    const validRoles = new Set(Object.values(UserRole));

    for (const [key, roles] of Object.entries(dto.permissions)) {
      if (!validKeys.has(key)) {
        throw new BadRequestException(`Permission inconnue : ${key}`);
      }
      for (const role of roles) {
        if (!validRoles.has(role)) {
          throw new BadRequestException(`Rôle invalide : ${role}`);
        }
      }
    }

    await this.prisma.systemSetting.upsert({
      where: { key: 'role_permissions' },
      create: { key: 'role_permissions', value: JSON.stringify(dto.permissions) },
      update: { value: JSON.stringify(dto.permissions) },
    });

    this.permissionsService.invalidateCache();

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'ROLE_MATRIX_UPDATED',
        entity: 'Role',
        entityId: 'matrix',
      },
    });

    return this.getMatrix();
  }

  async createCustomRole(dto: CreateCustomRoleDto, adminId: string) {
    const code = dto.code.toUpperCase().replace(/\s+/g, '_');
    const validKeys = new Set(Object.keys(PERMISSIONS));

    if (Object.values(UserRole).includes(code as UserRole)) {
      throw new ConflictException('Ce code correspond à un rôle système existant');
    }

    for (const perm of dto.permissions ?? []) {
      if (!validKeys.has(perm)) {
        throw new BadRequestException(`Permission inconnue : ${perm}`);
      }
    }

    const customRoles = await this.loadCustomRoles();

    if (customRoles.some((r) => r.code === code)) {
      throw new ConflictException('Un rôle avec ce code existe déjà');
    }

    const role: CustomRole = {
      id: `custom_${Date.now()}`,
      code,
      label: dto.label,
      description: dto.description,
      permissions: dto.permissions ?? [],
      createdAt: new Date().toISOString(),
    };

    customRoles.push(role);
    await this.saveCustomRoles(customRoles);

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CUSTOM_ROLE_CREATED',
        entity: 'Role',
        entityId: code,
        afterData: role as unknown as Prisma.InputJsonValue,
      },
    });

    return role;
  }

  async updateCustomRole(id: string, dto: UpdateCustomRoleDto, adminId: string) {
    const customRoles = await this.loadCustomRoles();
    const index = customRoles.findIndex((r) => r.id === id);
    if (index === -1) throw new NotFoundException('Rôle personnalisé introuvable');

    if (dto.permissions) {
      const validKeys = new Set(Object.keys(PERMISSIONS));
      for (const perm of dto.permissions) {
        if (!validKeys.has(perm)) {
          throw new BadRequestException(`Permission inconnue : ${perm}`);
        }
      }
    }

    customRoles[index] = {
      ...customRoles[index],
      ...dto,
    };

    await this.saveCustomRoles(customRoles);

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CUSTOM_ROLE_UPDATED',
        entity: 'Role',
        entityId: customRoles[index].code,
      },
    });

    return customRoles[index];
  }

  async deleteCustomRole(id: string, adminId: string) {
    const customRoles = await this.loadCustomRoles();
    const role = customRoles.find((r) => r.id === id);
    if (!role) throw new NotFoundException('Rôle personnalisé introuvable');

    await this.saveCustomRoles(customRoles.filter((r) => r.id !== id));

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CUSTOM_ROLE_DELETED',
        entity: 'Role',
        entityId: role.code,
      },
    });

    return { success: true };
  }

  async updateSystemRole(code: string, dto: UpdateSystemRoleDto, adminId: string) {
    const roleCode = code.toUpperCase() as UserRole;
    if (!Object.values(UserRole).includes(roleCode)) {
      throw new BadRequestException('Rôle système invalide');
    }
    if (!dto.label && dto.description === undefined) {
      throw new BadRequestException('Aucune modification fournie');
    }

    const [labels, descriptions] = await Promise.all([
      this.loadRoleLabels(),
      this.loadRoleDescriptions(),
    ]);

    if (dto.label) labels[roleCode] = dto.label.trim();
    if (dto.description !== undefined) descriptions[roleCode] = dto.description.trim();

    await Promise.all([
      this.saveJsonSetting(ROLE_LABELS_KEY, labels),
      this.saveJsonSetting(ROLE_DESCRIPTIONS_KEY, descriptions),
    ]);

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'SYSTEM_ROLE_UPDATED',
        entity: 'Role',
        entityId: roleCode,
        afterData: { label: labels[roleCode], description: descriptions[roleCode] } as Prisma.InputJsonValue,
      },
    });

    return {
      code: roleCode,
      label: labels[roleCode],
      description: descriptions[roleCode],
    };
  }

  private defaultRoleLabels(): Record<string, string> {
    return {
      ADMIN: 'Administrateur',
      CHEF: 'Chef de cabinet',
      SECRETAIRE: 'Secrétaire',
      PROTOCOL: 'Protocol',
      CEMG: 'Chef d\'état major général',
      SALLE_ATTENTE: 'Salle d\'attente',
      OBSERVATEUR: 'Observateur',
    };
  }

  private async loadRoleLabels(): Promise<Record<string, string>> {
    const stored = await this.loadJsonSetting(ROLE_LABELS_KEY);
    return { ...this.defaultRoleLabels(), ...stored };
  }

  private async loadRoleDescriptions(): Promise<Record<string, string>> {
    const stored = await this.loadJsonSetting(ROLE_DESCRIPTIONS_KEY);
    return { ...ROLE_DESCRIPTIONS, ...stored };
  }

  private async loadJsonSetting(key: string): Promise<Record<string, string>> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return setting ? JSON.parse(setting.value) : {};
  }

  private async saveJsonSetting(key: string, value: Record<string, string>) {
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: { value: JSON.stringify(value) },
    });
  }

  private async loadCustomRoles(): Promise<CustomRole[]> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: CUSTOM_ROLES_KEY },
    });
    return setting ? JSON.parse(setting.value) : [];
  }

  private async saveCustomRoles(roles: CustomRole[]) {
    await this.prisma.systemSetting.upsert({
      where: { key: CUSTOM_ROLES_KEY },
      create: { key: CUSTOM_ROLES_KEY, value: JSON.stringify(roles) },
      update: { value: JSON.stringify(roles) },
    });
  }
}
