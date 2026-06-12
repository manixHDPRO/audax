import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { UserRole } from '@prisma/client';

import { ROLES_KEY } from '../decorators/roles.decorator';

import { PERMISSION_KEY } from '../decorators/permissions.decorator';

import { PermissionsService, PermissionKey } from '../permissions/permissions.service';



@Injectable()

export class RolesGuard implements CanActivate {

  constructor(

    private reflector: Reflector,

    private permissionsService: PermissionsService,

  ) {}



  async canActivate(context: ExecutionContext): Promise<boolean> {

    const permission = this.reflector.getAllAndOverride<PermissionKey>(PERMISSION_KEY, [

      context.getHandler(),

      context.getClass(),

    ]);



    const { user } = context.switchToHttp().getRequest();



    if (permission) {

      if (!user?.role) {

        throw new ForbiddenException('Accès non autorisé pour ce rôle');

      }

      const allowed = await this.permissionsService.hasPermission(user.role as UserRole, permission);

      if (!allowed) {

        throw new ForbiddenException('Accès non autorisé pour ce rôle');

      }

      return true;

    }



    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [

      context.getHandler(),

      context.getClass(),

    ]);



    if (!requiredRoles?.length) return true;



    if (!user || !requiredRoles.includes(user.role)) {

      throw new ForbiddenException('Accès non autorisé pour ce rôle');

    }

    return true;

  }

}
