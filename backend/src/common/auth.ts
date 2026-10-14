import { SetMetadata, createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { UserRole } from "../generated/prisma/enums";

export interface AuthIdentity {
  id: string;
  role: UserRole;
}

export const IS_PUBLIC = "isPublic";
export const ROLES = "roles";
export const VERIFIED_EMAIL = "verifiedEmail";
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);
export const VerifiedEmail = () => SetMetadata(VERIFIED_EMAIL, true);
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthIdentity => {
  return ctx.switchToHttp().getRequest<{ user: AuthIdentity }>().user;
});
