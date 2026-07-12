import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TwoFactorService } from './two-factor.service';
import { JwtStrategy } from '../../common/guards/jwt.strategy';
import { PasswordTokensModule } from '../../common/password-tokens/password-tokens.module';
import { resolveJwtSecret } from '../../common/security/jwt-secret';

@Module({
  imports: [
    PasswordTokensModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(
          config.get<string>('JWT_SECRET'),
          config.get<string>('NODE_ENV'),
        ),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') ?? '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TwoFactorService, JwtStrategy],
  exports: [AuthService, TwoFactorService, JwtModule],
})
export class AuthModule {}
