import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_MILITARY_GRADES,
  MILITARY_GRADES_SETTING_KEY,
} from '../../common/military-grades.constants';

export interface MilitaryGradeItem {
  id: string;
  label: string;
  createdAt: string;
}

@Injectable()
export class MilitaryGradesService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<MilitaryGradeItem[]> {
    return this.loadGrades();
  }

  async create(label: string, adminId: string): Promise<MilitaryGradeItem> {
    const normalized = label.trim().replace(/\s+/g, ' ');
    if (normalized.length < 2) {
      throw new BadRequestException('Le libellé du grade est trop court');
    }

    const grades = await this.loadGrades();
    const exists = grades.some((g) => g.label.localeCompare(normalized, 'fr', { sensitivity: 'accent' }) === 0);
    if (exists) {
      throw new ConflictException('Ce grade existe déjà');
    }

    const grade: MilitaryGradeItem = {
      id: `grade_${Date.now()}`,
      label: normalized,
      createdAt: new Date().toISOString(),
    };

    grades.push(grade);
    await this.saveGrades(grades);

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'MILITARY_GRADE_CREATED',
        entity: 'MilitaryGrade',
        entityId: grade.id,
        afterData: grade as unknown as Prisma.InputJsonValue,
      },
    });

    return grade;
  }

  async remove(id: string, adminId: string): Promise<{ success: true }> {
    const grades = await this.loadGrades();
    const index = grades.findIndex((g) => g.id === id);
    if (index === -1) {
      throw new NotFoundException('Grade introuvable');
    }

    const [removed] = grades.splice(index, 1);
    await this.saveGrades(grades);

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'MILITARY_GRADE_DELETED',
        entity: 'MilitaryGrade',
        entityId: removed.id,
        afterData: { label: removed.label } as Prisma.InputJsonValue,
      },
    });

    return { success: true };
  }

  private async loadGrades(): Promise<MilitaryGradeItem[]> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: MILITARY_GRADES_SETTING_KEY },
    });

    if (!setting) {
      const defaults = this.buildDefaultGrades();
      await this.saveGrades(defaults);
      return defaults;
    }

    const parsed = JSON.parse(setting.value) as MilitaryGradeItem[];
    return parsed.sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'accent' }));
  }

  private async saveGrades(grades: MilitaryGradeItem[]) {
    const sorted = [...grades].sort((a, b) =>
      a.label.localeCompare(b.label, 'fr', { sensitivity: 'accent' }),
    );

    await this.prisma.systemSetting.upsert({
      where: { key: MILITARY_GRADES_SETTING_KEY },
      create: { key: MILITARY_GRADES_SETTING_KEY, value: JSON.stringify(sorted) },
      update: { value: JSON.stringify(sorted) },
    });
  }

  private buildDefaultGrades(): MilitaryGradeItem[] {
    const now = new Date().toISOString();
    return DEFAULT_MILITARY_GRADES.map((label, index) => ({
      id: `grade_default_${index}`,
      label,
      createdAt: now,
    }));
  }
}
