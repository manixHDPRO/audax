import { Controller, Get, Post, Delete, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrgUnitsService } from './org-units.service';

@ApiTags('Unités Organisationnelles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('org-units')
export class OrgUnitsController {
  constructor(private readonly orgUnitsService: OrgUnitsService) {}

  @Get('cabinets')
  @ApiOperation({ summary: 'Liste tous les cabinets' })
  findAllCabinets() {
    return this.orgUnitsService.findAllCabinets();
  }

  @Get('bureaus')
  @ApiOperation({ summary: 'Liste tous les bureaux' })
  findAllBureaus() {
    return this.orgUnitsService.findAllBureaus();
  }

  @Post('cabinets')
  @ApiOperation({ summary: 'Créer un nouveau cabinet' })
  createCabinet(@Body('name') name: string) {
    return this.orgUnitsService.createCabinet(name);
  }

  @Post('bureaus')
  @ApiOperation({ summary: 'Créer un nouveau bureau' })
  createBureau(@Body('name') name: string) {
    return this.orgUnitsService.createBureau(name);
  }

  @Delete('cabinets/:id')
  @ApiOperation({ summary: 'Supprimer un cabinet' })
  async deleteCabinet(@Param('id') id: string) {
    try {
      return await this.orgUnitsService.deleteCabinet(id);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }

  @Delete('bureaus/:id')
  @ApiOperation({ summary: 'Supprimer un bureau' })
  async deleteBureau(@Param('id') id: string) {
    try {
      return await this.orgUnitsService.deleteBureau(id);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }
}
