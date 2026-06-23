import { NotificationType, PrismaClient, UserRole } from '@prisma/client';
import { isSameOrgUnitAsVisitTarget } from './notification-concern';

type AudienceNotify = {
  id: string;
  reference: string;
  subject: string;
  requesterName: string;
  visitTargetUserId?: string | null;
  createdById?: string | null;
  priority?: string;
};

type SalleUserPick = {
  id: string;
  cabinetId: string | null;
  bureauId: string | null;
};

/** Même périmètre que l'accompagnement salle (cabinet/bureau, auteur, circuit CEMG). */
function pickSalleRecipients(
  users: SalleUserPick[],
  scope: VisitTargetScope,
  createdById?: string | null,
): SalleUserPick[] {
  const matched = users.filter(
    (user) =>
      (createdById != null && user.id === createdById) ||
      isSameOrgUnitAsVisitTarget(user, scope),
  );
  if (matched.length) return matched;

  // Circuit CEMG sans affectation explicite : toutes les salles actives (mono-cabinet).
  if (scope.role === UserRole.CEMG) return users;

  return matched;
}

export type AudienceCreatedNotifyResult = {
  recipientIds: string[];
  criticalRecipientIds: string[];
};

type VisitTargetScope = {
  cabinetId: string | null;
  bureauId: string | null;
  role: UserRole | null;
};

async function resolveVisitTargetScope(
  prisma: PrismaClient,
  visitTargetUserId?: string | null,
): Promise<VisitTargetScope> {
  if (!visitTargetUserId) {
    return { cabinetId: null, bureauId: null, role: null };
  }

  const target = await prisma.user.findUnique({
    where: { id: visitTargetUserId },
    select: { cabinetId: true, bureauId: true, role: true },
  });

  return {
    cabinetId: target?.cabinetId ?? null,
    bureauId: target?.bureauId ?? null,
    role: target?.role ?? null,
  };
}

export async function notifyAudienceCreated(
  prisma: PrismaClient,
  audience: AudienceNotify,
): Promise<AudienceCreatedNotifyResult> {
  const scope = await resolveVisitTargetScope(prisma, audience.visitTargetUserId);
  const isPriorite0 = audience.priority === 'PRIORITE_0';

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: [UserRole.PROTOCOL, UserRole.CHEF, UserRole.CEMG] },
    },
    select: { id: true, role: true, cabinetId: true, bureauId: true },
  });

  const protocolRecipients = users.filter(
    (user) => user.role === UserRole.PROTOCOL && scope.role === UserRole.CEMG,
  );

  const chefRecipients = users.filter((user) => {
    if (user.role !== UserRole.CHEF) return false;
    if (isPriorite0) return false;
    if (scope.role === UserRole.CEMG) return false;
    if (audience.visitTargetUserId && user.id === audience.visitTargetUserId) return true;
    return isSameOrgUnitAsVisitTarget(user, scope);
  });

  const cemgRecipients = isPriorite0
    ? users.filter((user) => user.role === UserRole.CEMG)
    : [];

  const standardRecipients = [...protocolRecipients, ...chefRecipients];
  const uniqueStandard = [...new Map(standardRecipients.map((u) => [u.id, u])).values()];
  const uniqueCemg = [...new Map(cemgRecipients.map((u) => [u.id, u])).values()];

  if (uniqueStandard.length) {
    await prisma.notification.createMany({
      data: uniqueStandard.map((user) => ({
        userId: user.id,
        type: NotificationType.INFO,
        title: 'Nouvelle demande d\'audience',
        message: `${audience.reference} — ${audience.subject} (${audience.requesterName})`,
        link: `/audiences/${audience.id}`,
      })),
    });
  }

  if (uniqueCemg.length) {
    await prisma.notification.createMany({
      data: uniqueCemg.map((user) => ({
        userId: user.id,
        type: NotificationType.CRITICAL,
        title: 'Audience Priorité 0',
        message: `${audience.reference} — ${audience.subject} (${audience.requesterName})`,
        link: `/audiences/${audience.id}`,
      })),
    });
  }

  const criticalRecipientIds = uniqueCemg.map((u) => u.id);
  const recipientIds = [
    ...new Set([...uniqueStandard.map((u) => u.id), ...criticalRecipientIds]),
  ];

  return { recipientIds, criticalRecipientIds };
}

/** Protocol a transmis une audience CEMG au Cabinet — alerte le CEMG (pas le Chef de Cabinet). */
export async function notifyCemgOnProtocolCabinetForward(
  prisma: PrismaClient,
  audience: AudienceNotify,
): Promise<string[]> {
  const scope = await resolveVisitTargetScope(prisma, audience.visitTargetUserId);
  if (scope.role !== UserRole.CEMG) return [];

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: UserRole.CEMG,
    },
    select: { id: true, cabinetId: true, bureauId: true },
  });

  const recipients = users.filter((user) => isSameOrgUnitAsVisitTarget(user, scope));
  if (!recipients.length) return [];

  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      userId: user.id,
      type: NotificationType.WARNING,
      title: 'Audience transmise au Cabinet',
      message: `${audience.reference} — ${audience.subject} (${audience.requesterName})`,
      link: `/audiences/${audience.id}`,
    })),
  });

  return recipients.map((u) => u.id);
}

export async function notifyAudienceForwardedToDircab(
  prisma: PrismaClient,
  audience: AudienceNotify,
  fromCemg = false,
): Promise<string[]> {
  if (audience.priority === 'PRIORITE_0') return [];

  const scope = await resolveVisitTargetScope(prisma, audience.visitTargetUserId);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: UserRole.CHEF,
    },
    select: { id: true, role: true, cabinetId: true, bureauId: true },
  });

  const recipients = users.filter((user) => {
    if (audience.visitTargetUserId && user.id === audience.visitTargetUserId) return true;
    return isSameOrgUnitAsVisitTarget(user, scope);
  });

  if (!recipients.length) return [];

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

  return recipients.map((u) => u.id);
}

/** Protocol a traité une audience CEMG — alerte la salle d'attente du même périmètre. */
export async function notifySalleOnProtocolCemgAction(
  prisma: PrismaClient,
  audience: AudienceNotify,
): Promise<string[]> {
  const scope = await resolveVisitTargetScope(prisma, audience.visitTargetUserId);
  if (scope.role !== UserRole.CEMG) return [];

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: UserRole.SALLE_ATTENTE,
    },
    select: { id: true, cabinetId: true, bureauId: true },
  });

  const recipients = pickSalleRecipients(users, scope, audience.createdById);
  if (!recipients.length) return [];

  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      userId: user.id,
      type: NotificationType.INFO,
      title: 'Protocol — audience CEMG traitée',
      message: `${audience.reference} — ${audience.subject}`,
      link: `/audiences/${audience.id}`,
    })),
  });

  return recipients.map((u) => u.id);
}

/** CEMG a validé une audience — alerte le Protocol pour confirmation / suivi. */
export async function notifyProtocolOnCemgValidation(
  prisma: PrismaClient,
  audience: AudienceNotify,
): Promise<string[]> {
  const scope = await resolveVisitTargetScope(prisma, audience.visitTargetUserId);
  if (scope.role !== UserRole.CEMG) return [];

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: UserRole.PROTOCOL,
    },
    select: { id: true, cabinetId: true, bureauId: true },
  });

  const recipients = users.filter((user) => isSameOrgUnitAsVisitTarget(user, scope));
  if (!recipients.length) return [];

  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      userId: user.id,
      type: NotificationType.SUCCESS,
      title: 'CEMG — audience validée',
      message: `${audience.reference} — ${audience.subject} (${audience.requesterName})`,
      link: `/audiences/${audience.id}`,
    })),
  });

  return recipients.map((u) => u.id);
}

/** Protocol a confirmé le suivi — alerte la salle d'attente pour accompagnement. */
export async function notifySalleOnProtocolFollowUp(
  prisma: PrismaClient,
  audience: AudienceNotify,
): Promise<string[]> {
  const scope = await resolveVisitTargetScope(prisma, audience.visitTargetUserId);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: UserRole.SALLE_ATTENTE,
    },
    select: { id: true, cabinetId: true, bureauId: true },
  });

  const recipients = pickSalleRecipients(users, scope, audience.createdById);
  if (!recipients.length) return [];

  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      userId: user.id,
      type: NotificationType.WARNING,
      title: 'Protocol — accompagnement requis',
      message: `${audience.reference} — ${audience.requesterName} — audience confirmée, prête pour accompagnement`,
      link: `/audiences/${audience.id}`,
    })),
  });

  return recipients.map((u) => u.id);
}

/** Alerte la salle d'attente qu'une audience est prête pour accompagnement direct. */
export async function notifyAudienceReadyForAccompaniment(
  prisma: PrismaClient,
  audience: AudienceNotify,
): Promise<string[]> {
  const scope = await resolveVisitTargetScope(prisma, audience.visitTargetUserId);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: UserRole.SALLE_ATTENTE,
    },
    select: { id: true, role: true, cabinetId: true, bureauId: true },
  });

  const recipients = pickSalleRecipients(users, scope, audience.createdById);
  if (!recipients.length) return [];

  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      userId: user.id,
      type: NotificationType.INFO,
      title: 'Accompagnement requis',
      message: `${audience.reference} — ${audience.requesterName} — validation Chef de Cabinet`,
      link: `/audiences/${audience.id}`,
    })),
  });

  return recipients.map((u) => u.id);
}
