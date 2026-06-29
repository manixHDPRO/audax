import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionsModule } from './common/permissions/permissions.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AudiencesModule } from './modules/audiences/audiences.module';
import { VisitorsModule } from './modules/visitors/visitors.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { AuditModule } from './modules/audit/audit.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { RolesModule } from './modules/roles/roles.module';
import { OrgUnitsModule } from './modules/org-units/org-units.module';
import { ChatModule } from './modules/chat/chat.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '../../.env.local'),
        join(process.cwd(), '.env.local'),
        join(process.cwd(), '../../.env'),
        join(process.cwd(), '.env'),
      ],
    }),
    PrismaModule,
    PermissionsModule,
    AuthModule,
    UsersModule,
    AudiencesModule,
    VisitorsModule,
    DashboardModule,
    NotificationsModule,
    RoomsModule,
    AuditModule,
    CalendarModule,
    RolesModule,
    OrgUnitsModule,
    ChatModule,
  ],
})
export class AppModule {}
