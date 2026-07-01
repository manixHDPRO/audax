import { Module } from '@nestjs/common';
import { MilitaryGradesController } from './military-grades.controller';
import { MilitaryGradesService } from './military-grades.service';
import { PermissionsModule } from '../../common/permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [MilitaryGradesController],
  providers: [MilitaryGradesService],
  exports: [MilitaryGradesService],
})
export class MilitaryGradesModule {}
