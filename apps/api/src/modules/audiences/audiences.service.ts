import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AudienceStatus, UserRole, ValidationDecision } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAudienceDto, UpdateAudienceDto, ValidateAudienceDto } from './dto/audience.dto';
import { getAudienceDatePrefix, nextAudienceReference } from '../../common/audience-reference';
import {
  assertCanViewAudience,
  canViewPriorite0Audiences,
  priorite0ExcludeWhere,
} from '../../common/priorite0-access';

@Injectable()
export class AudiencesService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.audience.findMany({
      where: {
        createdById: userId,
        createdAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        reference: true,
        subject: true,
        requesterName: true,
        category: true,
        priority: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(filters: {
    status?: string;
    priority?: string;
    search?: string;
    role: UserRole;
  }) {
    if (filters.priority === 'PRIORITE_0' && !canViewPriorite0Audiences(filters.role)) {
      return [];
    }

    return this.prisma.audience.findMany({
      where: {
        ...priorite0ExcludeWhere(filters.role),
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
        validations: { include: { validator: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, role: UserRole) {
    const audience = await this.prisma.audience.findUnique({
      where: { id },
      include: {
        visitors: { include: { visitor: true } },
        room: true,
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        validations: { include: { validator: { select: { firstName: true, lastName: true } } } },
        appointment: true,
      },
    });
    if (!audience) throw new NotFoundException('Audience introuvable');
    assertCanViewAudience(audience, role);
    return audience;
  }

  async create(dto: CreateAudienceDto, userId: string) {
    const datePrefix = getAudienceDatePrefix();
    const todayAudiences = await this.prisma.audience.findMany({
      where: { reference: { startsWith: `AUD-${datePrefix}-` } },
      select: { reference: true },
    });
    const reference = nextAudienceReference(todayAudiences.map((a) => a.reference));

    return this.prisma.audience.create({
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
        statusHistory: {
          create: { toStatus: 'EN_ATTENTE', changedBy: userId, comment: 'Demande créée' },
        },
      },
      include: { visitors: { include: { visitor: true } } },
    });
  }

  async update(id: string, dto: UpdateAudienceDto, userId: string, role: UserRole) {
    const current = await this.findOne(id, role);
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
          changedBy: userId,
        },
      });
    }

    return audience;
  }

  async forwardToDircab(id: string, userId: string, role: UserRole) {
    const audience = await this.findOne(id, role);

    if (audience.status !== AudienceStatus.EN_ATTENTE) {
      throw new BadRequestException('Seules les audiences en attente peuvent être envoyées au Dircab');
    }

    const newStatus = AudienceStatus.DEJA_ENVOYE;

    await this.prisma.validation.create({
      data: {
        audienceId: id,
        validatorId: userId,
        level: 1,
        decision: ValidationDecision.EN_ATTENTE,
        comment: 'Transmise au Dircab',
        decidedAt: new Date(),
      },
    });

    const updated = await this.prisma.audience.update({
      where: { id },
      data: { status: newStatus },
    });

    await this.prisma.audienceStatusHistory.create({
      data: {
        audienceId: id,
        fromStatus: audience.status,
        toStatus: newStatus,
        changedBy: userId,
        comment: 'Transmise au Dircab',
      },
    });

    return updated;
  }

  async validate(id: string, dto: ValidateAudienceDto, userId: string, role: UserRole) {
    const audience = await this.findOne(id, role);

    if (audience.status === AudienceStatus.DEJA_ENVOYE) {
      throw new BadRequestException('Audience déjà envoyée au Dircab — aucune action n\'est autorisée');
    }

    if (audience.status === AudienceStatus.VALIDEE || audience.status === AudienceStatus.PLANIFIEE) {
      throw new BadRequestException('Audience validée — seule la reprogrammation est autorisée');
    }

    const validation = await this.prisma.validation.create({
      data: {
        audienceId: id,
        validatorId: userId,
        level: dto.level ?? 1,
        decision: dto.decision,
        comment: dto.comment,
        decidedAt: new Date(),
      },
    });

    const newStatus =
      dto.decision === ValidationDecision.APPROUVE
        ? AudienceStatus.VALIDEE
        : dto.decision === ValidationDecision.REJETE
          ? AudienceStatus.REJETEE
          : AudienceStatus.EN_ANALYSE;

    await this.prisma.audience.update({
      where: { id },
      data: { status: newStatus },
    });

    await this.prisma.audienceStatusHistory.create({
      data: {
        audienceId: id,
        toStatus: newStatus,
        changedBy: userId,
        comment: dto.comment,
      },
    });

    return validation;
  }

  async remove(id: string, role: UserRole) {
    await this.findOne(id, role);
    await this.prisma.audience.delete({ where: { id } });
    return { success: true };
  }

  async getStats(role: UserRole) {
    const scope = priorite0ExcludeWhere(role);
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
