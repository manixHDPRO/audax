import { Controller, Post, Body, Req, HttpCode, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { LoginDto, RefreshDto, Verify2FADto, Enable2FADto, Disable2FADto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/profile.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Connexion utilisateur' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip ?? req.socket.remoteAddress;
    return this.authService.login(dto, ip);
  }

  @Post('2fa/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Vérifier le code 2FA après login' })
  verify2FA(@Body() dto: Verify2FADto, @Req() req: Request) {
    const ip = req.ip ?? req.socket.remoteAddress;
    return this.authService.verify2FA(dto.tempToken, dto.totpCode, ip);
  }

  @Get('2fa/setup')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Générer secret et QR code 2FA' })
  setup2FA(@CurrentUser('sub') userId: string) {
    return this.twoFactorService.setup(userId);
  }

  @Post('2fa/enable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(200)
  enable2FA(@CurrentUser('sub') userId: string, @Body() dto: Enable2FADto) {
    return this.twoFactorService.enable(userId, dto.totpCode);
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(200)
  disable2FA(@CurrentUser('sub') userId: string, @Body() dto: Disable2FADto) {
    return this.twoFactorService.disable(userId, dto.totpCode);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil de l\'utilisateur connecté' })
  getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }

  @Patch('me/password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Changer son mot de passe' })
  changePassword(@CurrentUser('sub') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto);
  }
}
