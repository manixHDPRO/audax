import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VisitorsService {
  constructor(private prisma: PrismaService) {}

  private getTodayBounds() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

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

  async searchForRegistration(search: string) {
    const term = search.trim();
    if (term.length < 2) return [];

    return this.prisma.visitor.findMany({
      where: {
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { organization: { contains: term, mode: 'insensitive' } },
          { function: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        organization: true,
        function: true,
        badgeCode: true,
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findPreRegisteredToday() {
    const { start, end } = this.getTodayBounds();
    return this.prisma.visitor.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        audienceVisitors: {
          none: {
            audience: { createdAt: { gte: start, lt: end } },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        organization: true,
        function: true,
        badgeCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: Record<string, string>) {
    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    if (!firstName || !lastName) {
      throw new BadRequestException('Le prénom et le nom sont obligatoires');
    }

    const existing = await this.prisma.visitor.findFirst({
      where: {
        firstName: { equals: firstName, mode: 'insensitive' },
        lastName: { equals: lastName, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Ce visiteur est déjà enregistré${existing.badgeCode ? ` (badge ${existing.badgeCode})` : ''}.`,
      );
    }

    return this.prisma.visitor.create({
      data: {
        firstName,
        lastName,
        organization: dto.organization?.trim() || undefined,
        function: dto.function?.trim() || undefined,
        email: dto.email?.trim() || undefined,
        phone: dto.phone?.trim() || undefined,
        accessLevel: (dto.accessLevel as never) ?? 'STANDARD',
        badgeCode: `VIS-${Date.now().toString(36).toUpperCase()}`,
      },
    });
  }
}
