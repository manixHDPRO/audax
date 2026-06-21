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
  visitTargetUserId?: string | null;
};

export async function notifyAudienceCreated(
  prisma: PrismaClient,
  audience: AudienceNotify,
) {
  // Récupérer les infos de la cible de visite pour le scoping
  let targetCabinetId: string | null = null;
  let targetBureauId: string | null = null;

  if (audience.visitTargetUserId) {
    const target = await prisma.user.findUnique({
      where: { id: audience.visitTargetUserId },
      select: { cabinetId: true, bureauId: true },
    });
    targetCabinetId = target?.cabinetId ?? null;
    targetBureauId = target?.bureauId ?? null;
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: [UserRole.PROTOCOL, UserRole.ADMIN] },
    },
    select: { id: true, role: true, cabinetId: true, bureauId: true },
  });

  const recipients = users.filter((u) => {
    if (!shouldNotifyOnAudienceCreate(u.role)) return false;
    if (u.role === UserRole.ADMIN) return true;

    // Pour le Protocol, on ne notifie que si c'est dans son cabinet/bureau
    if (targetCabinetId && u.cabinetId === targetCabinetId) return true;
    if (targetBureauId && u.bureauId === targetBureauId) return true;

    // Si pas de cible ou pas de match, on ne notifie pas (sauf si admin)
    return false;
  });

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
  // Récupérer les infos de la cible de visite pour le scoping
  let targetCabinetId: string | null = null;
  let targetBureauId: string | null = null;

  if (audience.visitTargetUserId) {
    const target = await prisma.user.findUnique({
      where: { id: audience.visitTargetUserId },
      select: { cabinetId: true, bureauId: true },
    });
    targetCabinetId = target?.cabinetId ?? null;
    targetBureauId = target?.bureauId ?? null;
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: [UserRole.CHEF, UserRole.ADMIN] },
    },
    select: { id: true, role: true, cabinetId: true, bureauId: true },
  });

  const recipients = users.filter((u) => {
    if (!shouldNotifyOnDircabForward(u.role)) return false;
    if (u.role === UserRole.ADMIN) return true;

    // Pour le Chef de cabinet, on ne notifie que si c'est dans son cabinet/bureau
    if (targetCabinetId && u.cabinetId === targetCabinetId) return true;
    if (targetBureauId && u.bureauId === targetBureauId) return true;

    return false;
  });

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
