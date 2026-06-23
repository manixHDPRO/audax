import { Controller, Get, Patch, Param, Sse, UseGuards, MessageEvent } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { NotificationStreamService } from './notification-stream.service';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private notificationStream: NotificationStreamService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.findAll({
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    });
  }

  @Sse('stream')
  stream(@CurrentUser('sub') userId: string): Observable<MessageEvent> {
    return this.notificationStream.streamFor(userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.notificationsService.markRead(id, userId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
