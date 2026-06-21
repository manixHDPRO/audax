import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrgUnitsService {
  constructor(private prisma: PrismaService) {}

  async findAllCabinets() {
    return this.prisma.cabinet.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findAllBureaus() {
    return this.prisma.bureau.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createCabinet(name: string) {
    return this.prisma.cabinet.create({
      data: { name },
    });
  }

  async createBureau(name: string) {
    return this.prisma.bureau.create({
      data: { name },
    });
  }

  async deleteCabinet(id: string) {
    // Check if users are assigned
    const userCount = await this.prisma.user.count({
      where: { cabinetId: id },
    });

    if (userCount > 0) {
      throw new Error('Impossible de supprimer : des utilisateurs sont encore affectés à ce cabinet');
    }

    return this.prisma.cabinet.delete({
      where: { id },
    });
  }

  async deleteBureau(id: string) {
    // Check if users are assigned
    const userCount = await this.prisma.user.count({
      where: { bureauId: id },
    });

    if (userCount > 0) {
      throw new Error('Impossible de supprimer : des utilisateurs sont encore affectés à ce bureau');
    }

    return this.prisma.bureau.delete({
      where: { id },
    });
  }
}
