import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  cabinetId?: string | null;
  bureauId?: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload & { id?: string };
    if (!data) return user;
    if (data === 'sub') return user.sub ?? user.id;
    return user?.[data];
  },
);
