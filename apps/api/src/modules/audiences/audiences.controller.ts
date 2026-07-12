import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AudiencesService } from './audiences.service';
import { CreateAudienceDto, UpdateAudienceDto, ValidateAudienceDto, CompleteReceptionDto, CompleteAccompanimentDto, CloseAudienceDto, UpdateRequesterGradeDto } from './dto/audience.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
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
    @Query('cabinetId') cabinetId?: string,
    @Query('bureauId') bureauId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.audiencesService.findAll({
      status,
      priority,
      search,
      cabinetId,
      bureauId,
      user: {
        id: user!.sub,
        role: user!.role as UserRole,
        cabinetId: user!.cabinetId,
        bureauId: user!.bureauId,
      },
    });
  }

  @Get('stats')
  @RequirePermission('VIEW_AUDIENCES')
  getStats(
    @Query('cabinetId') cabinetId?: string,
    @Query('bureauId') bureauId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.audiencesService.getStats({
      id: user!.sub,
      role: user!.role as UserRole,
      cabinetId: user!.cabinetId,
      bureauId: user!.bureauId,
    }, { cabinetId, bureauId });
  }

  @Get('accompaniment-pending')
  @RequirePermission('ACCOMPANY_AUDIENCE')
  findAccompanimentPending(@CurrentUser() user: JwtPayload) {
    return this.audiencesService.findAccompanimentPending({
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Get('receptions-pending')
  @RequirePermission('COMPLETE_AUDIENCE')
  findReceptionsPending(@CurrentUser() user: JwtPayload) {
    return this.audiencesService.findReceptionsPending({
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Get('presence-pending')
  @RequirePermission('ACCOMPANY_AUDIENCE')
  findPresencePending(@CurrentUser() user: JwtPayload) {
    return this.audiencesService.findPresencePendingForWaitingRoom({
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Get('visit-targets')
  @RequirePermission('CREATE_AUDIENCE')
  findVisitTargets(@CurrentUser() user: JwtPayload) {
    return this.audiencesService.findVisitTargets({
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Get('requester-search')
  @RequirePermission('CREATE_AUDIENCE')
  searchRequesters(@Query('q') q?: string) {
    return this.audiencesService.searchRequestersFromAudiences(q ?? '');
  }

  @Get('duplicate-today')
  @RequirePermission('CREATE_AUDIENCE')
  findDuplicateToday(@Query('requesterName') requesterName: string) {
    return this.audiencesService.findDuplicateToday(requesterName ?? '');
  }

  @Get('my-today')
  @RequirePermission('VIEW_OWN_AUDIENCES_TODAY')
  findMyToday(@CurrentUser() user: JwtPayload) {
    return this.audiencesService.findMyTodayForWaitingRoom({
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Get(':id')
  @RequirePermission('VIEW_AUDIENCES')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.audiencesService.findOne(id, {
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
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
    @CurrentUser() user: JwtPayload,
  ) {
    return this.audiencesService.update(id, dto, {
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Patch(':id/requester-grade')
  @RequirePermission('DELETE_AUDIENCE')
  updateRequesterGrade(
    @Param('id') id: string,
    @Body() dto: UpdateRequesterGradeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.audiencesService.updateRequesterGrade(id, dto.requesterGrade, {
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Post(':id/forward-dircab')
  @RequirePermission('VALIDATE_AUDIENCE')
  forwardToDircab(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.audiencesService.forwardToDircab(id, {
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Post(':id/validate')
  @RequirePermission('VALIDATE_AUDIENCE')
  validate(
    @Param('id') id: string,
    @Body() dto: ValidateAudienceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.audiencesService.validate(id, dto, {
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Post(':id/close')
  @RequirePermission('VALIDATE_AUDIENCE')
  close(
    @Param('id') id: string,
    @Body() dto: CloseAudienceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.audiencesService.closeAudience(
      id,
      {
        id: user.sub,
        role: user.role as UserRole,
        cabinetId: user.cabinetId,
        bureauId: user.bureauId,
      },
      dto,
    );
  }

  @Post(':id/complete-accompaniment')
  @RequirePermission('ACCOMPANY_AUDIENCE')
  completeAccompaniment(
    @Param('id') id: string,
    @Body() dto: CompleteAccompanimentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.audiencesService.completeAccompaniment(id, userId, dto);
  }

  @Post(':id/confirm-presence')
  @RequirePermission('ACCOMPANY_AUDIENCE')
  confirmRequesterPresence(
    @Param('id') id: string,
    @Body() dto: CompleteAccompanimentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.audiencesService.confirmRequesterPresence(id, userId, dto);
  }

  @Post(':id/confirm')
  @RequirePermission('COMPLETE_AUDIENCE')
  confirm(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.audiencesService.confirmAudience(id, userId, role);
  }

  @Post(':id/complete-reception')
  @RequirePermission('COMPLETE_AUDIENCE')
  completeReception(
    @Param('id') id: string,
    @Body() dto: CompleteReceptionDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.audiencesService.completeReception(id, userId, role, dto);
  }

  @Delete(':id')
  @RequirePermission('DELETE_AUDIENCE')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.audiencesService.remove(id, {
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }
}
