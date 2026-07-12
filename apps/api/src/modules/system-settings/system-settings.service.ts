import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_SYSTEM_SECURITY,
  SYSTEM_SECURITY_SETTING_KEY,
  SystemSecuritySettings,
} from '../../common/system-security.constants';
import { UpdateSystemSecurityDto } from './dto/system-security.dto';

@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSecuritySettings(): Promise<SystemSecuritySettings> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SYSTEM_SECURITY_SETTING_KEY },
    });

    if (!setting) {
      await this.saveSecuritySettings(DEFAULT_SYSTEM_SECURITY);
      return { ...DEFAULT_SYSTEM_SECURITY };
    }

    try {
      const parsed = JSON.parse(setting.value) as Partial<SystemSecuritySettings>;
      return this.normalizeSecuritySettings(parsed);
    } catch {
      await this.saveSecuritySettings(DEFAULT_SYSTEM_SECURITY);
      return { ...DEFAULT_SYSTEM_SECURITY };
    }
  }

  async updateSecuritySettings(
    dto: UpdateSystemSecurityDto,
    adminId: string,
  ): Promise<SystemSecuritySettings> {
    const normalized = this.normalizeSecuritySettings(dto);
    await this.saveSecuritySettings(normalized);

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'SYSTEM_SECURITY_UPDATED',
        entity: 'SystemSetting',
        entityId: SYSTEM_SECURITY_SETTING_KEY,
        afterData: normalized as unknown as Prisma.InputJsonValue,
      },
    });

    return normalized;
  }

  private normalizeSecuritySettings(
    input: Partial<SystemSecuritySettings>,
  ): SystemSecuritySettings {
    const enabled = Boolean(input.inactivityLockEnabled);
    const minutes = Number(input.inactivityTimeoutMinutes);

    return {
      inactivityLockEnabled: enabled,
      inactivityTimeoutMinutes: Number.isFinite(minutes)
        ? Math.min(Math.max(Math.round(minutes), 1), 120)
        : DEFAULT_SYSTEM_SECURITY.inactivityTimeoutMinutes,
    };
  }

  private async saveSecuritySettings(settings: SystemSecuritySettings) {
    await this.prisma.systemSetting.upsert({
      where: { key: SYSTEM_SECURITY_SETTING_KEY },
      create: { key: SYSTEM_SECURITY_SETTING_KEY, value: JSON.stringify(settings) },
      update: { value: JSON.stringify(settings) },
    });
  }
}
