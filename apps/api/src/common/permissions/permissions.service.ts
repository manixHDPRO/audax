import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS } from '../permissions';

export type PermissionKey = keyof typeof PERMISSIONS;

const MATRIX_KEY = 'role_permissions';

@Injectable()
export class PermissionsService {
  private cachedMatrix: Record<string, UserRole[]> | null = null;

  constructor(private prisma: PrismaService) {}

  async getMatrix(): Promise<Record<string, UserRole[]>> {
    if (this.cachedMatrix) return this.cachedMatrix;

    const defaults = this.getDefaultMatrix();
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: MATRIX_KEY },
    });

    if (!setting) {
      this.cachedMatrix = defaults;
      return this.cachedMatrix;
    }

    const stored = JSON.parse(setting.value) as Record<string, UserRole[]>;
    // Fusion : les clés absentes en base (ex. nouvelles permissions) reprennent les valeurs par défaut
    this.cachedMatrix = { ...defaults, ...stored };

    return this.cachedMatrix;
  }

  async hasPermission(role: UserRole, permission: PermissionKey): Promise<boolean> {
    const matrix = await this.getMatrix();
    const allowed = matrix[permission];
    if (!allowed) return false;
    return allowed.includes(role);
  }

  invalidateCache() {
    this.cachedMatrix = null;
  }

  getDefaultMatrix(): Record<string, UserRole[]> {
    return Object.fromEntries(
      Object.entries(PERMISSIONS).map(([key, roles]) => [key, [...roles]]),
    ) as Record<string, UserRole[]>;
  }

  getPermissionKeys(): PermissionKey[] {
    return Object.keys(PERMISSIONS) as PermissionKey[];
  }
}
