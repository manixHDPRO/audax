import { NotificationType, PrismaClient, UserRole } from '@prisma/client';
import {
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
  let targetCabinetId: string | null = null;
  let targetBureauId: string | null = null;
  let targetRole: UserRole | null = null;

  if (audience.visitTargetUserId) {
    const target = await prisma.user.findUnique({
      where: { id: audience.visitTargetUserId },
      select: { cabinetId: true, bureauId: true, role: true },
    });
    targetCabinetId = target?.cabinetId ?? null;
    targetBureauId = target?.bureauId ?? null;
    targetRole = target?.role ?? null;
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: [UserRole.PROTOCOL, UserRole.CHEF, UserRole.ADMIN] },
    },
    select: { id: true, role: true, cabinetId: true, bureauId: true },
  });

  const protocolRecipients =
    targetRole === UserRole.CEMG
      ? users.filter((u) => {
          if (u.role !== UserRole.PROTOCOL) return false;
          if (targetCabinetId && u.cabinetId === targetCabinetId) return true;
          if (targetBureauId && u.bureauId === targetBureauId) return true;
          return false;
        })
      : [];

  const chefRecipients =
    targetRole === UserRole.CHEF
      ? users.filter((u) => {
          if (u.role !== UserRole.CHEF) return false;
          if (audience.visitTargetUserId && u.id === audience.visitTargetUserId) return true;
          if (targetCabinetId && u.cabinetId === targetCabinetId) return true;
          if (targetBureauId && u.bureauId === targetBureauId) return true;
          return false;
        })
      : [];

  const adminRecipients = users.filter((u) => u.role === UserRole.ADMIN);
  const recipients = [...adminRecipients, ...protocolRecipients, ...chefRecipients];
  const uniqueRecipients = [...new Map(recipients.map((u) => [u.id, u])).values()];

  if (!uniqueRecipients.length) return;

  await prisma.notification.createMany({
    data: uniqueRecipients.map((user) => ({
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
  fromCemg = false,
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
      title: fromCemg ? 'Audience transmise par le CEMG' : 'Audience transmise au Cabinet',
      message: fromCemg
        ? `${audience.reference} — ${audience.subject} — le CEMG vous confie cette audience`
        : `${audience.reference} — ${audience.subject}`,
      link: `/audiences/${audience.id}`,
    })),
  });
}

/** Alerte la salle d'attente qu'une audience est prête pour accompagnement direct. */
export async function notifyAudienceReadyForAccompaniment(
  prisma: PrismaClient,
  audience: AudienceNotify,
) {
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
      role: { in: [UserRole.SALLE_ATTENTE, UserRole.ADMIN] },
    },
    select: { id: true, role: true, cabinetId: true, bureauId: true },
  });

  const recipients = users.filter((u) => {
    if (u.role === UserRole.ADMIN) return true;
    if (targetCabinetId && u.cabinetId === targetCabinetId) return true;
    if (targetBureauId && u.bureauId === targetBureauId) return true;
    return false;
  });

  if (!recipients.length) return;

  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      userId: user.id,
      type: NotificationType.INFO,
      title: 'Accompagnement requis',
      message: `${audience.reference} — ${audience.requesterName} — validation Chef de Cabinet`,
      link: '/audiences',
    })),
  });
}
