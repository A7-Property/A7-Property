import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface LockoutPolicy {
  maxFailures: number;
  windowMs: number;
  lockMs: number;
  maxFailuresPerIp: number;
}

export function lockoutPolicy(): LockoutPolicy {
  return {
    maxFailures: Number(process.env.LOGIN_MAX_FAILURES ?? 8),
    windowMs: Number(process.env.LOGIN_FAILURE_WINDOW_MINUTES ?? 15) * 60_000,
    lockMs: Number(process.env.LOGIN_LOCK_MINUTES ?? 15) * 60_000,
    maxFailuresPerIp: Number(process.env.LOGIN_MAX_FAILURES_PER_IP ?? 30),
  };
}

/**
 * Account- and IP-scoped brute-force protection. State lives in PostgreSQL so
 * every API replica enforces the same counters, unlike the in-memory throttler.
 */
@Injectable()
export class LoginThrottleService {
  constructor(private readonly prisma: PrismaService) {}

  /** @returns milliseconds remaining on an active lock, or null when sign-in may proceed. */
  async lockedForMs(email: string, ip: string | null, now = new Date()) {
    const policy = lockoutPolicy();
    const user = await this.prisma.user.findUnique({ where: { email }, select: { lockedUntil: true } });
    if (user?.lockedUntil && user.lockedUntil > now) return user.lockedUntil.getTime() - now.getTime();
    if (!ip) return null;
    const since = new Date(now.getTime() - policy.windowMs);
    const ipFailures = await this.prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } });
    return ipFailures >= policy.maxFailuresPerIp ? policy.lockMs : null;
  }

  /** @returns true when this failure pushed the account into a lock. */
  async recordFailure(email: string, ip: string | null, now = new Date()) {
    const policy = lockoutPolicy();
    await this.prisma.loginAttempt.create({ data: { email, ip, success: false } });
    const since = new Date(now.getTime() - policy.windowMs);
    const failures = await this.prisma.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } });
    if (failures < policy.maxFailures) return false;
    const locked = await this.prisma.user.updateMany({
      where: { email },
      data: { lockedUntil: new Date(now.getTime() + policy.lockMs), failedLoginCount: failures },
    });
    return locked.count > 0;
  }

  async recordSuccess(userId: string, email: string, ip: string | null) {
    await this.prisma.$transaction([
      this.prisma.loginAttempt.create({ data: { email, ip, success: true } }),
      this.prisma.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } }),
    ]);
  }
}
