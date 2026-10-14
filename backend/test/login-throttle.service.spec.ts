import { LoginThrottleService, lockoutPolicy } from "../src/auth/login-throttle.service";
import type { PrismaService } from "../src/prisma/prisma.service";

describe("LoginThrottleService", () => {
  const prisma = {
    user: { findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    loginAttempt: { create: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new LoginThrottleService(prisma as unknown as PrismaService);
  const now = new Date("2026-10-02T10:00:00.000Z");

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.loginAttempt.create.mockResolvedValue({});
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
  });

  it("reads its limits from the environment with safe defaults", () => {
    const policy = lockoutPolicy();
    expect(policy.maxFailures).toBeGreaterThan(0);
    expect(policy.lockMs).toBeGreaterThan(0);
    expect(policy.maxFailuresPerIp).toBeGreaterThanOrEqual(policy.maxFailures);
  });

  it("reports the remaining lock time while a lock is active", async () => {
    prisma.user.findUnique.mockResolvedValue({ lockedUntil: new Date(now.getTime() + 5 * 60_000) });
    await expect(service.lockedForMs("locked@example.test", "203.0.113.5", now)).resolves.toBe(5 * 60_000);
    // An active account lock short-circuits before the IP counter is consulted.
    expect(prisma.loginAttempt.count).not.toHaveBeenCalled();
  });

  it("treats an expired lock as unlocked", async () => {
    prisma.user.findUnique.mockResolvedValue({ lockedUntil: new Date(now.getTime() - 1_000) });
    prisma.loginAttempt.count.mockResolvedValue(0);
    await expect(service.lockedForMs("stale@example.test", "203.0.113.5", now)).resolves.toBeNull();
  });

  it("locks an address that has failed across many accounts", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.loginAttempt.count.mockResolvedValue(lockoutPolicy().maxFailuresPerIp);
    await expect(service.lockedForMs("anything@example.test", "203.0.113.5", now)).resolves.toBe(lockoutPolicy().lockMs);
  });

  it("does not lock on an unknown address when no account lock exists", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.lockedForMs("anything@example.test", null, now)).resolves.toBeNull();
    expect(prisma.loginAttempt.count).not.toHaveBeenCalled();
  });

  it("records a failure without locking while under the threshold", async () => {
    prisma.loginAttempt.count.mockResolvedValue(lockoutPolicy().maxFailures - 1);
    await expect(service.recordFailure("user@example.test", "203.0.113.5", now)).resolves.toBe(false);
    expect(prisma.loginAttempt.create).toHaveBeenCalledWith({ data: { email: "user@example.test", ip: "203.0.113.5", success: false } });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("locks the account once the threshold is reached", async () => {
    prisma.loginAttempt.count.mockResolvedValue(lockoutPolicy().maxFailures);
    await expect(service.recordFailure("user@example.test", "203.0.113.5", now)).resolves.toBe(true);
    const update = prisma.user.updateMany.mock.calls[0][0];
    expect(update.where).toEqual({ email: "user@example.test" });
    expect(update.data.lockedUntil.getTime()).toBe(now.getTime() + lockoutPolicy().lockMs);
  });

  it("reports no lock for an unknown account even at the threshold", async () => {
    prisma.loginAttempt.count.mockResolvedValue(lockoutPolicy().maxFailures);
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.recordFailure("ghost@example.test", null, now)).resolves.toBe(false);
  });

  it("clears the counters on a successful sign-in", async () => {
    prisma.$transaction.mockResolvedValue([{}, {}]);
    await service.recordSuccess("user-1", "user@example.test", "203.0.113.5");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const resetCall = prisma.user.update.mock.calls[0][0];
    expect(resetCall.data).toMatchObject({ failedLoginCount: 0, lockedUntil: null });
  });
});
