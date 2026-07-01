import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@RequirePermission('MANAGE_USERS')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@CurrentUser('role') callerRole: UserRole) {
    return this.usersService.findAll(callerRole);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('role') callerRole: UserRole) {
    return this.usersService.findOne(id, callerRole);
  }

  @Post()
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') callerRole: UserRole,
  ) {
    return this.usersService.create(dto, adminId, callerRole);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') callerRole: UserRole,
  ) {
    return this.usersService.update(id, dto, adminId, callerRole);
  }

  @Patch(':id/toggle-active')
  toggleActive(
    @Param('id') id: string,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') callerRole: UserRole,
  ) {
    return this.usersService.toggleActive(id, adminId, callerRole);
  }

  @Post(':id/send-password-link')
  sendPasswordLink(
    @Param('id') id: string,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') callerRole: UserRole,
  ) {
    return this.usersService.sendPasswordLink(id, adminId, callerRole);
  }
}
