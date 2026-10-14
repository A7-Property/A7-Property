import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { AuthIdentity, IS_PUBLIC, ROLES, VERIFIED_EMAIL } from "./auth";
import type { UserRole } from "../generated/prisma/enums";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<Request & { user?: AuthIdentity }>();
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException();
    let payload: { sub: string; role: UserRole; ver: number; type: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      throw new UnauthorizedException();
    }
    if (payload.type !== "access" || !payload.sub) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, isActive: true, emailVerifiedAt: true, tokenVersion: true } });
    if (!user?.isActive || payload.ver !== user.tokenVersion) throw new UnauthorizedException();
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES, [context.getHandler(), context.getClass()]);
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenException();
    const verifiedEmail = this.reflector.getAllAndOverride<boolean>(VERIFIED_EMAIL, [context.getHandler(), context.getClass()]);
    if (verifiedEmail && !user.emailVerifiedAt) throw new ForbiddenException("Verify your email first");
    request.user = { id: user.id, role: user.role };
    return true;
  }
}
