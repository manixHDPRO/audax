import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { audienceListWhereForRole, UserContext } from '../../common/audience-role-access';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(user: UserContext) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scope = audienceListWhereForRole(user);

    const [stats, todayAudiences, urgent, rooms] = await Promise.all([
      this.getStats(user),
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

  private async getStats(user: UserContext) {
    const scope = audienceListWhereForRole(user);
    const statuses = ['EN_ATTENTE', 'EN_ANALYSE', 'VALIDEE', 'REJETEE', 'PLANIFIEE', 'TERMINEE'] as const;
    const counts = await Promise.all(
      statuses.map((s) => this.prisma.audience.count({ where: { ...scope, status: s } })),
    );
    return Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  }

  async getRecentActivity(user: UserContext) {
    const scope = audienceListWhereForRole(user);
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
