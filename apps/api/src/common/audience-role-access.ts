import { AudienceStatus, Prisma, UserRole } from '@prisma/client';
import { priorite0ExcludeWhere } from './priorite0-access';

export interface UserContext {
  id: string;
  role: UserRole | string;
  cabinetId?: string | null;
  bureauId?: string | null;
}

/** Filtre liste audiences selon l'affectation (Cabinet/Bureau) et le rôle. */
export function audienceListWhereForRole(user: UserContext): Prisma.AudienceWhereInput {
  const { id, role, cabinetId, bureauId } = user;
  const base = priorite0ExcludeWhere(role);

  // Les admins voient tout (avec le filtre P0 de base)
  if (role === UserRole.ADMIN) {
    return base;
  }

  // Filtre par affectation
  const assignmentFilter: Prisma.AudienceWhereInput = {
    OR: [
      // Audiences créées par l'utilisateur
      { createdById: id },
      // Audiences dont l'utilisateur est la cible directe
      { visitTargetUserId: id },
      // Audiences dont la cible est dans le même cabinet
      ...(cabinetId ? [{ visitTarget: { cabinetId } }] : []),
      // Audiences dont la cible est dans le même bureau
      ...(bureauId ? [{ visitTarget: { bureauId } }] : []),
      // CEMG / Chef : audiences dont la personne à voir est le CEMG
      ...(role === UserRole.CEMG || role === UserRole.CHEF
        ? [{ visitTarget: { role: UserRole.CEMG } }]
        : []),
      ...(role === UserRole.CEMG
        ? [
            { status: AudienceStatus.TRANSMIS_DIRCAB },
            {
              validations: {
                some: {
                  comment: 'Transmise au Dircab',
                  validator: { role: UserRole.CEMG },
                },
              },
            },
          ]
        : []),
    ],
  };

  // Protocol CEMG : uniquement les audiences dont la personne à voir est le CEMG
  if (role === UserRole.PROTOCOL) {
    return {
      ...base,
      visitTarget: { role: UserRole.CEMG },
    };
  }

  // Logique spécifique pour le Chef de Cabinet — Priorité 0 exclue (réservée CEMG / Protocol).
  if (role === UserRole.CHEF) {
    return {
      ...base,
      AND: [
        assignmentFilter,
        {
          OR: [
            {
              status: {
                in: [
                  AudienceStatus.DEJA_ENVOYE,
                  AudienceStatus.TRANSMIS_DIRCAB,
                  AudienceStatus.EN_ANALYSE,
                  AudienceStatus.VALIDEE,
                  AudienceStatus.PLANIFIEE,
                  AudienceStatus.CONFIRMEE,
                  AudienceStatus.TERMINEE,
                  AudienceStatus.REJETEE,
                ],
              },
            },
            {
              status: AudienceStatus.EN_ATTENTE,
              visitTarget: { role: { not: UserRole.CEMG } },
            },
          ],
        },
      ],
    };
  }

  // CEMG : circuit CEMG uniquement (pas les audiences directes Chef de Cabinet).
  if (role === UserRole.CEMG) {
    return {
      ...base,
      AND: [
        {
          OR: [
            { visitTarget: { role: UserRole.CEMG } },
            { status: AudienceStatus.TRANSMIS_DIRCAB },
            {
              statusHistory: {
                some: {
                  OR: [
                    { toStatus: AudienceStatus.TRANSMIS_DIRCAB },
                    { comment: { startsWith: 'Transmise au Dircab' } },
                  ],
                },
              },
            },
          ],
        },
        {
          status: {
            in: [
              AudienceStatus.DEJA_ENVOYE,
              AudienceStatus.TRANSMIS_DIRCAB,
              AudienceStatus.EN_ANALYSE,
              AudienceStatus.VALIDEE,
              AudienceStatus.PLANIFIEE,
              AudienceStatus.CONFIRMEE,
              AudienceStatus.TERMINEE,
              AudienceStatus.REJETEE,
            ],
          },
        },
      ],
    };
  }

  // Pour la Salle d'Attente : On cache les audiences terminées
  if (role === UserRole.SALLE_ATTENTE) {
    return {
      ...base,
      ...assignmentFilter,
      status: { not: AudienceStatus.TERMINEE },
    };
  }

  return {
    ...base,
    ...assignmentFilter,
  };
}

/**
 * Filtre dédié à l'accompagnement (salle d'attente).
 * Une audience CONFIRMEE par le Protocol doit être visible même en Priorité 0.
 */
export function accompanimentPendingWhereForRole(user: UserContext): Prisma.AudienceWhereInput {
  const { id, role, cabinetId, bureauId } = user;

  if (role === UserRole.ADMIN) {
    return {};
  }

  if (role === UserRole.SALLE_ATTENTE) {
    const orConditions: Prisma.AudienceWhereInput[] = [
      { visitTarget: { role: UserRole.CEMG } },
      { visitTarget: { role: UserRole.CHEF } },
      { createdById: id },
    ];
    if (cabinetId) {
      orConditions.unshift({ visitTarget: { cabinetId } });
    }
    if (bureauId) {
      orConditions.push({ visitTarget: { bureauId } });
    }
    return { OR: orConditions };
  }

  return audienceListWhereForRole(user);
}

export function shouldNotifyOnAudienceCreate(role: UserRole): boolean {
  return role === UserRole.PROTOCOL || role === UserRole.ADMIN;
}

export function shouldNotifyOnDircabForward(role: UserRole): boolean {
  return role === UserRole.CHEF || role === UserRole.ADMIN;
}
