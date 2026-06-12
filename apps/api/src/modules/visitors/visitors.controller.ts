import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VisitorsService } from './visitors.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@ApiTags('visitors')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@RequirePermission('MANAGE_VISITORS')
@Controller('visitors')
export class VisitorsController {
  constructor(private visitorsService: VisitorsService) {}

  @Get()
  findAll() {
    return this.visitorsService.findAll();
  }

  @Post()
  create(@Body() dto: Record<string, string>) {
    return this.visitorsService.create(dto);
  }
}
