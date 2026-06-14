import { NotificationType, PrismaClient, UserRole } from '@prisma/client';
import {
  shouldNotifyOnAudienceCreate,
  shouldNotifyOnDircabForward,
} from './audience-role-access';

type AudienceNotify = {
  id: string;
  reference: string;
  subject: string;
  requesterName: string;
};

export async function notifyAudienceCreated(
  prisma: PrismaClient,
  audience: AudienceNotify,
) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: [UserRole.PROTOCOL, UserRole.ADMIN] },
    },
    select: { id: true, role: true },
  });

  const recipients = users.filter((u) => shouldNotifyOnAudienceCreate(u.role));
  if (!recipients.length) return;

  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      userId: user.id,
      type: NotificationType.INFO,
      title: 'Nouvelle demande d\'audience',
      message: `${audience.reference} — ${audience.subject} (${audience.requesterName})`,
      link: `/audiences/${audience.id}`,
    })),
  });
}

export async function notifyAudienceForwardedToDircab(
  prisma: PrismaClient,
  audience: AudienceNotify,
) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: [UserRole.CHEF, UserRole.ADMIN] },
    },
    select: { id: true, role: true },
  });

  const recipients = users.filter((u) => shouldNotifyOnDircabForward(u.role));
  if (!recipients.length) return;

  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      userId: user.id,
      type: NotificationType.WARNING,
      title: 'Audience transmise au Dircab',
      message: `${audience.reference} — ${audience.subject}`,
      link: `/audiences/${audience.id}`,
    })),
  });
}
