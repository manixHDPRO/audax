import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserContext } from '../../common/audience-role-access';
import {
  isAudienceNotificationLink,
  isUserConcernedByAudience,
  parseAudienceIdFromNotificationLink,
} from '../../common/notification-concern';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: UserContext) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const audienceIds = [
      ...new Set(
        notifications
          .map((n) => parseAudienceIdFromNotificationLink(n.link))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const audiences =
      audienceIds.length > 0
        ? await this.prisma.audience.findMany({
            where: { id: { in: audienceIds } },
            select: {
              id: true,
              priority: true,
              status: true,
              createdById: true,
              visitTargetUserId: true,
              visitTarget: {
                select: { role: true, cabinetId: true, bureauId: true },
              },
              statusHistory: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { toStatus: true, comment: true },
              },
              validations: {
                select: { decision: true, comment: true },
              },
            },
          })
        : [];

    const audienceMap = new Map(audiences.map((a) => [a.id, a]));

    return notifications.filter((notification) => {
      if (!isAudienceNotificationLink(notification.link)) {
        return true;
      }

      const audienceId = parseAudienceIdFromNotificationLink(notification.link);
      if (!audienceId) {
        return false;
      }

      const audience = audienceMap.get(audienceId);
      if (!audience) {
        return false;
      }

      return isUserConcernedByAudience(audience, user);
    });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
