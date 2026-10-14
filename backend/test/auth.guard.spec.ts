import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { AuthGuard } from "../src/common/auth.guard";
import { PrismaService } from "../src/prisma/prisma.service";
import { UserRole } from "../src/generated/prisma/enums";

describe("AuthGuard", () => {
  const request = { headers: { authorization: "Bearer test" }, user: undefined as unknown };
  const context = {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const reflector = { getAllAndOverride: jest.fn() };
  const jwt = { verifyAsync: jest.fn() };
  const prisma = { user: { findUnique: jest.fn() } };
  const guard = new AuthGuard(reflector as unknown as Reflector, jwt as unknown as JwtService, prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    request.headers.authorization = "Bearer test";
    request.user = undefined;
    reflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce([UserRole.LISTER]).mockReturnValueOnce(false);
    jwt.verifyAsync.mockResolvedValue({ sub: "user-1", role: UserRole.LISTER, ver: 0, type: "access" });
    prisma.user.findUnique.mockResolvedValue({ id: "user-1", role: UserRole.LISTER, isActive: true, emailVerifiedAt: null, tokenVersion: 0 });
  });

  it("uses the database role rather than a claim for authorization", async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: "user-1", role: UserRole.SEEKER, ver: 0, type: "access" });
    expect(await guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: "user-1", role: UserRole.LISTER });
  });

  it("blocks a valid token when its database role lacks access", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "user-1", role: UserRole.SEEKER, isActive: true, emailVerifiedAt: null, tokenVersion: 0 });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects refresh tokens on protected endpoints", async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: "user-1", role: UserRole.LISTER, ver: 0, type: "refresh" });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects access tokens issued before an account-wide revocation", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "user-1", role: UserRole.LISTER, isActive: true, emailVerifiedAt: null, tokenVersion: 1 });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("requires a verified email on protected write routes", async () => {
    reflector.getAllAndOverride.mockReset().mockReturnValueOnce(false).mockReturnValueOnce([UserRole.LISTER]).mockReturnValueOnce(true);
    await expect(guard.canActivate(context)).rejects.toThrow("Verify your email first");
  });
});
