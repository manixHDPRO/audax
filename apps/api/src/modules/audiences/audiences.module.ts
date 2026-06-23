import { Module } from '@nestjs/common';
import { AudiencesController } from './audiences.controller';
import { AudiencesService } from './audiences.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AudiencesController],
  providers: [AudiencesService],
  exports: [AudiencesService],
})
export class AudiencesModule {}
