import { AudienceStatus, Prisma, PrismaClient, UserRole } from '@prisma/client';

/** Dossier confié au DirCab par le CEMG. */
export function isDelegatedToDircab(audience: {
  status?: string;
  statusHistory?: { toStatus?: string; comment?: string | null }[];
  validations?: { decision?: string; comment?: string | null }[];
}): boolean {
  if (audience.status === AudienceStatus.TRANSMIS_DIRCAB) return true;

  const fromValidations =
    audience.validations?.some(
      (v) => v.decision === 'EN_ATTENTE' && v.comment === 'Transmise au Dircab',
    ) ?? false;
  if (fromValidations) return true;

  return (
    audience.statusHistory?.some(
      (entry) =>
        entry.toStatus === AudienceStatus.TRANSMIS_DIRCAB ||
        (entry.toStatus === AudienceStatus.DEJA_ENVOYE &&
          entry.comment === 'Transmise au Dircab'),
    ) ?? false
  );
}

export async function resolveChefDeCabinetUser(
  prisma: PrismaClient,
  context: { cabinetId?: string | null },
) {
  const base: Prisma.UserWhereInput = { role: UserRole.CHEF, isActive: true };
  if (context.cabinetId) {
    const inCabinet = await prisma.user.findFirst({
      where: { ...base, cabinetId: context.cabinetId },
      select: { id: true, firstName: true, lastName: true, cabinetId: true },
    });
    if (inCabinet) return inCabinet;
  }
  return prisma.user.findFirst({
    where: base,
    select: { id: true, firstName: true, lastName: true, cabinetId: true },
  });
}
