import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../permissions/permissions.service';

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (permission: PermissionKey) =>
  SetMetadata(PERMISSION_KEY, permission);
