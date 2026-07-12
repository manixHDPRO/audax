import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { audienceListWhereForRole, UserContext } from '../../common/audience-role-access';

const MONTH_LABELS_FR = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
] as const;

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

  async getReports(user: UserContext) {
    const scope = audienceListWhereForRole(user);
    const stats = await this.getStats(user);
    const total = Object.values(stats).reduce((sum, n) => sum + n, 0);
    const validatedLike = stats.VALIDEE + stats.PLANIFIEE + stats.TERMINEE;
    const validationRate = total > 0 ? Math.round((validatedLike / total) * 100) : 0;

    const [byCategoryRaw, byMonth] = await Promise.all([
      this.prisma.audience.groupBy({
        by: ['category'],
        where: scope,
        _count: { _all: true },
        orderBy: { _count: { category: 'desc' } },
      }),
      this.getMonthlyTrend(scope),
    ]);

    const byCategory = byCategoryRaw.map((row) => ({
      name: row.category || 'AUTRE',
      value: row._count._all,
    }));

    return {
      stats,
      total,
      validationRate,
      byCategory,
      byMonth,
    };
  }

  private async getMonthlyTrend(scope: Prisma.AudienceWhereInput) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const audiences = await this.prisma.audience.findMany({
      where: {
        ...scope,
        createdAt: { gte: start },
      },
      select: { createdAt: true, status: true },
    });

    const buckets = new Map<
      string,
      { month: string; audiences: number; validees: number; sortKey: string }
    >();

    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(sortKey, {
        sortKey,
        month: MONTH_LABELS_FR[d.getMonth()],
        audiences: 0,
        validees: 0,
      });
    }

    for (const row of audiences) {
      const d = row.createdAt;
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.get(sortKey);
      if (!bucket) continue;
      bucket.audiences += 1;
      if (
        row.status === 'VALIDEE' ||
        row.status === 'PLANIFIEE' ||
        row.status === 'TERMINEE'
      ) {
        bucket.validees += 1;
      }
    }

    return [...buckets.values()]
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ month, audiences: count, validees }) => ({
        month,
        audiences: count,
        validees,
      }));
  }

  private async getStats(user: UserContext) {
    const scope = audienceListWhereForRole(user);
    const statuses = [
      'EN_ATTENTE',
      'EN_ANALYSE',
      'VALIDEE',
      'REJETEE',
      'PLANIFIEE',
      'TERMINEE',
    ] as const;
    const counts = await Promise.all(
      statuses.map((s) => this.prisma.audience.count({ where: { ...scope, status: s } })),
    );
    return Object.fromEntries(statuses.map((s, i) => [s, counts[i]])) as Record<
      (typeof statuses)[number],
      number
    >;
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
