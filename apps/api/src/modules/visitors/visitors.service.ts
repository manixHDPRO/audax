import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VisitorsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.visitor.findMany({
      include: {
        audienceVisitors: {
          include: { audience: { select: { reference: true, subject: true, status: true, scheduledAt: true } } },
        },
      },
      orderBy: { lastName: 'asc' },
    });
  }

  create(dto: Record<string, string>) {
    return this.prisma.visitor.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        organization: dto.organization,
        function: dto.function,
        email: dto.email,
        phone: dto.phone,
        accessLevel: (dto.accessLevel as never) ?? 'STANDARD',
        badgeCode: `VIS-${Date.now().toString(36).toUpperCase()}`,
      },
    });
  }
}
