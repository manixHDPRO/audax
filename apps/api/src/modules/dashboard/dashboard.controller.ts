import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  getOverview(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getOverview({
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Get('reports')
  getReports(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getReports({
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Get('activity')
  getActivity(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getRecentActivity({
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }
}
