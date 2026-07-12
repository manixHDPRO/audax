import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { MailModule } from './modules/mail/mail.module';
import { MilitaryGradesModule } from './modules/military-grades/military-grades.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
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
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
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
    MailModule,
    MilitaryGradesModule,
    SystemSettingsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
