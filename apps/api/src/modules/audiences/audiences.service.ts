import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AudienceStatus, Priority, Prisma, UserRole, ValidationDecision } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAudienceDto, UpdateAudienceDto, ValidateAudienceDto } from './dto/audience.dto';
import { getAudienceDatePrefix, nextAudienceReference } from '../../common/audience-reference';
import {
  assertCanViewAudience,
  canViewPriorite0Audiences,
} from '../../common/priorite0-access';
import { audienceListWhereForRole, accompanimentPendingWhereForRole, UserContext } from '../../common/audience-role-access';
import { resolveChefDeCabinetUser } from '../../common/audience-delegation';
import {
  isCemgRelatedAudience,
  isProtocolCemgConfirmQueue,
  isSalleReceptionAudience,
  wasValidatedByChefForAccompaniment,
} from '../../common/audience-cemg-access';
import {
  notifyAudienceCreated,
  notifyAudienceForwardedToDircab,
  notifyAudienceReadyForAccompaniment,
  notifyCemgOnProtocolCabinetForward,
  notifyProtocolOnCemgValidation,
  notifySalleOnProtocolFollowUp,
  notifySalleOnProtocolCemgAction,
} from '../../common/audience-notifications';
import {
  NotificationStreamService,
  NotificationSoundType,
} from '../notifications/notification-stream.service';

const visitTargetListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
  cabinetId: true,
  bureauId: true,
  cabinet: { select: { id: true, name: true } },
  bureau: { select: { id: true, name: true } },
} as const;

function adminOrgUnitFilter(
  user: UserContext,
  cabinetId?: string,
  bureauId?: string,
): Prisma.AudienceWhereInput {
  if (user.role !== UserRole.ADMIN) return {};
  const visitTarget: Prisma.UserWhereInput = {};
  if (cabinetId) visitTarget.cabinetId = cabinetId;
  if (bureauId) visitTarget.bureauId = bureauId;
  if (Object.keys(visitTarget).length === 0) return {};
  return { visitTarget };
}

@Injectable()
export class AudiencesService {
  constructor(
    private prisma: PrismaService,
    private notificationStream: NotificationStreamService,
  ) {}

  private pushLiveAlerts(
    recipientIds: string[],
    payload: {
      type: NotificationSoundType;
      title: string;
      message?: string;
      audienceId?: string;
    },
  ) {
    if (!recipientIds.length) return;
    this.notificationStream.pushMany(recipientIds, payload);
  }

  private getTodayBounds() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  /** Liste réduite pour la salle d'attente : ses enregistrements du jour, sans statut ni suivi. */
  async findMyTodayForWaitingRoom(userId: string) {
    const { start, end } = this.getTodayBounds();
    const rows = await this.prisma.audience.findMany({
      where: {
        createdById: userId,
        createdAt: { gte: start, lt: end },
        status: { not: AudienceStatus.TERMINEE },
      },
      select: {
        id: true,
        reference: true,
        subject: true,
        requesterName: true,
        category: true,
        priority: true,
        createdAt: true,
        visitors: {
          where: { isPrimary: true },
          take: 1,
          select: {
            visitor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                function: true,
                badgeCode: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => {
      const primary = row.visitors[0]?.visitor;
      return {
        id: row.id,
        reference: row.reference,
        subject: row.subject,
        requesterName: row.requesterName,
        category: row.category,
        priority: row.priority,
        createdAt: row.createdAt,
        visitor: primary
          ? {
              id: primary.id,
              firstName: primary.firstName,
              lastName: primary.lastName,
              function: primary.function,
              badgeCode: primary.badgeCode,
            }
          : null,
      };
    });
  }

  async findVisitTargets(user: UserContext) {
    const { role, cabinetId, bureauId } = user;

    const where: any = { isActive: true };

    // Les admins et la salle d'attente voient tout le monde
    if (role !== UserRole.ADMIN && role !== UserRole.SALLE_ATTENTE) {
      where.OR = [
        ...(cabinetId ? [{ cabinetId }] : []),
        ...(bureauId ? [{ bureauId }] : []),
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  private static readonly ACTIVE_DUPLICATE_STATUSES: AudienceStatus[] = [
    AudienceStatus.EN_ATTENTE,
    AudienceStatus.EN_ANALYSE,
    AudienceStatus.VALIDEE,
    AudienceStatus.PLANIFIEE,
    AudienceStatus.DEJA_ENVOYE,
    AudienceStatus.TRANSMIS_DIRCAB,
  ];

  async searchRequestersFromAudiences(search: string) {
    const term = search.trim();
    if (term.length < 2) {
      return { requesters: [] };
    }

    const audiences = await this.prisma.audience.findMany({
      where: { requesterName: { contains: term, mode: 'insensitive' } },
      select: {
        requesterName: true,
        requesterOrg: true,
        category: true,
        motive: true,
        createdAt: true,
        reference: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const seen = new Set<string>();
    const requesters: {
      requesterName: string;
      requesterOrg: string | null;
      category: string;
      motive: string;
      lastAudienceAt: Date;
      lastReference: string;
    }[] = [];

    for (const row of audiences) {
      const key = row.requesterName.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      requesters.push({
        requesterName: row.requesterName,
        requesterOrg: row.requesterOrg,
        category: row.category,
        motive: row.motive,
        lastAudienceAt: row.createdAt,
        lastReference: row.reference,
      });
      if (requesters.length >= 8) break;
    }

    return { requesters };
  }

  async findDuplicateToday(requesterName: string) {
    const name = requesterName.trim();
    if (!name) {
      return { hasDuplicate: false, audiences: [] };
    }

    const { start, end } = this.getTodayBounds();
    const audiences = await this.prisma.audience.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        status: { in: AudiencesService.ACTIVE_DUPLICATE_STATUSES },
        OR: [{ requesterName: { equals: name, mode: 'insensitive' } }],
      },
      select: {
        id: true,
        reference: true,
        subject: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      hasDuplicate: audiences.length > 0,
      audiences,
    };
  }

  async findAll(filters: {
    status?: string;
    priority?: string;
    search?: string;
    cabinetId?: string;
    bureauId?: string;
    user: { id: string; role: UserRole; cabinetId?: string | null; bureauId?: string | null };
  }) {
    if (filters.priority === 'PRIORITE_0' && !canViewPriorite0Audiences(filters.user.role)) {
      return [];
    }

    return this.prisma.audience.findMany({
      where: {
        ...audienceListWhereForRole(filters.user),
        ...adminOrgUnitFilter(filters.user, filters.cabinetId, filters.bureauId),
        ...(filters.status && { status: filters.status as AudienceStatus }),
        ...(filters.priority && { priority: filters.priority as never }),
        ...(filters.search && {
          OR: [
            { reference: { contains: filters.search, mode: 'insensitive' } },
            { subject: { contains: filters.search, mode: 'insensitive' } },
            { requesterName: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        visitors: { include: { visitor: true } },
        room: true,
        createdBy: { select: { firstName: true, lastName: true } },
        visitTarget: { select: visitTargetListSelect },
        validations: { include: { validator: { select: { firstName: true, lastName: true, role: true } } } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            comment: true,
            changedBy: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, user: UserContext) {
    const audience = await this.prisma.audience.findUnique({
      where: { id },
      include: {
        visitors: { include: { visitor: true } },
        room: true,
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        visitTarget: { select: { id: true, firstName: true, lastName: true, role: true, cabinetId: true, bureauId: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        validations: { include: { validator: { select: { firstName: true, lastName: true } } } },
        appointment: true,
      },
    });
    if (!audience) throw new NotFoundException('Audience introuvable');
    assertCanViewAudience(audience, user);

    const changerIds = [...new Set(audience.statusHistory.map((h) => h.changedBy))];
    const changers =
      changerIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: changerIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const changerMap = new Map(changers.map((u) => [u.id, u]));

    return {
      ...audience,
      statusHistory: audience.statusHistory.map((entry) => ({
        ...entry,
        changedByUser: changerMap.get(entry.changedBy) ?? null,
      })),
    };
  }

  async create(dto: CreateAudienceDto, userId: string) {
    const visitTarget = await this.prisma.user.findFirst({
      where: { id: dto.visitTargetUserId, isActive: true },
      select: { id: true },
    });
    if (!visitTarget) {
      throw new BadRequestException('Personne à voir introuvable ou inactive');
    }

    const duplicateToday = await this.findDuplicateToday(dto.requesterName);
    if (duplicateToday.hasDuplicate && !dto.allowDuplicateToday) {
      const refs = duplicateToday.audiences.map((a) => a.reference).join(', ');
      throw new BadRequestException(
        `Une demande active existe déjà aujourd'hui pour ce visiteur (${refs}). Confirmez pour créer une nouvelle demande.`,
      );
    }

    const datePrefix = getAudienceDatePrefix();
    const todayAudiences = await this.prisma.audience.findMany({
      where: { reference: { startsWith: `AUD-${datePrefix}-` } },
      select: { reference: true },
    });
    const reference = nextAudienceReference(todayAudiences.map((a) => a.reference));

    const audience = await this.prisma.audience.create({
      data: {
        reference,
        subject: dto.subject,
        motive: dto.motive,
        requesterName: dto.requesterName,
        requesterOrg: dto.requesterOrg,
        priority: dto.priority,
        confidentiality: dto.confidentiality,
        category: dto.category,
        createdById: userId,
        visitTargetUserId: dto.visitTargetUserId,
        statusHistory: {
          create: { toStatus: 'EN_ATTENTE', changedBy: userId, comment: 'Demande créée' },
        },
      },
      include: { visitors: { include: { visitor: true } } },
    });

    if (dto.visitorId) {
      await this.linkVisitorToAudience(audience.id, dto);
    }

    const audienceWithVisitors = await this.prisma.audience.findUnique({
      where: { id: audience.id },
      include: { visitors: { include: { visitor: true } } },
    });

    const { recipientIds, criticalRecipientIds } = await notifyAudienceCreated(this.prisma, {
      id: audience.id,
      reference,
      subject: dto.subject,
      requesterName: dto.requesterName,
      visitTargetUserId: dto.visitTargetUserId,
      priority: dto.priority,
    });

    const infoRecipientIds = recipientIds.filter((id) => !criticalRecipientIds.includes(id));
    this.pushLiveAlerts(infoRecipientIds, {
      type: 'INFO',
      title: 'Nouvelle demande d\'audience',
      message: `${reference} — ${dto.subject}`,
      audienceId: audience.id,
    });
    this.pushLiveAlerts(criticalRecipientIds, {
      type: 'CRITICAL',
      title: 'Audience Priorité 0',
      message: `${reference} — ${dto.subject}`,
      audienceId: audience.id,
    });

    return audienceWithVisitors ?? audience;
  }

  private async linkVisitorToAudience(audienceId: string, dto: CreateAudienceDto) {
    const visitorId = dto.visitorId;
    if (!visitorId) return;

    const existing = await this.prisma.visitor.findUnique({ where: { id: visitorId } });
    if (!existing) {
      throw new BadRequestException('Visiteur introuvable');
    }

    const visitorFunction = dto.requesterOrg?.trim();
    if (visitorFunction) {
      await this.prisma.visitor.update({
        where: { id: visitorId },
        data: { function: visitorFunction },
      });
    }

    await this.prisma.audienceVisitor.create({
      data: {
        audienceId,
        visitorId,
        isPrimary: true,
      },
    });
  }

  async update(id: string, dto: UpdateAudienceDto, user: UserContext) {
    const current = await this.findOne(id, user);
    const audience = await this.prisma.audience.update({
      where: { id },
      data: dto,
    });

    if (dto.status && dto.status !== current.status) {
      await this.prisma.audienceStatusHistory.create({
        data: {
          audienceId: id,
          fromStatus: current.status,
          toStatus: dto.status,
          changedBy: user.id,
        },
      });
    }

    return audience;
  }

  async forwardToDircab(id: string, user: UserContext) {
    const audience = await this.findOne(id, user);

    // On permet au CEMG de transmettre même si c'est déjà "DEJA_ENVOYE" (pour déléguer une P0)
    const canForward = 
      audience.status === AudienceStatus.EN_ATTENTE || 
      audience.status === AudienceStatus.EN_ANALYSE ||
      (user.role === UserRole.CEMG && audience.status === AudienceStatus.DEJA_ENVOYE);

    if (!canForward) {
      throw new BadRequestException('Cette audience ne peut pas être envoyée au Dircab dans son état actuel');
    }

    if (user.role === UserRole.PROTOCOL && !isCemgRelatedAudience(audience)) {
      throw new BadRequestException(
        'Le Protocol CEMG ne traite que les audiences dont la personne à voir est le CEMG',
      );
    }

    const isCemgDelegation = user.role === UserRole.CEMG;
    const newStatus = isCemgDelegation
      ? AudienceStatus.TRANSMIS_DIRCAB
      : AudienceStatus.DEJA_ENVOYE;

    let historyComment = isCemgDelegation ? 'Transmise au Dircab' : 'Transmise au Cabinet';
    const updateData: Prisma.AudienceUpdateInput = { status: newStatus };

    if (isCemgDelegation) {
      const chef = await resolveChefDeCabinetUser(this.prisma, {
        cabinetId: user.cabinetId ?? audience.visitTarget?.cabinetId,
      });
      if (!chef) {
        throw new BadRequestException(
          'Chef de Cabinet introuvable — impossible de confier l\'audience',
        );
      }

      const previousLabel = audience.visitTarget
        ? `${audience.visitTarget.firstName} ${audience.visitTarget.lastName}`
        : 'CEMG';

      updateData.visitTarget = { connect: { id: chef.id } };
      historyComment =
        `Transmise au Dircab — audience confiée au Chef de Cabinet ` +
        `(${chef.firstName} ${chef.lastName}), initialement ${previousLabel}`;
    }

    await this.prisma.validation.create({
      data: {
        audienceId: id,
        validatorId: user.id,
        level: 1,
        decision: ValidationDecision.EN_ATTENTE,
        comment: isCemgDelegation ? 'Transmise au Dircab' : 'Transmise au Cabinet',
        decidedAt: new Date(),
      },
    });

    const updated = await this.prisma.audience.update({
      where: { id },
      data: updateData,
      include: {
        visitTarget: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    await this.prisma.audienceStatusHistory.create({
      data: {
        audienceId: id,
        fromStatus: audience.status,
        toStatus: newStatus,
        changedBy: user.id,
        comment: historyComment,
      },
    });

    if (isCemgDelegation) {
      const chefRecipients = await notifyAudienceForwardedToDircab(this.prisma, updated, true);
      this.pushLiveAlerts(chefRecipients, {
        type: 'WARNING',
        title: 'Audience transmise par le CEMG',
        message: `${updated.reference} — ${updated.subject}`,
        audienceId: id,
      });
    } else {
      const cemgRecipients = await notifyCemgOnProtocolCabinetForward(this.prisma, {
        id: updated.id,
        reference: updated.reference,
        subject: updated.subject,
        requesterName: audience.requesterName,
        visitTargetUserId: audience.visitTargetUserId,
      });
      this.pushLiveAlerts(cemgRecipients, {
        type: 'WARNING',
        title: 'Audience transmise au Cabinet',
        message: `${updated.reference} — ${updated.subject}`,
        audienceId: id,
      });
    }

    if (user.role === UserRole.PROTOCOL && isCemgRelatedAudience(audience)) {
      const salleRecipients = await notifySalleOnProtocolCemgAction(this.prisma, {
        id: updated.id,
        reference: updated.reference,
        subject: updated.subject,
        requesterName: audience.requesterName,
        visitTargetUserId: audience.visitTargetUserId,
      });
      this.pushLiveAlerts(salleRecipients, {
        type: 'INFO',
        title: 'Protocol — audience CEMG traitée',
        audienceId: id,
      });
    }

    return updated;
  }

  async validate(id: string, dto: ValidateAudienceDto, user: UserContext) {
    const audience = await this.findOne(id, user);

    // Si l'audience est déjà envoyée au Dircab, seuls le CEMG, le Dircab (CHEF) et l'Admin peuvent décider
    if (
      (audience.status === AudienceStatus.DEJA_ENVOYE ||
        audience.status === AudienceStatus.TRANSMIS_DIRCAB) &&
        user.role !== UserRole.CEMG &&
        user.role !== UserRole.CHEF &&
        user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Audience déjà envoyée au Dircab — accès restreint');
    }

    if (audience.status === AudienceStatus.VALIDEE || audience.status === AudienceStatus.PLANIFIEE) {
      throw new BadRequestException('Audience validée — seule la reprogrammation est autorisée');
    }

    const validation = await this.prisma.validation.create({
      data: {
        audienceId: id,
        validatorId: user.id,
        level: dto.level ?? 1,
        decision: dto.decision,
        comment: dto.comment,
        decidedAt: new Date(),
      },
    });

    const chefDirectAccompaniment =
      user.role === UserRole.CHEF && dto.decision === ValidationDecision.APPROUVE;

    const newStatus =
      dto.decision === ValidationDecision.APPROUVE
        ? chefDirectAccompaniment
          ? AudienceStatus.CONFIRMEE
          : AudienceStatus.VALIDEE
        : dto.decision === ValidationDecision.REJETE
          ? AudienceStatus.REJETEE
          : AudienceStatus.EN_ANALYSE;

    const historyComment = chefDirectAccompaniment
      ? 'Audience validée par le Chef de Cabinet — prête pour accompagnement'
      : dto.comment;

    await this.prisma.audience.update({
      where: { id },
      data: { status: newStatus },
    });

    await this.prisma.audienceStatusHistory.create({
      data: {
        audienceId: id,
        fromStatus: audience.status,
        toStatus: newStatus,
        changedBy: user.id,
        comment: historyComment,
      },
    });

    if (chefDirectAccompaniment) {
      const salleRecipients = await notifyAudienceReadyForAccompaniment(this.prisma, audience);
      this.pushLiveAlerts(salleRecipients, {
        type: 'INFO',
        title: 'Accompagnement requis',
        audienceId: id,
      });
    } else if (
      user.role === UserRole.CEMG &&
      dto.decision === ValidationDecision.APPROUVE &&
      newStatus === AudienceStatus.VALIDEE &&
      isCemgRelatedAudience(audience)
    ) {
      const protocolRecipients = await notifyProtocolOnCemgValidation(this.prisma, {
        id: audience.id,
        reference: audience.reference,
        subject: audience.subject,
        requesterName: audience.requesterName,
        visitTargetUserId: audience.visitTargetUserId,
      });
      this.pushLiveAlerts(protocolRecipients, {
        type: 'SUCCESS',
        title: 'CEMG — audience validée',
        message: `${audience.reference} — ${audience.subject}`,
        audienceId: id,
      });
    }

    return validation;
  }

  async closeAudience(
    id: string,
    user: UserContext,
    dto?: { comment?: string },
  ) {
    const audience = await this.findOne(id, user);

    if (
      user.role !== UserRole.CHEF &&
      user.role !== UserRole.PROTOCOL &&
      user.role !== UserRole.CEMG &&
      user.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException('Accès refusé pour clôturer cette audience');
    }

    const transmitted = await this.prisma.audienceStatusHistory.findFirst({
      where: {
        audienceId: id,
        OR: [
          {
            toStatus: AudienceStatus.DEJA_ENVOYE,
            comment: { in: ['Transmise au Cabinet', 'Transmise au Dircab'] },
          },
          { toStatus: AudienceStatus.TRANSMIS_DIRCAB },
        ],
      },
    });
    if (!transmitted) {
      throw new BadRequestException(
        'Seules les audiences transmises au Chef de Cabinet peuvent être clôturées',
      );
    }

    if (
      audience.status !== AudienceStatus.DEJA_ENVOYE &&
      audience.status !== AudienceStatus.TRANSMIS_DIRCAB &&
      audience.status !== AudienceStatus.EN_ANALYSE
    ) {
      throw new BadRequestException('Cette audience ne peut pas être clôturée dans son état actuel');
    }

    const comment =
      dto?.comment?.trim() || 'Audience clôturée par le Cabinet — traitement terminé';

    const updated = await this.prisma.audience.update({
      where: { id },
      data: { status: AudienceStatus.TERMINEE },
    });

    await this.prisma.audienceStatusHistory.create({
      data: {
        audienceId: id,
        fromStatus: audience.status,
        toStatus: AudienceStatus.TERMINEE,
        changedBy: user.id,
        comment,
      },
    });

    return updated;
  }

  async confirmAudience(id: string, userId: string, role: UserRole) {
    const audience = await this.prisma.audience.findUnique({
      where: { id },
      include: {
        visitTarget: { select: { cabinetId: true, bureauId: true, role: true } },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 15 },
      },
    });
    if (!audience) throw new NotFoundException('Audience introuvable');

    // Seul le Protocol ou l'Admin peut confirmer
    if (role !== UserRole.PROTOCOL && role !== UserRole.ADMIN) {
      throw new BadRequestException('Seul le Protocol peut confirmer cette audience');
    }

    if (!isProtocolCemgConfirmQueue(audience)) {
      throw new BadRequestException(
        'Seules les audiences validées par le CEMG relèvent du suivi Protocol',
      );
    }

    const updated = await this.prisma.audience.update({
      where: { id },
      data: { status: AudienceStatus.CONFIRMEE },
    });

    await this.prisma.audienceStatusHistory.create({
      data: {
        audienceId: id,
        fromStatus: audience.status,
        toStatus: AudienceStatus.CONFIRMEE,
        changedBy: userId,
        comment: 'Audience confirmée par le Protocol — Prête pour accompagnement',
      },
    });

    const salleRecipients = await notifySalleOnProtocolFollowUp(this.prisma, {
      id: audience.id,
      reference: audience.reference,
      subject: audience.subject,
      requesterName: audience.requesterName,
      visitTargetUserId: audience.visitTargetUserId,
      createdById: audience.createdById,
    });
    this.pushLiveAlerts(salleRecipients, {
      type: 'WARNING',
      title: 'Protocol — accompagnement requis',
      message: `${audience.reference} — ${audience.requesterName}`,
      audienceId: id,
    });

    return updated;
  }

  async findAccompanimentPending(user: UserContext) {
    const scope = accompanimentPendingWhereForRole(user);
    const rows = await this.prisma.audience.findMany({
      where: {
        ...scope,
        status: { in: [AudienceStatus.CONFIRMEE] },
        NOT: {
          statusHistory: {
            some: { comment: { startsWith: 'Accompagné au bureau' } },
          },
        },
      },
      select: {
        id: true,
        reference: true,
        subject: true,
        requesterName: true,
        requesterOrg: true,
        status: true,
        priority: true,
        category: true,
        scheduledAt: true,
        createdAt: true,
        visitTarget: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        room: { select: { id: true, name: true, floor: true } },
        statusHistory: {
          where: {
            toStatus: {
              in: [AudienceStatus.VALIDEE, AudienceStatus.PLANIFIEE, AudienceStatus.CONFIRMEE],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, toStatus: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      subject: row.subject,
      requesterName: row.requesterName,
      requesterOrg: row.requesterOrg,
      status: row.status,
      priority: row.priority,
      category: row.category,
      scheduledAt: row.scheduledAt,
      createdAt: row.createdAt,
      validatedAt: row.statusHistory[0]?.createdAt ?? row.createdAt,
      visitTarget: row.visitTarget,
      room: row.room,
    }));
  }

  async completeAccompaniment(
    id: string,
    userId: string,
    dto?: { comment?: string },
  ) {
    const audience = await this.prisma.audience.findUnique({
      where: { id },
      include: {
        visitTarget: { select: { firstName: true, lastName: true } },
        room: { select: { name: true, floor: true } },
      },
    });
    if (!audience) throw new NotFoundException('Audience introuvable');

    if (audience.status !== AudienceStatus.CONFIRMEE) {
      throw new BadRequestException(
        'Seules les audiences confirmées peuvent être accompagnées',
      );
    }

    const alreadyAccompanied = await this.prisma.audienceStatusHistory.findFirst({
      where: {
        audienceId: id,
        comment: { startsWith: 'Accompagné au bureau' },
      },
    });
    if (alreadyAccompanied) {
      throw new BadRequestException('Cette audience a déjà été accompagnée au bureau');
    }

    const visitTargetName = audience.visitTarget
      ? `${audience.visitTarget.firstName} ${audience.visitTarget.lastName}`
      : 'le bureau concerné';
    const roomLabel = audience.room
      ? `${audience.room.name}${audience.room.floor ? ` (${audience.room.floor})` : ''}`
      : undefined;
    const destination = roomLabel
      ? `${visitTargetName} — ${roomLabel}`
      : visitTargetName;
    const comment =
      dto?.comment?.trim() || `Accompagné au bureau de ${destination}`;

    await this.prisma.audienceStatusHistory.create({
      data: {
        audienceId: id,
        fromStatus: audience.status,
        toStatus: audience.status,
        changedBy: userId,
        comment,
      },
    });

    return { success: true, comment };
  }

  async findReceptionsPending(user: UserContext) {
    const scope =
      user.role === UserRole.SALLE_ATTENTE
        ? accompanimentPendingWhereForRole(user)
        : audienceListWhereForRole(user);

    const where: Prisma.AudienceWhereInput = {
      ...scope,
      status: { in: [AudienceStatus.CONFIRMEE] },
    };

    if (user.role === UserRole.SALLE_ATTENTE) {
      where.statusHistory = {
        some: { comment: { startsWith: 'Accompagné au bureau' } },
      };
    } else if (user.role === UserRole.PROTOCOL || user.role === UserRole.ADMIN) {
      where.visitTarget = { role: UserRole.CEMG };
      where.statusHistory = {
        some: { comment: { startsWith: 'Accompagné au bureau' } },
      };
    }

    const rows = await this.prisma.audience.findMany({
      where,
      select: {
        id: true,
        reference: true,
        subject: true,
        requesterName: true,
        status: true,
        priority: true,
        scheduledAt: true,
        createdAt: true,
        visitTarget: { select: { firstName: true, lastName: true, role: true } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: { comment: true },
        },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    });

    if (user.role === UserRole.SALLE_ATTENTE) {
      return rows.filter((row) => isSalleReceptionAudience(row));
    }

    return rows;
  }

  async completeReception(
    id: string,
    userId: string,
    role: UserRole,
    dto?: { comment?: string },
  ) {
    const audience = await this.prisma.audience.findUnique({
      where: { id },
      include: {
        visitTarget: { select: { firstName: true, lastName: true, role: true } },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 15 },
      },
    });
    if (!audience) throw new NotFoundException('Audience introuvable');

    const accompanied = await this.prisma.audienceStatusHistory.findFirst({
      where: {
        audienceId: id,
        comment: { startsWith: 'Accompagné au bureau' },
      },
    });
    if (!accompanied) {
      throw new BadRequestException(
        'Accompagnez d\'abord le visiteur au bureau avant de confirmer la réception',
      );
    }

    if (role === UserRole.SALLE_ATTENTE) {
      if (!isSalleReceptionAudience(audience)) {
        throw new BadRequestException(
          'La réception des audiences CEMG (circuit Protocol) est réservée au Protocol',
        );
      }
    } else if (role === UserRole.PROTOCOL || role === UserRole.ADMIN) {
      if (!isCemgRelatedAudience(audience)) {
        throw new BadRequestException(
          'La réception hors circuit CEMG est réservée à la salle d\'attente',
        );
      }
      if (wasValidatedByChefForAccompaniment(audience)) {
        throw new BadRequestException(
          'Cette audience relève de la salle d\'attente pour la confirmation de réception',
        );
      }
    } else {
      throw new BadRequestException('Accès refusé pour confirmer la réception');
    }

    if (audience.status !== AudienceStatus.CONFIRMEE) {
      throw new BadRequestException(
        'Seules les audiences confirmées peuvent être clôturées après réception',
      );
    }

    const visitTargetName = audience.visitTarget
      ? `${audience.visitTarget.firstName} ${audience.visitTarget.lastName}`
      : 'la personne à voir';
    const defaultComment =
      role === UserRole.SALLE_ATTENTE
        ? `Visiteur reçu — réception confirmée par la salle d'attente (${visitTargetName})`
        : `Visiteur reçu — rencontre confirmée avec ${visitTargetName}`;
    const comment = dto?.comment?.trim() || defaultComment;

    const updated = await this.prisma.audience.update({
      where: { id },
      data: { status: AudienceStatus.TERMINEE },
    });

    await this.prisma.audienceStatusHistory.create({
      data: {
        audienceId: id,
        fromStatus: audience.status,
        toStatus: AudienceStatus.TERMINEE,
        changedBy: userId,
        comment,
      },
    });

    return updated;
  }

  async remove(id: string, user: UserContext) {
    await this.findOne(id, user);
    await this.prisma.audience.delete({ where: { id } });
    return { success: true };
  }

  async getStats(
    user: { id: string; role: UserRole; cabinetId?: string | null; bureauId?: string | null },
    orgFilters?: { cabinetId?: string; bureauId?: string },
  ) {
    const scope: Prisma.AudienceWhereInput = {
      ...audienceListWhereForRole(user),
      ...adminOrgUnitFilter(user, orgFilters?.cabinetId, orgFilters?.bureauId),
    };
    const [total, enAttente, enAnalyse, validees, rejetees, planifiees, terminees, critiques] =
      await Promise.all([
        this.prisma.audience.count({ where: scope }),
        this.prisma.audience.count({ where: { ...scope, status: 'EN_ATTENTE' } }),
        this.prisma.audience.count({ where: { ...scope, status: 'EN_ANALYSE' } }),
        this.prisma.audience.count({ where: { ...scope, status: 'VALIDEE' } }),
        this.prisma.audience.count({ where: { ...scope, status: 'REJETEE' } }),
        this.prisma.audience.count({ where: { ...scope, status: 'PLANIFIEE' } }),
        this.prisma.audience.count({ where: { ...scope, status: 'TERMINEE' } }),
        this.prisma.audience.count({ where: { ...scope, priority: 'CRITIQUE' } }),
      ]);

    return { total, enAttente, enAnalyse, validees, rejetees, planifiees, terminees, critiques };
  }
}
