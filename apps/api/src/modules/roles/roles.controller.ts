import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RolesService } from './roles.service';
import { CreateCustomRoleDto, UpdateCustomRoleDto, UpdateRoleMatrixDto, UpdateSystemRoleDto } from './dto/role.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@RequirePermission('MANAGE_USERS')
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get('matrix')
  getMatrix(@CurrentUser('role') callerRole: UserRole) {
    return this.rolesService.getMatrix(callerRole);
  }

  @Patch('matrix')
  updateMatrix(
    @Body() dto: UpdateRoleMatrixDto,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') callerRole: UserRole,
  ) {
    return this.rolesService.updateMatrix(dto, adminId, callerRole);
  }

  @Post()
  createCustomRole(@Body() dto: CreateCustomRoleDto, @CurrentUser('sub') adminId: string) {
    return this.rolesService.createCustomRole(dto, adminId);
  }

  @Patch('system/:code')
  updateSystemRole(
    @Param('code') code: string,
    @Body() dto: UpdateSystemRoleDto,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') callerRole: UserRole,
  ) {
    return this.rolesService.updateSystemRole(code, dto, adminId, callerRole);
  }

  @Patch(':id')
  updateCustomRole(
    @Param('id') id: string,
    @Body() dto: UpdateCustomRoleDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.rolesService.updateCustomRole(id, dto, adminId);
  }

  @Delete(':id')
  deleteCustomRole(@Param('id') id: string, @CurrentUser('sub') adminId: string) {
    return this.rolesService.deleteCustomRole(id, adminId);
  }
}
