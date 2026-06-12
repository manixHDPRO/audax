import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { AudienceStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RescheduleDto } from './dto/calendar.dto';
import { assertCanViewAudience } from '../../common/priorite0-access';

const SLOT_DURATION_MS = 60 * 60 * 1000;

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async reschedule(audienceId: string, dto: RescheduleDto, userId: string, role: UserRole) {
    const audience = await this.prisma.audience.findUnique({
      where: { id: audienceId },
      include: { appointment: true },
    });

    if (!audience) throw new NotFoundException('Audience introuvable');
    assertCanViewAudience(audience, role);

    if (audience.status === AudienceStatus.DEJA_ENVOYE) {
      throw new BadRequestException('Audience déjà envoyée au Dircab — aucune action n\'est autorisée');
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
        changedBy: userId,
        comment: `Replanifiée au ${newStart.toLocaleString('fr-FR')}`,
      },
    });

    return { success: true, audience: updated, conflicts: [] };
  }
}
