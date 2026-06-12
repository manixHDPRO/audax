import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  getOverview(@CurrentUser('role') role: UserRole) {
    return this.dashboardService.getOverview(role);
  }

  @Get('activity')
  getActivity(@CurrentUser('role') role: UserRole) {
    return this.dashboardService.getRecentActivity(role);
  }
}
