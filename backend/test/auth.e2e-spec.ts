import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { Server } from "node:http";
import { createTestApp, resetDatabase, resetRateLimits, strongPassword, uniqueEmail } from "./helpers/app";
import type { PrismaService } from "../src/prisma/prisma.service";
import { AuditAction, EmailTokenType, UserRole } from "../src/generated/prisma/enums";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase("Authentication (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const server = () => app.getHttpServer() as Server;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    resetRateLimits(app);
  });

  const register = (overrides: Partial<Record<string, unknown>> = {}) =>
    request(server()).post("/api/v1/auth/register").send({
      email: uniqueEmail("seeker"),
      password: strongPassword,
      firstName: "Aye",
      lastName: "Chan",
      role: UserRole.SEEKER,
      ...overrides,
    });

  it("registers a seeker, returns an access token and sets an HttpOnly refresh cookie", async () => {
    const response = await register().expect(201);
    expect(response.body.data.user.role).toBe(UserRole.SEEKER);
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
    expect(typeof response.body.data.accessToken).toBe("string");

    const cookie = (response.headers["set-cookie"] as unknown as string[]).find((value) => value.startsWith("a7_refresh="));
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/api/v1/auth");
  });

  it("refuses to create an administrator through public registration", async () => {
    await register({ email: uniqueEmail("escalate"), role: UserRole.ADMIN }).expect(400);
    expect(await prisma.user.count({ where: { role: UserRole.ADMIN } })).toBe(0);
  });

  it("rejects an unknown field instead of silently ignoring it", async () => {
    const response = await register({ role: UserRole.SEEKER, isAgent: true }).expect(400);
    expect(JSON.stringify(response.body.message)).toContain("isAgent");
  });

  it("returns the same message for a wrong password and an unknown account", async () => {
    const email = uniqueEmail("known");
    await register({ email }).expect(201);
    const wrongPassword = await request(server()).post("/api/v1/auth/login").send({ email, password: "Wrong-Password-1" }).expect(401);
    const unknownEmail = await request(server()).post("/api/v1/auth/login").send({ email: uniqueEmail("ghost"), password: strongPassword }).expect(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it("locks an account after repeated failures and records it in the audit trail", async () => {
    const email = uniqueEmail("locked");
    await register({ email }).expect(201);

    const maxFailures = Number(process.env.LOGIN_MAX_FAILURES ?? 8);
    for (let attempt = 0; attempt < maxFailures; attempt += 1) {
      await request(server()).post("/api/v1/auth/login").send({ email, password: "Wrong-Password-1" }).expect(401);
    }

    // The correct password is now refused too: the lock is on the account, not the guess.
    const locked = await request(server()).post("/api/v1/auth/login").send({ email, password: strongPassword }).expect(403);
    expect(locked.body.message).toMatch(/Too many failed sign-in attempts/);

    expect(await prisma.auditLog.count({ where: { action: AuditAction.USER_LOCKED } })).toBe(1);
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { lockedUntil: true } });
    expect(user.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
  });

  it("verifies an email with a single-use token", async () => {
    const email = uniqueEmail("verify");
    await register({ email }).expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });

    // The raw token only exists in the delivered email, so issue a known one for the test.
    const { createHash, randomBytes } = await import("node:crypto");
    const raw = randomBytes(32).toString("base64url");
    await prisma.emailToken.create({
      data: { userId: user.id, type: EmailTokenType.VERIFY_EMAIL, tokenHash: createHash("sha256").update(raw).digest("hex"), expiresAt: new Date(Date.now() + 60_000) },
    });

    await request(server()).post("/api/v1/auth/verify-email").send({ token: raw }).expect(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerifiedAt).toBeInstanceOf(Date);

    // Replaying the same token must fail.
    await request(server()).post("/api/v1/auth/verify-email").send({ token: raw }).expect(400);
  });

  it("rotates the refresh token and revokes the whole family when an old one is replayed", async () => {
    const registered = await register().expect(201);
    const firstCookie = (registered.headers["set-cookie"] as unknown as string[]).find((value) => value.startsWith("a7_refresh="))!;

    const refreshed = await request(server()).post("/api/v1/auth/refresh").set("Cookie", firstCookie).expect(200);
    const secondCookie = (refreshed.headers["set-cookie"] as unknown as string[]).find((value) => value.startsWith("a7_refresh="))!;
    expect(secondCookie).not.toBe(firstCookie);

    // Replaying the rotated token is treated as a leak: every session is dropped.
    await request(server()).post("/api/v1/auth/refresh").set("Cookie", firstCookie).expect(401);
    await request(server()).post("/api/v1/auth/refresh").set("Cookie", secondCookie).expect(401);
    expect(await prisma.refreshSession.count({ where: { revokedAt: null } })).toBe(0);
  });

  it("rejects a cookie-authenticated refresh from a disallowed origin", async () => {
    const registered = await register().expect(201);
    const cookie = (registered.headers["set-cookie"] as unknown as string[]).find((value) => value.startsWith("a7_refresh="))!;
    await request(server()).post("/api/v1/auth/refresh").set("Cookie", cookie).set("Origin", "https://attacker.example").expect(403);
  });

  it("changing a password invalidates the existing access token", async () => {
    const email = uniqueEmail("rotate");
    const registered = await register({ email }).expect(201);
    const token = registered.body.data.accessToken as string;

    await request(server()).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`).expect(200);
    await request(server()).post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: strongPassword, newPassword: "Another-Password-2026" })
      .expect(200);

    // tokenVersion moved, so the previously valid access token is now rejected.
    await request(server()).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`).expect(401);
    await request(server()).post("/api/v1/auth/login").send({ email, password: "Another-Password-2026" }).expect(200);
  });

  it("rejects a wrong current password when changing it", async () => {
    const registered = await register().expect(201);
    const token = registered.body.data.accessToken as string;
    await request(server()).post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "Not-My-Password-1", newPassword: "Another-Password-2026" })
      .expect(401);
  });

  it("requires authentication for protected routes and returns the shared error shape", async () => {
    const response = await request(server()).get("/api/v1/auth/me").expect(401);
    expect(response.body).toMatchObject({ statusCode: 401 });
    expect(response.body).toHaveProperty("requestId");
    expect(response.body).toHaveProperty("error");
  });

  it("does not disclose whether an address exists when resetting a password", async () => {
    const known = uniqueEmail("reset");
    await register({ email: known }).expect(201);
    const existing = await request(server()).post("/api/v1/auth/forgot-password").send({ email: known }).expect(200);
    const missing = await request(server()).post("/api/v1/auth/forgot-password").send({ email: uniqueEmail("nobody") }).expect(200);
    expect(existing.body).toEqual(missing.body);
  });
});
