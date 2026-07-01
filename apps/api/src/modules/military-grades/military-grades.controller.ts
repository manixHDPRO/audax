import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MilitaryGradesService } from './military-grades.service';
import { CreateMilitaryGradeDto } from './dto/military-grade.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('military-grades')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('military-grades')
export class MilitaryGradesController {
  constructor(private militaryGradesService: MilitaryGradesService) {}

  @Get()
  findAll() {
    return this.militaryGradesService.findAll();
  }

  @Post()
  @RequirePermission('MANAGE_USERS')
  create(@Body() dto: CreateMilitaryGradeDto, @CurrentUser('sub') adminId: string) {
    return this.militaryGradesService.create(dto.label, adminId);
  }

  @Delete(':id')
  @RequirePermission('MANAGE_USERS')
  remove(@Param('id') id: string, @CurrentUser('sub') adminId: string) {
    return this.militaryGradesService.remove(id, adminId);
  }
}
