import { BadRequestException, ForbiddenException, Injectable, Logger, ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import type { Request } from "express";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./dto";
import { AuditAction, EmailTokenType, UserRole } from "../generated/prisma/enums";
import { MailService } from "../mail/mail.service";
import { AuditService } from "../audit/audit.service";
import { LoginThrottleService, lockoutPolicy } from "./login-throttle.service";
import { clientIp, userAgent } from "../common/request-context";

interface RefreshPayload { sub: string; sid: string; role: UserRole; ver: number; type: "refresh" }

function durationSeconds(value: string) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Invalid token duration: ${value}`);
  const scale = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as "s" | "m" | "h" | "d"];
  return Number(match[1]) * scale;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison so a stored-hash check cannot be timed byte by byte. */
function hashesMatch(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

const publicUser = {
  id: true, email: true, firstName: true, lastName: true, address: true, phone: true, role: true,
  avatarUrl: true, isActive: true, emailVerifiedAt: true, isAgent: true, phoneVerified: true,
  createdAt: true, updatedAt: true,
  verificationDocs: { select: { status: true } },
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly loginThrottle: LoginThrottleService,
  ) {}

  async register(input: RegisterDto, request?: Request) {
    const email = input.email.trim().toLowerCase();
    // Self-service registration must never be able to mint an administrator.
    if (input.role !== UserRole.SEEKER && input.role !== UserRole.LISTER) throw new ForbiddenException("Unsupported account role");
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new ConflictException("Email already registered");
    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash: await argon2.hash(input.password), firstName: input.firstName.trim(), lastName: input.lastName.trim(), address: input.address.trim(), role: input.role },
        select: publicUser,
      });
      const tokens = await this.issueTokens(user.id, user.role, request);
      let verificationEmailSent = true;
      try { await this.sendEmailToken(user.id, user.email, EmailTokenType.VERIFY_EMAIL); }
      catch (error) { verificationEmailSent = false; this.logger.error("Verification email delivery failed", error instanceof Error ? error.stack : undefined); }
      await this.audit.record({ action: AuditAction.USER_REGISTERED, actorId: user.id, actorRole: user.role, targetType: "User", targetId: user.id, request });
      return { user, ...tokens, verificationEmailSent };
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "P2002") throw new ConflictException("Email already registered");
      throw error;
    }
  }

  async login(input: LoginDto, request?: Request) {
    const email = input.email.trim().toLowerCase();
    const ip = request ? clientIp(request) : null;

    const lockedMs = await this.loginThrottle.lockedForMs(email, ip);
    if (lockedMs !== null) {
      throw new ForbiddenException(`Too many failed sign-in attempts. Try again in ${Math.ceil(lockedMs / 60_000)} minutes.`);
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordOk = user ? await argon2.verify(user.passwordHash, input.password).catch(() => false) : false;
    if (!user?.isActive || !passwordOk) {
      const locked = await this.loginThrottle.recordFailure(email, ip);
      await this.audit.record({
        action: locked ? AuditAction.USER_LOCKED : AuditAction.USER_LOGIN_FAILED,
        actorId: user?.id ?? null, actorRole: user?.role ?? null, targetType: "User", targetId: user?.id ?? null,
        metadata: { email, reason: !user ? "unknown_email" : !user.isActive ? "inactive" : "bad_password" }, request,
      });
      if (locked && user) await this.mail.notifyAccountLocked(user.email, Math.ceil(lockoutPolicy().lockMs / 60_000));
      // The same message for every failure so the response cannot enumerate accounts.
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.loginThrottle.recordSuccess(user.id, email, ip);
    await this.audit.record({ action: AuditAction.USER_LOGIN, actorId: user.id, actorRole: user.role, targetType: "User", targetId: user.id, request });
    const safeUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: publicUser });
    return { user: safeUser, ...(await this.issueTokens(user.id, user.role, request)) };
  }

  async refresh(refreshToken: string | undefined, request?: Request) {
    if (!refreshToken) throw new UnauthorizedException();
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException();
    }
    if (payload.type !== "refresh" || !payload.sid) throw new UnauthorizedException();
    const hash = tokenHash(refreshToken);
    const session = await this.prisma.refreshSession.findUnique({ where: { id: payload.sid }, include: { user: true } });
    if (!session || !hashesMatch(session.tokenHash, hash) || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive || payload.ver !== session.user.tokenVersion) {
      // A presented-but-already-rotated token means the cookie leaked: drop the whole family.
      if (session && session.revokedAt) {
        await this.prisma.refreshSession.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await this.audit.record({
          action: AuditAction.USER_SESSIONS_REVOKED, actorId: session.userId, actorRole: session.user.role,
          targetType: "User", targetId: session.userId, metadata: { reason: "refresh_token_reuse" }, request,
        });
      }
      throw new UnauthorizedException();
    }
    const claimed = await this.prisma.refreshSession.updateMany({ where: { id: session.id, tokenHash: hash, revokedAt: null }, data: { revokedAt: new Date() } });
    if (claimed.count !== 1) throw new UnauthorizedException();
    return this.issueTokens(session.user.id, session.user.role, request);
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    await this.prisma.refreshSession.updateMany({ where: { tokenHash: tokenHash(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: publicUser });
  }

  async verifyEmail(token: string, request?: Request) {
    const row = await this.validEmailToken(token, EmailTokenType.VERIFY_EMAIL);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.emailToken.updateMany({ where: { id: row.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (claimed.count !== 1) throw new BadRequestException("Invalid or expired token");
      await tx.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } });
    });
    await this.audit.record({ action: AuditAction.USER_EMAIL_VERIFIED, actorId: row.userId, targetType: "User", targetId: row.userId, request });
    return { success: true };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, email: true, emailVerifiedAt: true, isActive: true } });
    if (user?.isActive && !user.emailVerifiedAt) {
      try { await this.sendEmailToken(user.id, user.email, EmailTokenType.VERIFY_EMAIL); }
      catch (error) { this.logger.error("Verification email delivery failed", error instanceof Error ? error.stack : undefined); }
    }
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, email: true, isActive: true } });
    if (user?.isActive) {
      try { await this.sendEmailToken(user.id, user.email, EmailTokenType.RESET_PASSWORD); }
      catch (error) { this.logger.error("Password reset email delivery failed", error instanceof Error ? error.stack : undefined); }
    }
    return { success: true };
  }

  async resetPassword(token: string, password: string, request?: Request) {
    const row = await this.validEmailToken(token, EmailTokenType.RESET_PASSWORD);
    const passwordHash = await argon2.hash(password);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.emailToken.updateMany({ where: { id: row.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (claimed.count !== 1) throw new BadRequestException("Invalid or expired token");
      // Bumping tokenVersion invalidates every outstanding access token too, not just refresh cookies.
      await tx.user.update({ where: { id: row.userId }, data: { passwordHash, tokenVersion: { increment: 1 }, failedLoginCount: 0, lockedUntil: null } });
      await tx.refreshSession.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    await this.audit.record({ action: AuditAction.USER_PASSWORD_RESET, actorId: row.userId, targetType: "User", targetId: row.userId, request });
    const user = await this.prisma.user.findUnique({ where: { id: row.userId }, select: { email: true } });
    if (user) await this.mail.notifyPasswordChanged(user.email);
    return { success: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, request?: Request) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true, role: true, passwordHash: true } });
    if (!(await argon2.verify(user.passwordHash, currentPassword).catch(() => false))) throw new UnauthorizedException("Current password is incorrect");
    if (await argon2.verify(user.passwordHash, newPassword).catch(() => false)) throw new BadRequestException("Choose a password you have not used here before");
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash, tokenVersion: { increment: 1 } } }),
      this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.record({ action: AuditAction.USER_PASSWORD_CHANGED, actorId: userId, actorRole: user.role, targetType: "User", targetId: userId, request });
    await this.mail.notifyPasswordChanged(user.email);
    return { success: true };
  }

  async logoutAll(userId: string, request?: Request) {
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } }),
      this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.record({ action: AuditAction.USER_SESSIONS_REVOKED, actorId: userId, targetType: "User", targetId: userId, metadata: { reason: "user_requested" }, request });
    return { success: true };
  }

  async listSessions(userId: string) {
    const sessions = await this.prisma.refreshSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, ip: true, userAgent: true, lastUsedAt: true, createdAt: true, expiresAt: true },
      orderBy: { lastUsedAt: "desc" },
      take: 50,
    });
    return sessions;
  }

  async revokeSession(userId: string, sessionId: string, request?: Request) {
    const revoked = await this.prisma.refreshSession.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (revoked.count !== 1) throw new BadRequestException("Session not found");
    await this.audit.record({ action: AuditAction.USER_SESSIONS_REVOKED, actorId: userId, targetType: "RefreshSession", targetId: sessionId, metadata: { reason: "single_session" }, request });
    return { success: true };
  }

  async requestEmailChange(userId: string, requestedEmail: string, password: string, request?: Request) {
    const newEmail = requestedEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, passwordHash: true, role: true } });
    if (!(await argon2.verify(user.passwordHash, password).catch(() => false))) throw new UnauthorizedException("Password is incorrect");
    if (newEmail === user.email) throw new BadRequestException("Choose a different email address");
    if (await this.prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } })) throw new ConflictException("Email already registered");

    const raw = randomBytes(32).toString("base64url");
    await this.prisma.$transaction([
      this.prisma.emailToken.updateMany({ where: { userId, type: EmailTokenType.CHANGE_EMAIL, consumedAt: null }, data: { consumedAt: new Date() } }),
      this.prisma.emailToken.create({ data: { userId, type: EmailTokenType.CHANGE_EMAIL, tokenHash: tokenHash(raw), pendingEmail: newEmail, expiresAt: new Date(Date.now() + 30 * 60_000) } }),
    ]);
    try {
      await this.mail.sendEmailChangeVerification(newEmail, raw);
    } catch (error) {
      await this.prisma.emailToken.updateMany({ where: { tokenHash: tokenHash(raw), consumedAt: null }, data: { consumedAt: new Date() } });
      throw error;
    }
    await this.audit.record({ action: AuditAction.USER_EMAIL_CHANGE_REQUESTED, actorId: userId, actorRole: user.role, targetType: "User", targetId: userId, metadata: { newEmail }, request });
    return { success: true };
  }

  async confirmEmailChange(token: string, request?: Request) {
    const row = await this.validEmailToken(token, EmailTokenType.CHANGE_EMAIL);
    if (!row.pendingEmail) throw new BadRequestException("Invalid or expired token");
    const oldUser = await this.prisma.user.findUniqueOrThrow({ where: { id: row.userId }, select: { email: true, role: true } });
    if (await this.prisma.user.findUnique({ where: { email: row.pendingEmail }, select: { id: true } })) throw new ConflictException("Email already registered");
    try {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.emailToken.updateMany({ where: { id: row.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
        if (claimed.count !== 1) throw new BadRequestException("Invalid or expired token");
        await tx.user.update({ where: { id: row.userId }, data: { email: row.pendingEmail!, emailVerifiedAt: new Date(), tokenVersion: { increment: 1 } } });
        await tx.refreshSession.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "P2002") throw new ConflictException("Email already registered");
      throw error;
    }
    await this.audit.record({ action: AuditAction.USER_EMAIL_CHANGED, actorId: row.userId, actorRole: oldUser.role, targetType: "User", targetId: row.userId, metadata: { oldEmail: oldUser.email, newEmail: row.pendingEmail }, request });
    await this.mail.notifyEmailChanged(oldUser.email, row.pendingEmail);
    return { success: true };
  }

  async cancelEmailChange(userId: string) {
    await this.prisma.emailToken.updateMany({ where: { userId, type: EmailTokenType.CHANGE_EMAIL, consumedAt: null }, data: { consumedAt: new Date() } });
    return { success: true };
  }

  async deactivate(userId: string, password: string, request?: Request) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, role: true } });
    if (!(await argon2.verify(user.passwordHash, password).catch(() => false))) throw new UnauthorizedException("Password is incorrect");
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { isActive: false, deactivatedAt: new Date(), tokenVersion: { increment: 1 } } }),
      this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      // Published listings must come down with the account.
      this.prisma.property.updateMany({ where: { ownerId: userId, status: "PUBLISHED" }, data: { status: "PAUSED" } }),
    ]);
    await this.audit.record({ action: AuditAction.USER_DEACTIVATED, actorId: userId, actorRole: user.role, targetType: "User", targetId: userId, request });
    return { success: true };
  }

  private async validEmailToken(token: string, type: EmailTokenType) {
    const row = await this.prisma.emailToken.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!row || row.type !== type || row.consumedAt || row.expiresAt <= new Date()) throw new BadRequestException("Invalid or expired token");
    return row;
  }

  private async sendEmailToken(userId: string, email: string, type: EmailTokenType) {
    const raw = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + (type === EmailTokenType.VERIFY_EMAIL ? 24 * 60 : 30) * 60_000);
    await this.prisma.$transaction([
      this.prisma.emailToken.updateMany({ where: { userId, type, consumedAt: null }, data: { consumedAt: new Date() } }),
      this.prisma.emailToken.create({ data: { userId, type, tokenHash: tokenHash(raw), expiresAt } }),
    ]);
    if (type === EmailTokenType.VERIFY_EMAIL) await this.mail.sendVerification(email, raw);
    else await this.mail.sendPasswordReset(email, raw);
  }

  private async issueTokens(userId: string, role: UserRole, request?: Request) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { tokenVersion: true } });
    const accessTtl = durationSeconds(process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m");
    const refreshTtl = durationSeconds(process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d");
    const session = await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: tokenHash(randomBytes(32).toString("hex")),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        ip: request ? clientIp(request) : null,
        userAgent: request ? userAgent(request) : null,
      },
    });
    const accessToken = await this.jwt.signAsync({ sub: userId, role, ver: user.tokenVersion, type: "access" }, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: accessTtl });
    const refreshToken = await this.jwt.signAsync({ sub: userId, sid: session.id, role, ver: user.tokenVersion, type: "refresh" }, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: refreshTtl });
    await this.prisma.refreshSession.update({ where: { id: session.id }, data: { tokenHash: tokenHash(refreshToken), lastUsedAt: new Date() } });
    return { accessToken, refreshToken, expiresIn: accessTtl };
  }
}
