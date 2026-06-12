import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RolesGuard } from '../guards/roles.guard';

@Global()
@Module({
  providers: [PermissionsService, RolesGuard],
  exports: [PermissionsService, RolesGuard],
})
export class PermissionsModule {}
