import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VisitorsService } from './visitors.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@ApiTags('visitors')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('visitors')
export class VisitorsController {
  constructor(private visitorsService: VisitorsService) {}

  @Get('search')
  @RequirePermission('REGISTER_VISITOR')
  search(@Query('q') q?: string) {
    return this.visitorsService.searchForRegistration(q ?? '');
  }

  @Get('pre-registered-today')
  @RequirePermission('REGISTER_VISITOR')
  findPreRegisteredToday() {
    return this.visitorsService.findPreRegisteredToday();
  }

  @Get()
  @RequirePermission('MENU_VISITORS')
  findAll() {
    return this.visitorsService.findAll();
  }

  @Post()
  @RequirePermission('REGISTER_VISITOR')
  create(@Body() dto: Record<string, string>) {
    return this.visitorsService.create(dto);
  }
}
