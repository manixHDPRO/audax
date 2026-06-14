import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AudiencesService } from './audiences.service';
import { CreateAudienceDto, UpdateAudienceDto, ValidateAudienceDto } from './dto/audience.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('audiences')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('audiences')
export class AudiencesController {
  constructor(private audiencesService: AudiencesService) {}

  @Get()
  @RequirePermission('VIEW_AUDIENCES')
  findAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @CurrentUser('role') role?: UserRole,
  ) {
    return this.audiencesService.findAll({ status, priority, search, role: role! });
  }

  @Get('stats')
  @RequirePermission('VIEW_AUDIENCES')
  getStats(@CurrentUser('role') role: UserRole) {
    return this.audiencesService.getStats(role);
  }

  @Get('visit-targets')
  @RequirePermission('CREATE_AUDIENCE')
  findVisitTargets() {
    return this.audiencesService.findVisitTargets();
  }

  @Get('my-today')
  @RequirePermission('VIEW_OWN_AUDIENCES_TODAY')
  findMyToday(@CurrentUser('sub') userId: string) {
    return this.audiencesService.findMyTodayForWaitingRoom(userId);
  }

  @Get(':id')
  @RequirePermission('VIEW_AUDIENCES')
  findOne(@Param('id') id: string, @CurrentUser('role') role: UserRole) {
    return this.audiencesService.findOne(id, role);
  }

  @Post()
  @RequirePermission('CREATE_AUDIENCE')
  create(@Body() dto: CreateAudienceDto, @CurrentUser('sub') userId: string) {
    return this.audiencesService.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermission('PLANIFY')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAudienceDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.audiencesService.update(id, dto, userId, role);
  }

  @Post(':id/forward-dircab')
  @RequirePermission('VALIDATE_AUDIENCE')
  forwardToDircab(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.audiencesService.forwardToDircab(id, userId, role);
  }

  @Post(':id/validate')
  @RequirePermission('VALIDATE_AUDIENCE')
  validate(
    @Param('id') id: string,
    @Body() dto: ValidateAudienceDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.audiencesService.validate(id, dto, userId, role);
  }

  @Delete(':id')
  @RequirePermission('DELETE_AUDIENCE')
  remove(@Param('id') id: string, @CurrentUser('role') role: UserRole) {
    return this.audiencesService.remove(id, role);
  }
}
