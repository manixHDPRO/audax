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
      // Cas particulier : Le Protocol du CEMG doit voir les audiences du CEMG
      // même si le record du CEMG n'a pas encore son cabinetId de renseigné
      ...(role === UserRole.PROTOCOL || role === UserRole.CEMG || role === UserRole.CHEF 
        ? [{ visitTarget: { role: UserRole.CEMG } }] 
        : []),
    ],
  };

  // Logique spécifique pour le Chef de Cabinet
  if (role === UserRole.CHEF) {
    const filter: Prisma.AudienceWhereInput = {
      ...base,
      ...assignmentFilter,
      status: {
        in: [
          AudienceStatus.EN_ATTENTE,
          AudienceStatus.EN_ANALYSE,
          AudienceStatus.DEJA_ENVOYE,
          AudienceStatus.VALIDEE,
          AudienceStatus.PLANIFIEE,
          AudienceStatus.CONFIRMEE,
          AudienceStatus.TERMINEE,
          AudienceStatus.REJETEE,
        ],
      },
    };

    // Restriction supplémentaire pour le Chef de Cabinet : 
    // Il ne voit PAS les Priorité 0 transmises, SAUF s'il en est l'auteur, la cible directe,
    // ou si le CEMG a explicitement délégué la gestion via une transmission.
    return {
      ...filter,
      AND: [
        {
          OR: [
            { priority: { not: 'PRIORITE_0' } },
            { createdById: id },
            { visitTargetUserId: id },
            {
              validations: {
                some: {
                  validator: { role: UserRole.CEMG },
                  decision: 'EN_ATTENTE',
                  comment: 'Transmise au Dircab',
                },
              },
            },
          ],
        },
      ],
    };
  }

  // Logique spécifique pour le CEMG — accès après transmission Protocol (hors EN_ATTENTE)
  if (role === UserRole.CEMG) {
    return {
      ...base,
      ...assignmentFilter,
      status: {
        in: [
          AudienceStatus.EN_ANALYSE,
          AudienceStatus.DEJA_ENVOYE,
          AudienceStatus.VALIDEE,
          AudienceStatus.PLANIFIEE,
          AudienceStatus.CONFIRMEE,
          AudienceStatus.TERMINEE,
          AudienceStatus.REJETEE,
        ],
      },
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
