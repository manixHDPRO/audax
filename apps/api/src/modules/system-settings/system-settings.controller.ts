import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SystemSettingsService } from './system-settings.service';
import { UpdateSystemSecurityDto } from './dto/system-security.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('system-settings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private systemSettingsService: SystemSettingsService) {}

  @Get('security')
  getSecuritySettings() {
    return this.systemSettingsService.getSecuritySettings();
  }

  @Patch('security')
  @RequirePermission('MANAGE_USERS')
  updateSecuritySettings(
    @Body() dto: UpdateSystemSecurityDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.systemSettingsService.updateSecuritySettings(dto, adminId);
  }
}
