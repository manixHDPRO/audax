import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../decorators/current-user.decorator';

function isDatabaseUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('restauration') ||
    msg.includes('recovery') ||
    msg.includes("n'accepte pas encore de connexions") ||
    msg.includes('the database system is in recovery mode') ||
    msg.includes('the database system is not yet accepting connections')
  );
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          firstName: true,
          lastName: true,
          cabinetId: true,
          bureauId: true,
        },
      });

      if (!user?.isActive) {
        throw new UnauthorizedException('Compte inactif ou introuvable');
      }

      return {
        sub: user.id,
        email: user.email,
        role: user.role,
        cabinetId: user.cabinetId,
        bureauId: user.bureauId,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      if (isDatabaseUnavailableError(error)) {
        throw new ServiceUnavailableException(
          'Base de données temporairement indisponible — réessayez dans quelques secondes',
        );
      }

      throw error;
    }
  }
}
