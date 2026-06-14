import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { audienceListWhereForRole } from '../../common/audience-role-access';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(role: UserRole) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scope = audienceListWhereForRole(role);

    const [stats, todayAudiences, urgent, rooms] = await Promise.all([
      this.getStats(role),
      this.prisma.audience.findMany({
        where: {
          ...scope,
          OR: [
            { scheduledAt: { gte: today, lt: tomorrow } },
            { createdAt: { gte: today } },
          ],
        },
        include: { visitors: { include: { visitor: true } }, room: true },
        take: 10,
      }),
      this.prisma.audience.findMany({
        where: {
          ...scope,
          priority: { in: ['URGENTE', 'CRITIQUE'] },
          status: { notIn: ['TERMINEE', 'ARCHIVEE', 'REJETEE'] },
        },
        take: 5,
        orderBy: { priority: 'desc' },
      }),
      this.prisma.room.findMany(),
    ]);

    return { stats, todayAudiences, urgent, rooms };
  }

  private async getStats(role: UserRole) {
    const scope = audienceListWhereForRole(role);
    const statuses = ['EN_ATTENTE', 'EN_ANALYSE', 'VALIDEE', 'REJETEE', 'PLANIFIEE', 'TERMINEE'] as const;
    const counts = await Promise.all(
      statuses.map((s) => this.prisma.audience.count({ where: { ...scope, status: s } })),
    );
    return Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  }

  async getRecentActivity(role: UserRole) {
    const scope = audienceListWhereForRole(role);
    return this.prisma.audienceStatusHistory.findMany({
      where: { audience: scope },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        audience: { select: { reference: true, subject: true } },
      },
    });
  }
}
