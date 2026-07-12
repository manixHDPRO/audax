import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { AudienceStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RescheduleDto } from './dto/calendar.dto';
import { assertCanPlanifyAudience, UserContext } from '../../common/audience-role-access';

const SLOT_DURATION_MS = 60 * 60 * 1000;

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async reschedule(audienceId: string, dto: RescheduleDto, user: UserContext) {
    const audience = await this.prisma.audience.findUnique({
      where: { id: audienceId },
      include: {
        appointment: true,
        visitTarget: { select: { role: true, cabinetId: true, bureauId: true } },
      },
    });

    if (!audience) throw new NotFoundException('Audience introuvable');
    await assertCanPlanifyAudience(this.prisma, audienceId, user);

    if (
      audience.status === AudienceStatus.DEJA_ENVOYE ||
      audience.status === AudienceStatus.TRANSMIS_DIRCAB
    ) {
      throw new BadRequestException('Audience déjà transmise — reprogrammation non autorisée à ce stade');
    }

    const newStart = new Date(dto.scheduledAt);
    const newEnd = new Date(newStart.getTime() + SLOT_DURATION_MS);

    const conflicts = await this.prisma.appointment.findMany({
      where: {
        audienceId: { not: audienceId },
        OR: [
          { startAt: { lt: newEnd }, endAt: { gt: newStart } },
        ],
      },
      include: { audience: { select: { reference: true, subject: true } } },
    });

    if (conflicts.length) {
      throw new ConflictException({
        message: 'Conflit horaire détecté',
        conflicts: conflicts.map((c) => ({
          reference: c.audience.reference,
          subject: c.audience.subject,
          startAt: c.startAt,
          endAt: c.endAt,
        })),
      });
    }

    const updated = await this.prisma.audience.update({
      where: { id: audienceId },
      data: {
        scheduledAt: newStart,
        status: audience.status === 'VALIDEE' ? 'PLANIFIEE' : audience.status,
      },
    });

    if (audience.appointment) {
      await this.prisma.appointment.update({
        where: { id: audience.appointment.id },
        data: { startAt: newStart, endAt: newEnd },
      });
    } else {
      await this.prisma.appointment.create({
        data: {
          audienceId,
          startAt: newStart,
          endAt: newEnd,
          roomId: audience.roomId ?? undefined,
        },
      });
    }

    await this.prisma.audienceStatusHistory.create({
      data: {
        audienceId,
        fromStatus: audience.status,
        toStatus: updated.status,
        changedBy: user.id,
        comment: `Replanifiée au ${newStart.toLocaleString('fr-FR')}`,
      },
    });

    return { success: true, audience: updated, conflicts: [] };
  }
}
